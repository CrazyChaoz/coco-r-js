import {Scanner, Token} from "./Scanner";
import {CodeGenerator, Obj, Op, SymbolTable} from "./TasteClasses";

export class Parser {
    public static _EOF: number = 0;
    public static _ident: number = 1;
    public static _number: number = 2;
    public static maxT: number = 28;

    static _T = true;
    static _x = false;
    static minErrDist = 2;

    public t: Token;            // last recognized token
    public la: Token;           // lookahead token
    errDist = Parser.minErrDist;

    public scanner: Scanner;
    public errors: Errors;

    readonly undef = 0;
    readonly integer = 1;
    readonly boolean = 2;

    // object kinds
    readonly var = 0;
    readonly proc = 1;

    public tab: SymbolTable;
    public gen: CodeGenerator;

    /*--------------------------------------------------------------------------*/


    constructor(scanner: Scanner) {
        this.scanner = scanner;
        this.errors = new Errors();
    }

    SynErr(n: number) {
        if (this.errDist >= Parser.minErrDist) this.errors.SynErr(this.la.line, this.la.col, n);
        this.errDist = 0;
    }

    public SemErr(msg: string) {
        if (this.errDist >= Parser.minErrDist) this.errors.SemErr(this.t.line, this.t.col, msg);
        this.errDist = 0;
    }

    Get() {
        for (; ;) {
            this.t = this.la;
            this.la = this.scanner.Scan();
            if (this.la.kind <= Parser.maxT) {
                ++this.errDist;
                break;
            }

            this.la = this.t;
        }
    }

    private isLaTokenKindEqualTo(n: number): boolean {
        return this.la.kind == n;
    }

    Expect(n: number) {
        if (this.la.kind == n)
            this.Get();
        else {
            this.SynErr(n);
        }
    }

    StartOf(s: number): boolean {
        return Parser.set[s][this.la.kind];
    }

    ExpectWeak(n: number, follow: number) {
        if (this.la.kind == n) this.Get();
        else {
            this.SynErr(n);
            while (!this.StartOf(follow)) this.Get();
        }
    }

    WeakSeparator(n: number, syFol: number, repFol: number): boolean {
        let kind = this.la.kind;
        if (kind == n) {
            this.Get();
            return true;
        } else if (this.StartOf(repFol)) return false;
        else {
            this.SynErr(n);
            while (!(Parser.set[syFol][kind] || Parser.set[repFol][kind] || Parser.set[0][kind])) {
                this.Get();
                kind = this.la.kind;
            }
            return this.StartOf(syFol);
        }
    }

    AddOp(): Op {
        let op: Op;
        op = Op.ADD;
        if (this.isLaTokenKindEqualTo(3)) {
            this.Get();
        } else if (this.isLaTokenKindEqualTo(4)) {
            this.Get();
            op = Op.SUB;
        } else this.SynErr(29);
        return op;
    }

    Expr(): number {
        let type: number;
        let type1: number;
        let op: Op;
        type = this.SimExpr();
        if (this.isLaTokenKindEqualTo(14) || this.isLaTokenKindEqualTo(15) || this.isLaTokenKindEqualTo(16)) {
            op = this.RelOp();
            type1 = this.SimExpr();
            if (type != type1) this.SemErr("incompatible types");
            this.gen.Emit(op);
            type = this.boolean;
        }
        return type;
    }

    SimExpr(): number {
        let type: number;
        let type1: number;
        let op: Op;
        type = this.Term();
        while (this.isLaTokenKindEqualTo(3) || this.isLaTokenKindEqualTo(4)) {
            op = this.AddOp();
            type1 = this.Term();
            if (type != this.integer || type1 != this.integer)
                this.SemErr("integer type expected");
            this.gen.Emit(op);
        }
        return type;
    }

    RelOp(): Op {
        let op: Op;
        op = Op.EQU;
        if (this.isLaTokenKindEqualTo(14)) {
            this.Get();
        } else if (this.isLaTokenKindEqualTo(15)) {
            this.Get();
            op = Op.LSS;
        } else if (this.isLaTokenKindEqualTo(16)) {
            this.Get();
            op = Op.GTR;
        } else this.SynErr(30);
        return op;
    }

    Factor(): number {
        let type: number;
        let n: number;
        let obj_: Obj;
        let name: string;
        type = this.undef;
        if (this.isLaTokenKindEqualTo(1)) {
            name = this.Ident();
            obj_ = this.tab.Find(name);
            type = obj_.type;
            if (obj_.kind == this.var) {
                if (obj_.level == 0) this.gen.Emit(Op.LOADG, obj_.adr);
                else this.gen.Emit(Op.LOAD, obj_.adr);
            } else this.SemErr("variable expected");
        } else if (this.isLaTokenKindEqualTo(2)) {
            this.Get();
            n = parseInt(this.t.val);
            this.gen.Emit(Op.CONST, n);
            type = this.integer;
        } else if (this.isLaTokenKindEqualTo(4)) {
            this.Get();
            type = this.Factor();
            if (type != this.integer) {
                this.SemErr("integer type expected");
                type = this.integer;
            }
            this.gen.Emit(Op.NEG);
        } else if (this.isLaTokenKindEqualTo(5)) {
            this.Get();
            this.gen.Emit(Op.CONST, 1);
            type = this.boolean;
        } else if (this.isLaTokenKindEqualTo(6)) {
            this.Get();
            this.gen.Emit(Op.CONST, 0);
            type = this.boolean;
        } else this.SynErr(31);
        return type;
    }

    Ident(): string {
        let name: string;
        this.Expect(1);
        name = this.t.val;
        return name;
    }

    MulOp(): Op {
        let op: Op;
        op = Op.MUL;
        if (this.isLaTokenKindEqualTo(7)) {
            this.Get();
        } else if (this.isLaTokenKindEqualTo(8)) {
            this.Get();
            op = Op.DIV;
        } else this.SynErr(32);
        return op;
    }

    ProcDecl() {
        let name_: string;
        let obj_: Obj;
        let adr: number;
        this.Expect(9);
        name_ = this.Ident();
        obj_ = this.tab.NewObj(name_, this.proc, this.undef);
        obj_.adr = this.gen.pc;
        if (name_ == "Main") this.gen.progStart = this.gen.pc;
        this.tab.OpenScope();
        this.Expect(10);
        this.Expect(11);
        this.Expect(12);
        this.gen.Emit(Op.ENTER, 0);
        adr = this.gen.pc - 2;
        while (this.StartOf(1)) {
            if (this.isLaTokenKindEqualTo(25) || this.isLaTokenKindEqualTo(26)) {
                this.VarDecl();
            } else {
                this.Stat();
            }
        }
        this.Expect(13);
        this.gen.Emit(Op.LEAVE);
        this.gen.Emit(Op.RET);
        this.gen.Patch(adr, this.tab.topScope.nextAdr);
        this.tab.CloseScope();
    }

    VarDecl() {
        let name_: string;
        let type: number;
        type = this.Type();
        name_ = this.Ident();
        this.tab.NewObj(name_, this.var, type);
        while (this.isLaTokenKindEqualTo(27)) {
            this.Get();
            name_ = this.Ident();
            this.tab.NewObj(name_, this.var, type);
        }
        this.Expect(18);
    }

    Stat() {
        let type: number;
        let name_: string;
        let obj_: Obj;
        let adr: number;
        let adr2: number;
        let loopstart: number;
        switch (this.la.kind) {
            case 1: {
                name_ = this.Ident();
                obj_ = this.tab.Find(name_);
                if (this.isLaTokenKindEqualTo(17)) {
                    this.Get();
                    if (obj_.kind != this.var) this.SemErr("cannot assign to this.procedure");
                    type = this.Expr();
                    this.Expect(18);
                    if (type != obj_.type) this.SemErr("incompatible types");
                    if (obj_.level == 0) this.gen.Emit(Op.STOG, obj_.adr);
                    else this.gen.Emit(Op.STO, obj_.adr);
                } else if (this.isLaTokenKindEqualTo(10)) {
                    this.Get();
                    this.Expect(11);
                    this.Expect(18);
                    if (obj_.kind != this.proc) this.SemErr("object is not a this.procedure");
                    this.gen.Emit(Op.CALL, obj_.adr);
                } else this.SynErr(33);
                break;
            }
            case 19: {
                this.Get();
                this.Expect(10);
                type = this.Expr();
                this.Expect(11);
                if (type != this.boolean) this.SemErr("boolean type expected");
                this.gen.Emit(Op.FJMP, 0);
                adr = this.gen.pc - 2;
                this.Stat();
                if (this.isLaTokenKindEqualTo(20)) {
                    this.Get();
                    this.gen.Emit(Op.JMP, 0);
                    adr2 = this.gen.pc - 2;
                    this.gen.Patch(adr, this.gen.pc);
                    adr = adr2;
                    this.Stat();
                }
                this.gen.Patch(adr, this.gen.pc);
                break;
            }
            case 21: {
                this.Get();
                loopstart = this.gen.pc;
                this.Expect(10);
                type = this.Expr();
                this.Expect(11);
                if (type != this.boolean) this.SemErr("boolean type expected");
                this.gen.Emit(Op.FJMP, 0);
                adr = this.gen.pc - 2;
                this.Stat();
                this.gen.Emit(Op.JMP, loopstart);
                this.gen.Patch(adr, this.gen.pc);
                break;
            }
            case 22: {
                this.Get();
                name_ = this.Ident();
                this.Expect(18);
                obj_ = this.tab.Find(name_);
                if (obj_.type != this.integer) this.SemErr("integer type expected");
                this.gen.Emit(Op.READ);
                if (obj_.level == 0) this.gen.Emit(Op.STOG, obj_.adr);
                else this.gen.Emit(Op.STO, obj_.adr);
                break;
            }
            case 23: {
                this.Get();
                type = this.Expr();
                this.Expect(18);
                if (type != this.integer) this.SemErr("integer type expected");
                this.gen.Emit(Op.WRITE);
                break;
            }
            case 12: {
                this.Get();
                while (this.StartOf(1)) {
                    if (this.StartOf(2)) {
                        this.Stat();
                    } else {
                        this.VarDecl();
                    }
                }
                this.Expect(13);
                break;
            }
            default:
                this.SynErr(34);
                break;
        }
    }

    Term(): number {
        let type: number;
        let type1: number;
        let op: Op;
        type = this.Factor();
        while (this.isLaTokenKindEqualTo(7) || this.isLaTokenKindEqualTo(8)) {
            op = this.MulOp();
            type1 = this.Factor();
            if (type != this.integer || type1 != this.integer)
                this.SemErr("integer type expected");
            this.gen.Emit(op);
        }
        return type;
    }

    Taste() {
        let name_: string;
        this.Expect(24);
        name_ = this.Ident();
        this.tab.OpenScope();
        this.Expect(12);
        while (this.isLaTokenKindEqualTo(9) || this.isLaTokenKindEqualTo(25) || this.isLaTokenKindEqualTo(26)) {
            if (this.isLaTokenKindEqualTo(25) || this.isLaTokenKindEqualTo(26)) {
                this.VarDecl();
            } else {
                this.ProcDecl();
            }
        }
        this.Expect(13);
        this.tab.CloseScope();
        if (this.gen.progStart == -1) this.SemErr("main function never defined");

    }

    Type(): number {
        let type: number;
        type = this.undef;
        if (this.isLaTokenKindEqualTo(25)) {
            this.Get();
            type = this.integer;
        } else if (this.isLaTokenKindEqualTo(26)) {
            this.Get();
            type = this.boolean;
        } else this.SynErr(35);
        return type;
    }


    public Parse() {
        this.la = new Token();
        this.la.val = "";
        this.Get();
        this.Taste();
        this.Expect(0);

    }

    static set: boolean[][] = [
        [Parser._T, Parser._x, Parser._x, Parser._x, Parser._x, Parser._x, Parser._x, Parser._x, Parser._x, Parser._x, Parser._x, Parser._x, Parser._x, Parser._x, Parser._x, Parser._x, Parser._x, Parser._x, Parser._x, Parser._x, Parser._x, Parser._x, Parser._x, Parser._x, Parser._x, Parser._x, Parser._x, Parser._x, Parser._x, Parser._x],
        [Parser._x, Parser._T, Parser._x, Parser._x, Parser._x, Parser._x, Parser._x, Parser._x, Parser._x, Parser._x, Parser._x, Parser._x, Parser._T, Parser._x, Parser._x, Parser._x, Parser._x, Parser._x, Parser._x, Parser._T, Parser._x, Parser._T, Parser._T, Parser._T, Parser._x, Parser._T, Parser._T, Parser._x, Parser._x, Parser._x],
        [Parser._x, Parser._T, Parser._x, Parser._x, Parser._x, Parser._x, Parser._x, Parser._x, Parser._x, Parser._x, Parser._x, Parser._x, Parser._T, Parser._x, Parser._x, Parser._x, Parser._x, Parser._x, Parser._x, Parser._T, Parser._x, Parser._T, Parser._T, Parser._T, Parser._x, Parser._x, Parser._x, Parser._x, Parser._x, Parser._x]

    ];
} // end Parser


export class Errors {
    public count = 0;                                    // number of errors detected
    //public errorStream = System.out;     // error messages go to this stream
    public errMsgFormat = "-- line {0} col {1}: {2}"; // 0=line, 1=column, 2=text

    protected printMsg(line: number, column: number, msg: string) {
        let b = "-- line {0} col {1}: {2}";
        let pos = b.indexOf("{0}");
        if (pos >= 0) {
            b = b.replace("{0}", line + "")
        }
        pos = b.indexOf("{1}");
        if (pos >= 0) {
            b = b.replace("{1}", column + "")
        }
        pos = b.indexOf("{2}");
        if (pos >= 0)
            b = b.replace("{2}", msg)
        console.error(b.toString());
    }

    public SynErr(line: number, col: number, n: number) {
        let s: string;
        switch (n) {
            case 0:
                s = "EOF expected";
                break;
            case 1:
                s = "ident expected";
                break;
            case 2:
                s = "number expected";
                break;
            case 3:
                s = "\"+\" expected";
                break;
            case 4:
                s = "\"-\" expected";
                break;
            case 5:
                s = "\"true\" expected";
                break;
            case 6:
                s = "\"false\" expected";
                break;
            case 7:
                s = "\"*\" expected";
                break;
            case 8:
                s = "\"/\" expected";
                break;
            case 9:
                s = "\"void\" expected";
                break;
            case 10:
                s = "\"(\" expected";
                break;
            case 11:
                s = "\")\" expected";
                break;
            case 12:
                s = "\"{\" expected";
                break;
            case 13:
                s = "\"}\" expected";
                break;
            case 14:
                s = "\"==\" expected";
                break;
            case 15:
                s = "\"<\" expected";
                break;
            case 16:
                s = "\">\" expected";
                break;
            case 17:
                s = "\"=\" expected";
                break;
            case 18:
                s = "\";\" expected";
                break;
            case 19:
                s = "\"if\" expected";
                break;
            case 20:
                s = "\"else\" expected";
                break;
            case 21:
                s = "\"while\" expected";
                break;
            case 22:
                s = "\"read\" expected";
                break;
            case 23:
                s = "\"write\" expected";
                break;
            case 24:
                s = "\"program\" expected";
                break;
            case 25:
                s = "\"int\" expected";
                break;
            case 26:
                s = "\"bool\" expected";
                break;
            case 27:
                s = "\",\" expected";
                break;
            case 28:
                s = "??? expected";
                break;
            case 29:
                s = "invalid AddOp";
                break;
            case 30:
                s = "invalid RelOp";
                break;
            case 31:
                s = "invalid Factor";
                break;
            case 32:
                s = "invalid MulOp";
                break;
            case 33:
                s = "invalid Stat";
                break;
            case 34:
                s = "invalid Stat";
                break;
            case 35:
                s = "invalid Type";
                break;
            default:
                s = "error " + n;
                break;
        }
        this.printMsg(line, col, s);
        this.count++;
    }

    public SemErr(s: string)
    public SemErr(line: number, col: number, s: string)
    //internal useage
    public SemErr(line: any, col?: number, s?: string) {
        if (s != undefined)
            this.printMsg(line, col, s);
        else
            console.error(line);
        this.count++;
    }


    public Warning(s: string)
    public Warning(line: number, col: number, s: string)
    //internal useage
    public Warning(line: any, col?: number, s?: string) {
        if (s != undefined)
            this.printMsg(line, col, s);
        else
            console.warn(line);
    }

} // Errors

