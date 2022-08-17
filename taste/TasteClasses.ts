import * as console from "console";
import {Parser} from "./Parser";
import * as stream from "stream";
import * as fs from "fs";
import {Buffer} from "./Scanner";

export enum Op { // opcodes
    ADD, SUB, MUL, DIV, EQU, LSS, GTR, NEG,
    LOAD, LOADG, STO, STOG, CONST,
    CALL, RET, ENTER, LEAVE, JMP, FJMP, READ, WRITE
}

export class CodeGenerator {

    opcode =
        ["ADD  ", "SUB  ", "MUL  ", "DIV  ", "EQU  ", "LSS  ", "GTR  ", "NEG  ",
            "LOAD ", "LOADG", "STO  ", "STOG ", "CONST", "CALL ", "RET  ", "ENTER",
            "LEAVE", "JMP  ", "FJMP ", "READ ", "WRITE"];

    public progStart;	// address of first instruction of main program
    public pc;				// program counter
    code: number[] = new Array<number>(3000);

    // data for Interpret
    globals = new Array(100);
    stack = new Array(100);
    top: number;	// top of stack
    bp: number;		// base pointer

    public CodeGenerator() {
        this.pc = 1;
        this.progStart = -1;
    }

    //----- code generation methods -----

    public Put(x: number) {
        (this.code)[this.pc++] = x;
    }


    public Emit(op: Op, val?: number) {
        this.Put(op);
        this.Put(val >> 8);
        this.Put(val);
    }

    public Patch(adr: number, val: number) {
        (this.code)[adr] = (val >> 8);
        (this.code)[adr + 1] = val;
    }

    public Decode() {
        let maxPc = this.pc;
        this.pc = 1;
        while (this.pc < maxPc) {
            let code = this.Next();
            console.log("{0,3}: {1} ", this.pc - 1, (this.opcode)[code]);
            switch (code) {
                case Op.LOAD:
                case Op.LOADG:
                case Op.CONST:
                case Op.STO:
                case Op.STOG:
                case Op.CALL:
                case Op.ENTER:
                case Op.JMP:
                case Op.FJMP:
                    console.log(this.Next2());
                    break;
                case Op.ADD:
                case Op.SUB:
                case Op.MUL:
                case Op.DIV:
                case Op.NEG:
                case Op.EQU:
                case Op.LSS:
                case Op.GTR:
                case Op.RET:
                case Op.LEAVE:
                case Op.READ:
                case Op.WRITE:
                    console.log();
                    break;
            }
        }
    }

//----- interpreter methods -----

    Next(): number {
        return (this.code)[this.pc++];
    }

    Next2(): number {
        let x: number;
        let y: number;
        x = (this.code)[this.pc++];
        y = (this.code)[this.pc++];
        return (x << 8) + y;
    }

    Int(b: boolean) {
        if (b) return 1; else return 0;
    }

    Push(val: number) {
        this.stack[this.top++] = val;
    }

    Pop(): number {
        return (this.stack)[--this.top];
    }

    ReadInt(s: number): number {
        let ch, sign;
        let buffer=new Int8Array(8)
        do {
            fs.readSync(s,buffer,0,8,null);
            ch=buffer.toString()
        } while (!(ch >= '0' && ch <= '9' || ch == '-'));
        if (ch == '-') {
            sign = -1;
            ch = fs.readSync(s,buffer,0,8,null);
        } else sign = 1;
        let n = 0;
        while (ch >= '0' && ch <= '9') {
            n = 10 * n + (ch - '0'.charCodeAt(0));
            ch = fs.readSync(s,buffer,0,8,null);
        }
        return n * sign;
    }

    public Interpret(data: string) {
        let val: number;
        try {
            let s = fs.openSync(data,'r');
            console.log("opened file");
            this.pc = this.progStart;
            (this.stack)[0] = 0;
            this.top = 1;
            this.bp = 0;
            for (; ;) {
                switch (this.Next()) {
                    case Op.CONST:
                        this.Push(this.Next2());
                        break;
                    case Op.LOAD:
                        this.Push((this.stack)[this.bp + this.Next2()]);
                        break;
                    case Op.LOADG:
                        this.Push((this.globals)[this.Next2()]);
                        break;
                    case Op.STO:
                        (this.stack)[this.bp + this.Next2()] = this.Pop();
                        break;
                    case Op.STOG:
                        (this.globals)[this.Next2()] = this.Pop();
                        break;
                    case Op.ADD:
                        this.Push(this.Pop() + this.Pop());
                        break;
                    case Op.SUB:
                        this.Push(-this.Pop() + this.Pop());
                        break;
                    case Op.DIV:
                        val = this.Pop();
                        this.Push(this.Pop() / val);
                        break;
                    case Op.MUL:
                        this.Push(this.Pop() * this.Pop());
                        break;
                    case Op.NEG:
                        this.Push(-this.Pop());
                        break;
                    case Op.EQU:
                        this.Push(this.Int(this.Pop() == this.Pop()));
                        break;
                    case Op.LSS:
                        this.Push(this.Int(this.Pop() > this.Pop()));
                        break;
                    case Op.GTR:
                        this.Push(this.Int(this.Pop() < this.Pop()));
                        break;
                    case Op.JMP:
                        this.pc = this.Next2();
                        break;
                    case Op.FJMP:
                        val = this.Next2();
                        if (this.Pop() == 0) this.pc = val;
                        break;
                    case Op.READ:
                        val = this.ReadInt(s);
                        this.Push(val);
                        break;
                    case Op.WRITE:
                        console.log(this.Pop());
                        break;
                    case Op.CALL:
                        this.Push(this.pc + 2);
                        this.pc = this.Next2();
                        break;
                    case Op.RET:
                        this.pc = this.Pop();
                        if (this.pc == 0) return;
                        break;
                    case Op.ENTER:
                        this.Push(this.bp);
                        this.bp = this.top;
                        this.top = this.top + this.Next2();
                        break;
                    case Op.LEAVE:
                        this.top = this.bp;
                        this.bp = this.Pop();
                        break;
                    default:
                        throw new Error("illegal opcode");
                }
            }
        } catch (e) {
            console.log("--- Error accessing file ", data);
            process.exit(0);
        }
    }
} // end CodeGenerator

export class Obj {  // object describing a declared name
    public name: string;		// name of the object
    public type: number;			// type of the object (undef for proc)
    public next: Obj;			// to next object in same scope
    public kind: number;      // var, proc, scope
    public adr: number;				// address in memory or start of proc
    public level: number;			// nesting level; 0=global, 1=local
    public locals: Obj;		// scopes: to locally declared objects
    public nextAdr: number;		// scopes: next free address in this scope
}

export class SymbolTable {

    // types
    readonly undef = 0;
    readonly integer = 1;
    readonly boolean = 2;

    // object kinds
    readonly var = 0;
    readonly proc = 1;
    readonly scope = 2;


    public curLevel: number;	// nesting level of current scope
    public undefObj: Obj;	// object node for erroneous symbols
    public topScope: Obj;	// topmost procedure scope

    parser: Parser;

    constructor(parser: Parser) {
        this.parser = parser;
        this.topScope = null;
        this.curLevel = -1;
        this.undefObj = new Obj();
        this.undefObj.name = "undef";
        this.undefObj.type = this.undef;
        this.undefObj.kind = this.var;
        this.undefObj.adr = 0;
        this.undefObj.level = 0;
        this.undefObj.next = null;
    }


// open a new scope and make it the current scope (topScope)
    public OpenScope() {
        let scop = new Obj();
        scop.name = "";
        scop.kind = this.scope;
        scop.locals = null;
        scop.nextAdr = 0;
        scop.next = this.topScope;
        this.topScope = scop;
        this.curLevel++;
    }


// close the current scope
    public CloseScope() {
        this.topScope = this.topScope.next;
        this.curLevel--;
    }


// create a new object node in the current scope
    public NewObj(name: string, kind: number, type: number) {
        let p, last, obj_ = new Obj();
        obj_.name = name;
        obj_.kind = kind;
        obj_.type = type;
        obj_.level = this.curLevel;
        p = this.topScope.locals;
        last = null;
        while (p != null) {
            if (p.name == name) this.parser.SemErr("name declared twice");
            last = p;
            p = p.next;
        }
        if (last == null) this.topScope.locals = obj_; else last.next = obj_;
        if (kind == this.var) obj_.adr = this.topScope.nextAdr++;
        return obj_;
    }


// search the name in all open scopes and return its object node
    public Find(name_: string): Obj {
        let obj_: Obj;
        let scope_: Obj;
        scope_ = this.topScope;
        while (scope_ != null) {  // for all open scopes
            obj_ = scope_.locals;
            while (obj_ != null) {  // for all objects in this scope
                if (obj_.name == name_) return obj_;
                obj_ = obj_.next;
            }
            scope_ = scope_.next;
        }
        this.parser.SemErr(name_ + " is undeclared");
        return this.undefObj;
    }

} // end SymbolTable