import * as fs from "fs";
import * as Stream from "stream";

export class Token {
    public kind: number;    // token kind
    public pos: number;     // token position in bytes in the source text (starting at 0)
    public charPos: number; // token position in characters in the source text (starting at 0)
    public col: number;     // token column (starting at 1)
    public line: number;    // token line (starting at 1)
    public val: string;  // token value
    public next: Token;  // ML 2005-03-11 Peek tokens are kept in linked list
}

//-----------------------------------------------------------------------------------
// Buffer
//-----------------------------------------------------------------------------------
export class Buffer {
    // This Buffer supports the following cases:
    // 1) seekable stream (file)
    //    a) whole stream in buffer
    //    b) part of stream in buffer
    // 2) non seekable stream (network, console)

    public static EOF = 65535 + 1;
    private static MIN_BUFFER_LENGTH = 1024; // 1KB
    private static MAX_BUFFER_LENGTH = Buffer.MIN_BUFFER_LENGTH * 64; // 64KB
    private buf: Int8Array;   // input buffer
    private bufStart: number; // position of first byte in buffer relative to input stream
    private bufLen: number;   // length of buffer
    private fileLen: number;  // length of input stream (may change if stream is no file)
    private bufPos: number;      // current position in buffer
    private file: number; // input stream (seekable)
    private stream = undefined; // growing input stream (e.g.: console, network)

    constructor(type: number, s: Stream);
    constructor(type: number, fileName: string);
    constructor(type: number, b: Buffer);

    constructor(type: number, a: any) {
        if (type == 0) {
            try {
                this.file = fs.openSync(a, "r");
                this.fileLen = fs.statSync(a).size;
                this.bufLen = Math.min(this.fileLen, Buffer.MAX_BUFFER_LENGTH);
                this.buf = new Int8Array(this.bufLen);
                this.bufStart = 65535; // nothing in buffer so far
                if (this.fileLen > 0) this.setPos(0); // setup buffer to position 0 (start)
                else this.bufPos = 0; // index 0 is already after the file, thus setPos(0) is invalid
                if (this.bufLen == this.fileLen) this.Close();
            } catch (e) {
                console.error(e)
                //throw new Error(e)
                throw new Error("Could not open file " + a);
            }
            // don't use b after this call anymore
            // called in UTF8Buffer constructor
        } else if (type == 1) { //a is a Buffer
            this.buf = a.buf;
            this.bufStart = a.bufStart;
            this.bufLen = a.bufLen;
            this.fileLen = a.fileLen;
            this.bufPos = a.bufPos;
            this.file = a.file;
            this.stream = a.stream;
        } else if (type == 2) {
            this.stream = a;
            this.fileLen = this.bufLen = this.bufStart = this.bufPos = 0;
            this.buf = new Array[Buffer.MIN_BUFFER_LENGTH];
        }
    }


    protected finalize() {
        this.Close();
    }

    protected Close() {
        if (this.file != undefined) {
            try {
                fs.close(this.file, function () {
                });
                this.file = undefined;
            } catch (e) {
                console.error(e)
                //throw new Error(e);
            }
        }
    }

    public Read(): number {
        if (this.bufPos < this.bufLen) {
            return this.buf[this.bufPos++] //& 0xff;  // mask out sign bits
        } else if (this.getPos() < this.fileLen) {
            this.setPos(this.getPos());         // shift buffer start to pos
            return this.buf[this.bufPos++] //& 0xff; // mask out sign bits
        } else if (this.stream != undefined && this.ReadNextStreamChunk() > 0) {
            return this.buf[this.bufPos++] //& 0xff;  // mask out sign bits
        } else {
            return Buffer.EOF;
        }
    }

    public Peek(): number {
        let curPos = this.getPos();
        let ch = this.Read();
        this.setPos(curPos);
        return ch;
    }

// beg .. begin, zero-based, inclusive, in byte
// end .. end, zero-based, exclusive, in byte
    public GetString(beg: number, end: number): string {
        let len = 0;
        let buf = [];
        let oldPos = this.getPos();
        this.setPos(beg);
        while (this.getPos() < end) buf[len++] = this.Read();
        this.setPos(oldPos);
        // return new String(buf, 0, len);
        return buf.map(function (value, index, array) {
            return String.fromCharCode(value)
        }).join("");
    }

    public getPos(): number {
        return this.bufPos + this.bufStart;
    }

    public setPos(value: number) {
        if (value >= this.fileLen && this.stream != undefined) {
            // Wanted position is after buffer and the stream
            // is not seek-able e.g. network or console,
            // thus we have to read the stream manually till
            // the wanted position is in sight.
            while (value >= this.fileLen && this.ReadNextStreamChunk() > 0) ;
        }

        if (value < 0 || value > this.fileLen) {
            throw new Error("buffer out of bounds access, position: " + value);
        }

        if (value >= this.bufStart && value < this.bufStart + this.bufLen) { // already in buffer
            this.bufPos = value - this.bufStart;
        } else if (this.file != undefined) { // must be swapped in
            try {
                // this.file.seek(value);
                // this.bufLen = this.file.read(this.buf);
                fs.readSync(this.file, this.buf, 0, this.bufLen, value);
                // this.buf.forEach(function (value, index, array) {
                //     console.log(String.fromCharCode(value))
                // })
                this.bufStart = value;
                this.bufPos = 0;
            } catch (e) {
                throw new Error(e);
            }
        } else {
            // set the position to the end of the file, Pos will return fileLen.
            this.bufPos = this.fileLen - this.bufStart;
        }
    }

// Read the next chunk of bytes from the stream, increases the buffer
// if needed and updates the fields fileLen and bufLen.
// Returns the number of bytes read.
    private ReadNextStreamChunk(): number {
        let free = this.buf.length - this.bufLen;
        if (free == 0) {
            // in the case of a growing input stream
            // we can neither seek in the stream, nor can we
            // foresee the maximum length, thus we must adapt
            // the buffer size on demand.

            this.buf = new Int8Array(this.buf, 0, this.bufLen * 2);
            free = this.bufLen;
        }

        let read: number;
        try {
            read = this.stream.read(this.buf, this.bufLen, free);
        } catch (ioex) {
            throw new Error(ioex);
        }

        if (read > 0) {
            this.fileLen = this.bufLen = (this.bufLen + read);
            return read;
        }
        // end of stream reached
        return 0;
    }
}


//-----------------------------------------------------------------------------------
// UTF8Buffer
//-----------------------------------------------------------------------------------
export class UTF8Buffer extends Buffer {
    constructor(b: Buffer) {
        super(1, b);
    }

    public Read(): number {
        let ch;
        do {
            ch = super.Read();
            // until we find a utf8 start (0xxxxxxx or 11xxxxxx)
        } while ((ch >= 128) && ((ch & 0xC0) != 0xC0) && (ch != UTF8Buffer.EOF));
        if (ch < 128 || ch == UTF8Buffer.EOF) {
            // nothing to do, first 127 chars are the same in ascii and utf8
            // 0xxxxxxx or end of file character
        } else if ((ch & 0xF0) == 0xF0) {
            // 11110xxx 10xxxxxx 10xxxxxx 10xxxxxx
            let c1 = ch & 0x07;
            ch = super.Read();
            let c2 = ch & 0x3F;
            ch = super.Read();
            let c3 = ch & 0x3F;
            ch = super.Read();
            let c4 = ch & 0x3F;
            ch = (((((c1 << 6) | c2) << 6) | c3) << 6) | c4;
        } else if ((ch & 0xE0) == 0xE0) {
            // 1110xxxx 10xxxxxx 10xxxxxx
            let c1 = ch & 0x0F;
            ch = super.Read();
            let c2 = ch & 0x3F;
            ch = super.Read();
            let c3 = ch & 0x3F;
            ch = (((c1 << 6) | c2) << 6) | c3;
        } else if ((ch & 0xC0) == 0xC0) {
            // 110xxxxx 10xxxxxx
            let c1 = ch & 0x1F;
            ch = super.Read();
            let c2 = ch & 0x3F;
            ch = (c1 << 6) | c2;
        }
        return ch;
    }
}

class Elem {
    public key: number;
    public val: number;
    public next: Elem;

    constructor(key: number, val: number) {
        this.key = key;
        this.val = val;
    }
}

//-----------------------------------------------------------------------------------
// StartStates  -- maps characters to start states of tokens
//-----------------------------------------------------------------------------------
export class StartStates {


    private tab: Elem[] = [];

    public set(key: number, val: number) {
        let e = new Elem(key, val);
        let k = key % 128;
        e.next = (this.tab)[k];
        (this.tab)[k] = e;
    }

    public state(key: number): number {
        let e = (this.tab)[key % 128];
        while (e != undefined && e.key != key) e = e.next;
        return e == undefined ? 0 : e.val;
    }
}

//-----------------------------------------------------------------------------------
// Scanner
//-----------------------------------------------------------------------------------
export class Scanner {
    static EOL = '\n';
    static eofSym = 0;
    static maxT = 28;
    static noSym = 28;


    public buffer: Buffer; // scanner buffer

    t: Token;           // current token
    ch: number;            // current input character
    pos: number;           // byte position of current character
    charPos: number;       // position by unicode characters starting with 0
    col: number;           // column number of current character
    line: number;          // line number of current character
    oldEols: number;       // EOLs that appeared in a comment;
    static start: StartStates; // maps initial token character to start state
    static literals: [];      // maps literal strings to literal kinds

    tokens: Token;      // list of tokens already peeked (first token is a dummy)
    pt: Token;          // current peek token

    tval = []; // token text used in NextToken(), dynamically enlarged
    tlen: number;          // length of current token

    //this is dark magic which mimics a static { } block in a class
    private static _static_initialize = function () {
        Scanner.start = new StartStates();
        Scanner.literals = [];
        for (let i = 65; i <= 90; ++i) Scanner.start.set(i, 1);
        for (let i = 97; i <= 122; ++i) Scanner.start.set(i, 1);
        for (let i = 48; i <= 57; ++i) Scanner.start.set(i, 2);
        Scanner.start.set(43, 3);
        Scanner.start.set(45, 4);
        Scanner.start.set(42, 5);
        Scanner.start.set(47, 6);
        Scanner.start.set(40, 7);
        Scanner.start.set(41, 8);
        Scanner.start.set(123, 9);
        Scanner.start.set(125, 10);
        Scanner.start.set(61, 16);
        Scanner.start.set(60, 12);
        Scanner.start.set(62, 13);
        Scanner.start.set(59, 14);
        Scanner.start.set(44, 15);
        Scanner.start.set(Buffer.EOF, -1);
        Scanner.literals["true"] = 5;
        Scanner.literals["false"] = 6;
        Scanner.literals["void"] = 9;
        Scanner.literals["if"] = 19;
        Scanner.literals["else"] = 20;
        Scanner.literals["while"] = 21;
        Scanner.literals["read"] = 22;
        Scanner.literals["write"] = 23;
        Scanner.literals["program"] = 24;
        Scanner.literals["int"] = 25;
        Scanner.literals["bool"] = 26;

    }();

    constructor(fileName: string);
    constructor(s: Stream);
    constructor(a: any) {
        if (typeof a == "string")
            this.buffer = new Buffer(0, a);
        else
            this.buffer = new Buffer(2, a);
        this.Init();
    }


    Init() {
        this.pos = -1;
        this.line = 1;
        this.col = 0;
        this.charPos = -1;
        this.oldEols = 0;
        this.NextCh();
        if (this.ch == 0xEF) { // check optional byte order mark for UTF-8
            this.NextCh();
            let ch1 = this.ch;
            this.NextCh();
            let ch2 = this.ch;
            if (ch1 != 0xBB || ch2 != 0xBF) {
                throw new Error("Illegal byte order mark at start of file");
            }
            this.buffer = new UTF8Buffer(this.buffer);
            this.col = 0;
            this.charPos = -1;
            this.NextCh();
        }
        this.pt = this.tokens = new Token();  // first token is a dummy
    }

    NextCh() {
        if (this.oldEols > 0) {
            this.ch = Scanner.EOL.charCodeAt(0);
            this.oldEols--;
        } else {
            this.pos = this.buffer.getPos();
            // buffer reads unicode chars, if UTF8 has been detected
            this.ch = this.buffer.Read();
            this.col++;
            this.charPos++;
            // replace isolated '\r' by '\n' in order to make
            // eol handling uniform across Windows, Unix and Mac
            if (this.ch == '\r'.charCodeAt(0) && this.buffer.Peek() != '\n'.charCodeAt(0)) this.ch = Scanner.EOL.charCodeAt(0);
            if (this.ch == Scanner.EOL.charCodeAt(0)) {
                this.line += 1;
                this.col = 0;
            }
        }

    }

    AddCh() {
        //unused, since arrays grow automatically in .js
        // if (this.tlen >= this.tval.length) {
        //     let newBuf = new Array[2 * this.tval.length];
        //     arraycopy(this.tval, 0, newBuf, 0, this.tval.length);
        //     this.tval = newBuf;
        // }
        if (this.ch != Buffer.EOF) {
            this.tval[this.tlen++] = this.ch;

            this.NextCh();
        }

    }


    Comment0(): boolean {
        let level = 1, pos0 = this.pos, line0 = this.line, col0 = this.col, charPos0 = this.charPos;
        this.NextCh();
        if (this.ch == '/'.charCodeAt(0)) {
            this.NextCh();
            for (; ;) {
                if (this.ch == 10) {
                    level--;
                    if (level == 0) {
                        this.oldEols = this.line - line0;
                        this.NextCh();
                        return true;
                    }
                    this.NextCh();
                } else if (this.ch == Buffer.EOF) return false;
                else this.NextCh();
            }
        } else {
            this.buffer.setPos(pos0);
            this.NextCh();
            this.line = line0;
            this.col = col0;
            this.charPos = charPos0;
        }
        return false;
    }

    Comment1(): boolean {
        let level = 1, pos0 = this.pos, line0 = this.line, col0 = this.col, charPos0 = this.charPos;
        this.NextCh();
        if (this.ch == '*'.charCodeAt(0)) {
            this.NextCh();
            for (; ;) {
                if (this.ch == '*'.charCodeAt(0)) {
                    this.NextCh();
                    if (this.ch == '/'.charCodeAt(0)) {
                        level--;
                        if (level == 0) {
                            this.oldEols = this.line - line0;
                            this.NextCh();
                            return true;
                        }
                        this.NextCh();
                    }
                } else if (this.ch == '/'.charCodeAt(0)) {
                    this.NextCh();
                    if (this.ch == '*'.charCodeAt(0)) {
                        level++;
                        this.NextCh();
                    }
                } else if (this.ch == Buffer.EOF) return false;
                else this.NextCh();
            }
        } else {
            this.buffer.setPos(pos0);
            this.NextCh();
            this.line = line0;
            this.col = col0;
            this.charPos = charPos0;
        }
        return false;
    }


    CheckLiteral() {
        let val = this.t.val;

        let kind = Scanner.literals[val];
        if (kind != undefined && kind != 0) {
            this.t.kind = kind;
        }
    }

    NextToken(): Token {
        while (this.ch == ' '.charCodeAt(0) ||
            this.ch >= 9 && this.ch <= 10 || this.ch == 13
            ) this.NextCh();
        if (this.ch == '/'.charCodeAt(0) && this.Comment0() || this.ch == '/'.charCodeAt(0) && this.Comment1()) return this.NextToken();
        let recKind = Scanner.noSym;
        let recEnd = this.pos;
        this.t = new Token();
        this.t.pos = this.pos;
        this.t.col = this.col;
        this.t.line = this.line;
        this.t.charPos = this.charPos;
        this.tval = []
        let state = Scanner.start.state(this.ch);
        this.tlen = 0;
        this.AddCh();

        loop: for (; ;) {
            switch (state) {
                case -1:
                    this.t.kind = Scanner.eofSym;
                    break loop;
                // NextCh already done
                case 0:
                    if (recKind != Scanner.noSym) {
                        this.tlen = recEnd - this.t.pos;
                        this.SetScannerBehindT();
                    }
                    this.t.kind = recKind;
                    break loop;
                // NextCh already done
                case 1:
                    recEnd = this.pos;
                    recKind = 1;
                    if (this.ch >= '0'.charCodeAt(0) && this.ch <= '9'.charCodeAt(0) || this.ch >= 'A'.charCodeAt(0) && this.ch <= 'Z'.charCodeAt(0) || this.ch >= 'a'.charCodeAt(0) && this.ch <= 'z'.charCodeAt(0)) {
                        this.AddCh();
                        state = 1;
                        break;
                    } else {
                        this.t.kind = 1;
                        this.t.val = this.tval.map(function (value, index, array) {
                            return String.fromCharCode(value)
                        }).join("");
                        this.CheckLiteral();
                        return this.t;
                    }
                case 2:
                    recEnd = this.pos;
                    recKind = 2;
                    if (this.ch >= '0'.charCodeAt(0) && this.ch <= '9'.charCodeAt(0)) {
                        this.AddCh();
                        state = 2;
                        break;
                    } else {
                        this.t.kind = 2;
                        break loop;
                    }
                case 3: {
                    this.t.kind = 3;
                    break loop;
                }
                case 4: {
                    this.t.kind = 4;
                    break loop;
                }
                case 5: {
                    this.t.kind = 7;
                    break loop;
                }
                case 6: {
                    this.t.kind = 8;
                    break loop;
                }
                case 7: {
                    this.t.kind = 10;
                    break loop;
                }
                case 8: {
                    this.t.kind = 11;
                    break loop;
                }
                case 9: {
                    this.t.kind = 12;
                    break loop;
                }
                case 10: {
                    this.t.kind = 13;
                    break loop;
                }
                case 11: {
                    this.t.kind = 14;
                    break loop;
                }
                case 12: {
                    this.t.kind = 15;
                    break loop;
                }
                case 13: {
                    this.t.kind = 16;
                    break loop;
                }
                case 14: {
                    this.t.kind = 18;
                    break loop;
                }
                case 15: {
                    this.t.kind = 27;
                    break loop;
                }
                case 16:
                    recEnd = this.pos;
                    recKind = 17;
                    if (this.ch == '='.charCodeAt(0)) {
                        this.AddCh();
                        state = 11;
                        break;
                    } else {
                        this.t.kind = 17;
                        break loop;
                    }

            }
        }
        this.t.val = this.tval.map(function (value, index, array) {
            return String.fromCharCode(value)
        }).join("")

        return this.t;
    }

    private SetScannerBehindT() {
        this.buffer.setPos(this.t.pos);
        this.NextCh();
        this.line = this.t.line;
        this.col = this.t.col;
        this.charPos = this.t.charPos;
        for (let i = 0;
             i < this.tlen;
             i++
        )
            this.NextCh();
    }

// get the next token (possibly a token already seen during peeking)
    public Scan(): Token {
        let token: Token

        if (this.tokens.next == undefined) {
            token = this.NextToken();
        } else {
            this.pt = this.tokens = this.tokens.next;
            token = this.tokens;
        }

        //console.log("Value: "+token.val)
        //console.log("Kind: "+token.kind)

        return token
    }

// get the next token, ignore pragmas
    public Peek(): Token {
        do {
            if (this.pt.next == undefined) {
                this.pt.next = this.NextToken();
            }
            this.pt = this.pt.next;
        } while (this.pt.kind > Scanner.maxT); // skip pragmas

        return this.pt;
    }

// make sure that peeking starts at current scan position


    public ResetPeek() {
        this.pt = this.tokens;
    }

} // end Scanner
