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


//TODO:
class Hashtable {
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
    public literals: Hashtable;         // symbols that are used as literals

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


    constructor(parser: Parser) {
        this.parser = parser;
        this.trace = parser.trace;
        this.errors = parser.errors;
        this.eofSy = this.NewSym(Node.t, "EOF", 0);
        this.dummyNode = NewNode(Node.eps, null, 0);
        this.literals = new Hashtable();
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

}