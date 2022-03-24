//TODO:
class BitSet {

    cardinality() {
        return 0;
    }

    equals(b: BitSet) {
        return false;
    }

    intersects(b: BitSet) {
        return false;
    }

    clone(): BitSet {
        return null
    }

    flip(number: number, size: number) {

    }

    size() {
        return 0;
    }

    and(c: BitSet) {

    }
}

//TODO:
class CharSet {

}

//TODO:
class State {

}


class Position {
    public readonly beg: number;
    public readonly end: number;
    public readonly col: number;

    constructor(beg: number, end: number, col: number) {
        this.beg = beg;
        this.end = end;
        this.col = col;
    }
}

class SymInfo {
    name: string;
    kind: number;
}

class Symbol {
    public static readonly fixedToken = 0; // e.g. 'a' ('b' | 'c') (structure of literals)
    public static readonly classToken = 1; // e.g. digit {digit}   (at least one char class)
    public static readonly litToken = 2; // e.g. "while"
    public static readonly classLitToken = 3; // e.g. letter {letter} but without literals that have the same structure

    public n: number;           // symbol number
    public typ: number;         // t, nt, pr, unknown, rslv /* ML 29_11_2002 slv added */ /* AW slv --> rslv */
    public name: string;        // symbol name
    public graph: Node;       // nt: to first node of syntax graph
    public tokenKind: number;   // t:  token kind (fixedToken, classToken, ...)
    public deletable: boolean;   // nt: true if nonterminal is deletable
    public firstReady: boolean;  // nt: true if terminal start symbols have already been computed
    public first: BitSet;       // nt: terminal start symbols
    public follow: BitSet;      // nt: terminal followers
    public nts: BitSet;         // nt: nonterminals whose followers have to be added to this sym
    public line: number;        // source text line number of item in this node
    public attrPos: Position;     // nt: position of attributes in source text (or null)
    public semPos: Position;      // pr: pos of semantic action in source text (or null)
                                  // nt: pos of local declarations in source text (or null)
    public retType: string;     // AH - nt: Type of output attribute (or null)
    public retVar: string;      // AH - nt: Name of output attribute (or null)

    constructor(typ: number, name: string, line: number) {
        this.typ = typ;
        this.name = name;
        this.line = line;
    }
}

// @ts-ignore
class Node {
    // constants for node kinds
    public static readonly t = 1;  // terminal symbol
    public static readonly pr = 2;  // pragma
    public static readonly nt = 3;  // nonterminal symbol
    public static readonly clas = 4;  // character class
    public static readonly chr = 5;  // character
    public static readonly wt = 6;  // weak terminal symbol
    public static readonly any = 7;  //
    public static readonly eps = 8;  // empty
    public static readonly sync = 9;  // synchronization symbol
    public static readonly sem = 10;  // semantic action: (. .)
    public static readonly alt = 11;  // alternative: |
    public static readonly iter = 12;  // iteration: { }
    public static readonly opt = 13;  // option: [ ]
    public static readonly rslv = 14;  // resolver expr  /* ML */ /* AW 03-01-13 renamed slv --> rslv */

    public static readonly normalTrans = 0;		// transition codes
    public static readonly contextTrans = 1;

    public n: number;				// node number
    public typ: number;			// t, nt, wt, chr, clas, any, eps, sem, sync, alt, iter, opt, rslv
    public next: Node;			// to successor node
    public down: Node;			// alt: to next alternative
    public sub: Node;			// alt, iter, opt: to first node of substructure
    public up: boolean;				// true: "next" leads to successor in enclosing structure
    public sym: Symbol;			// nt, t, wt: symbol represented by this node
    public val: number;			// chr:  ordinal character value
    // clas: index of character class
    public code: number;			// chr, clas: transition code
    public set: BitSet;				// any, sync: the set represented by this node
    public pos: Position;			// nt, t, wt: pos of actual attributes
    // sem:       pos of semantic action in source text
    public line: number;			// source text line number of item in this node
    public state: State;		// DFA state corresponding to this node
    // (only used in DFA.ConvertToStates)
    public retVar: string;			// AH 20040206 - nt: name of output attribute (or null)

    constructor(typ: number, sym: Symbol, line: number) {
        this.typ = typ;
        this.sym = sym;
        this.line = line;
    }
}

class Graph {
    public l: Node;	// left end of graph = head
    public r: Node;// right end of graph = list of nodes to be linked to successor graph

    constructor();
    constructor(left: Node, right: Node);
    constructor(p: Node);

    //INTERNAL USE ONLY, .ts can only overload this way
    constructor(p?: Node, left?: Node, right?: Node) {
        if (p != undefined) {
            this.l = p;
            this.r = p;
        } else if (left != undefined) {
            this.l = left;
            this.r = right;
        } else {

        }
    }
}


//=====================================================================
// Sets
//=====================================================================
class Sets {
    public static Elements(s: BitSet): number {
        return s.cardinality();
    }

    public static Equals(a: BitSet, b: BitSet): boolean {
        return a.equals(b);
    }

    public static Intersect(a: BitSet, b: BitSet): boolean {// a * b != {}
        return a.intersects(b);
    }

    public static Subtract(a: BitSet, b: BitSet) { // a = a - b
        let c = b.clone();
        //a.and(c.not());
        c.flip(0, c.size());	// c.not
        a.and(c);
    }
}


//=====================================================================
// CharClass
//=====================================================================

class CharClass {
    public n: number;       // class number
    public name: string;	// class name
    public set: CharSet;	// set representing the class

    public CharClass(name: string, s: CharSet) {
        this.name = name;
        this.set = s;
    }
}


class Parser {
    trace: Trace;
    errors: Errors;

    SemErr(emptyTokenNotAllowed: string) {

    }
}

class Trace {
    Write(s: string, number?: number) {

    }

    WriteLine(s?: string, n?: number) {

    }

    formatString(s: string, number: number) {
        return "";
    }
}

class Errors {
}


class Tab {
    public semDeclPos: Position;        // position of global semantic declarations
    public ignored: CharSet;            // characters ignored by the scanner
    public ddt: boolean[];              // debug and test switches
    public gramSy: Symbol;              // root nonterminal; filled by ATG
    public eofSy: Symbol;               // end of file symbol
    public noSym: Symbol;               // used in case of an error
    public allSyncSets: BitSet;         // union of all synchronisation sets
    public literals: { key: string, value: Symbol };         // symbols that are used as literals

    public srcName: string;             // name of the atg file (including path)
    public srcDir: string;              // directory path of the atg file
    public nsName: string;              // package name for generated files
    public frameDir: string;            // directory containing the frame files
    public outDir: string;              // directory for generated files
    public checkEOF = true;            // should coco generate a check for EOF at
                                       // the end of Parser.Parse():

    visited: BitSet;                    // mark list for graph traversals
    curSy: Symbol;                      // current symbol in computation of sets

    parser: Parser;                     // other Coco objects
    trace: Trace;
    errors: Errors;

    public nodes = [];
    public nTyp = ["    ", "t   ", "pr  ", "nt  ", "clas", "chr ", "wt  ", "any ", "eps ",  /* AW 03-01-14 nTyp[0]: " " --> "    " */
        "sync", "sem ", "alt ", "iter", "opt ", "rslv"];
    dummyNode: Node;

    public terminals = [];
    public pragmas = [];
    public nonterminals = [];

    tKind = ["fixedToken", "classToken", "litToken", "classLitToken"];

    public classes = [];
    public dummyName = 'A';

    constructor(parser: Parser) {
        this.parser = parser;
        this.trace = parser.trace;
        this.errors = parser.errors;
        this.eofSy = this.NewSym(Node.t, "EOF", 0);
        this.dummyNode = this.NewNode(Node.eps, null, 0);
        this.literals = {};
    }

    NewSym(typ: number, name: string, line: number): Symbol {
        if (name.length == 2 && name.charAt(0) == '"') {
            this.parser.SemErr("empty token not allowed");
            name = "???";
        }
        let sym = new Symbol(typ, name, line);
        switch (typ) {
            case Node.t:
                sym.n = this.terminals.length;
                this.terminals.push(sym);
                break;
            case Node.pr:
                this.pragmas.push(sym);
                break;
            case Node.nt:
                sym.n = this.nonterminals.length;
                this.nonterminals.push(sym);
                break;
        }
        return sym;
    }

    public FindSym(name: string): Symbol {
        let s: Symbol;
        //foreach (Symbol s in terminals)
        for (let i = 0; i < this.terminals.length; i++) {
            s = this.terminals[i];
            if (s.name === name) return s;
        }
        //foreach (Symbol s in nonterminals)
        for (let i = 0; i < this.nonterminals.length; i++) {
            s = this.nonterminals[i];
            if (s.name === name) return s;
        }
        return null;
    }

    Num(p: Node): number {
        if (p == null) return 0; else return p.n;
    }

    PrintSym(sym: Symbol) {
        this.trace.Write(sym.n.toString(), -14);
        this.trace.Write(" ", -14);
        this.trace.Write(this.Name(sym.name), -14);
        this.trace.Write(" ", -14);
        this.trace.Write((this.nTyp)[sym.typ], -14);
        if (sym.attrPos == null) this.trace.Write(" false "); else this.trace.Write(" true  ");
        if (sym.typ == Node.nt) {
            this.trace.Write(this.Num(sym.graph).toString(), 5);
            if (sym.deletable) this.trace.Write(" true  "); else this.trace.Write(" false ");
        } else
            this.trace.Write("            ");
        this.trace.Write(sym.line.toString(), 5);
        this.trace.WriteLine(" " + (this.tKind)[sym.tokenKind]);
    }

    public PrintSymbolTable(s: string) {
        this.trace.WriteLine("Symbol Table:");
        this.trace.WriteLine("------------");
        this.trace.WriteLine();
        this.trace.WriteLine(" nr name           typ  hasAt graph  del   line tokenKind");
        //foreach (Symbol sym in Symbol.terminals)
        for (let i = 0; i < this.terminals.length; i++) {
            this.PrintSym(this.terminals[i]);
        }
        //foreach (Symbol sym in Symbol.pragmas)
        for (let i = 0; i < this.pragmas.length; i++) {
            this.PrintSym(this.pragmas[i]);
        }
        //foreach (Symbol sym in Symbol.nonterminals)
        for (let i = 0; i < this.nonterminals.length; i++) {
            this.PrintSym(this.nonterminals[i]);
        }
        this.trace.WriteLine();
        this.trace.WriteLine("Literal Tokens:");
        this.trace.WriteLine("--------------");
        //foreach (DictionaryEntry e in literals) {
        for (let literalsData in this.literals) {
            this.trace.WriteLine("_" + literalsData["value"].name + " = " + literalsData["key"] + ".");
        }
        this.trace.WriteLine();
    }

    public PrintSet(s: BitSet, indent: number) {
        let col = indent;
        //foreach (Symbol sym in Symbol.terminals) {
        for (let i = 0; i < this.terminals.length; i++) {
            let sym = this.terminals[i];
            if (s[sym.n]) {
                let len = sym.name.length();
                if (col + len >= 80) {
                    this.trace.WriteLine();
                    for (col = 1; col < indent; col++) this.trace.Write(" ");
                }
                this.trace.Write(sym.name + " ");
                col += len + 1;
            }
        }
        if (col == indent) this.trace.Write("-- empty set --");
        this.trace.WriteLine();
    }

    //---------------------------------------------------------------------
    //  Syntax graph management
    //---------------------------------------------------------------------

    public NewNode(typ: number, sym: Symbol, line: number): Node {
        let node = new Node(typ, sym, line);
        node.n = this.nodes.length;
        this.nodes.push(node);
        return node;
    }

    public NewNode(typ: number, sub: Node): Node {
        let node = this.NewNode(typ, null, 0);
        node.sub = sub;
        return node;
    }

    public NewNode(typ: number, val: number, line: number): Node {
        let node = this.NewNode(typ, null, line);
        node.val = val;
        return node;
    }

    public MakeFirstAlt(g: Graph) {
        g.l = this.NewNode(Node.alt, g.l);
        g.l.line = g.l.sub.line;
        g.r.up = true;
        g.l.next = g.r;
        g.r = g.l;
    }

// The result will be in g1
    public MakeAlternative(g1: Graph, g2: Graph) {
        g2.l = this.NewNode(Node.alt, g2.l);
        g2.l.line = g2.l.sub.line;
        g2.l.up = true;
        g2.r.up = true;
        let p = g1.l;
        while (p.down != null) p = p.down;
        p.down = g2.l;
        p = g1.r;
        while (p.next != null) p = p.next;
        // append alternative to g1 end list
        p.next = g2.l;
        // append g2 end list to g1 end list
        g2.l.next = g2.r;
    }

    // The result will be in g1
    public MakeSequence(g1: Graph, g2: Graph) {
        let p = g1.r.next;
        g1.r.next = g2.l; // link head node
        while (p != null) {  // link substructure
            let q = p.next;
            p.next = g2.l;
            p = q;
        }
        g1.r = g2.r;
    }

    public MakeIteration(g: Graph) {
        g.l = this.NewNode(Node.iter, g.l);
        g.r.up = true;
        let p = g.r;
        g.r = g.l;
        while (p != null) {
            let q = p.next;
            p.next = g.l;
            p = q;
        }
    }

    public MakeOption(g: Graph) {
        g.l = this.NewNode(Node.opt, g.l);
        g.r.up = true;
        g.l.next = g.r;
        g.r = g.l;
    }

    public Finish(g: Graph) {
        let p = g.r;
        while (p != null) {
            let q = p.next;
            p.next = null;
            p = q;
        }
    }

    public DeleteNodes() {
        this.nodes = [];
        this.dummyNode = this.NewNode(Node.eps, null, 0);
    }

    public StrToGraph(str: string): Graph {
        let s = this.Unescape(str.substring(1, str.length - 1));
        if (s.length() == 0) this.parser.SemErr("empty token not allowed");
        let g = new Graph();
        g.r = this.dummyNode;
        for (let i = 0; i < s.length; i++) {
            let p = this.NewNode(Node.chr, s.charAt(i), 0);
            g.r.next = p;
            g.r = p;
        }
        g.l = this.dummyNode.next;
        this.dummyNode.next = null;
        return g;
    }

    public SetContextTrans(p: Node) { // set transition code in the graph rooted at p
        while (p != null) {
            if (p.typ == Node.chr || p.typ == Node.clas) {
                p.code = Node.contextTrans;
            } else if (p.typ == Node.opt || p.typ == Node.iter) {
                this.SetContextTrans(p.sub);
            } else if (p.typ == Node.alt) {
                this.SetContextTrans(p.sub);
                this.SetContextTrans(p.down);
            }
            if (p.up) break;
            p = p.next;
        }
    }

    //---------------- graph deletability check ---------------------

    public DelGraph(p: Node): boolean {
        return p == null || this.DelNode(p) && this.DelGraph(p.next);
    }

    public DelSubGraph(p: Node): boolean {
        return p == null || this.DelNode(p) && (p.up || this.DelSubGraph(p.next));
    }

    public DelNode(p: Node): boolean {
        if (p.typ == Node.nt) return p.sym.deletable;
        else if (p.typ == Node.alt) return this.DelSubGraph(p.sub) || p.down != null && this.DelSubGraph(p.down);
        else return p.typ == Node.iter || p.typ == Node.opt || p.typ == Node.sem
                || p.typ == Node.eps || p.typ == Node.sync || p.typ == Node.rslv;
    }

    //-------------------- graph printing ------------------------

    Ptr(p: Node, up: boolean): string {
        let ptr = (p == null) ? "0" : p.n.toString();
        return (up) ? ("-" + ptr) : ptr;
    }

    Pos(pos: Position): string {
        if (pos == null) return "     ";
        else return this.trace.formatString(pos.beg.toString(), 5);
    }

    public Name(name: string): string {
        return (name + "           ").substring(0, 12);
        // found no simpler way to get the first 12 characters of the name
        // padded with blanks on the right
    }

    public PrintNodes() {
        this.trace.WriteLine("Graph nodes:");
        this.trace.WriteLine("----------------------------------------------------");
        this.trace.WriteLine("   n type name          next  down   sub   pos  line");
        this.trace.WriteLine("                               val  code");
        this.trace.WriteLine("----------------------------------------------------");
        //foreach (Node p in nodes) {
        for (let i = 0; i < this.nodes.length; i++) {
            let p = this.nodes[i];
            this.trace.Write(p.n.toString(), 4);
            this.trace.Write(" " + (this.nTyp)[p.typ] + " ");
            if (p.sym != null) {
                this.trace.Write(this.Name(p.sym.name), 12);
                this.trace.Write(" ");
            } else if (p.typ == Node.clas) {
                let c = this.classes[p.val];
                this.trace.Write(this.Name(c.name), 12);
                this.trace.Write(" ");
            } else this.trace.Write("             ");
            this.trace.Write(this.Ptr(p.next, p.up), 5);
            this.trace.Write(" ");
            switch (p.typ) {
                case Node.t:
                case Node.nt:
                case Node.wt:
                    this.trace.Write("             ");
                    this.trace.Write(this.Pos(p.pos), 5);
                    break;
                case Node.chr:
                    this.trace.Write(p.val.toString(), 5);
                    this.trace.Write(" ");
                    this.trace.Write(p.code.toString(), 5);
                    this.trace.Write("       ");
                    break;
                case Node.clas:
                    this.trace.Write("      ");
                    this.trace.Write(p.code, 5);
                    this.trace.Write("       ");
                    break;
                case Node.alt:
                case Node.iter:
                case Node.opt:
                    this.trace.Write(this.Ptr(p.down, false), 5);
                    this.trace.Write(" ");
                    this.trace.Write(this.Ptr(p.sub, false), 5);
                    this.trace.Write("       ");
                    break;
                case Node.sem:
                    this.trace.Write("             ");
                    this.trace.Write(this.Pos(p.pos), 5);
                    break;
                case Node.eps:
                case Node.any:
                case Node.sync:
                    this.trace.Write("                  ");
                    break;
            }
            this.trace.WriteLine(p.line.toString(), 5);
        }
        this.trace.WriteLine();
    }
}