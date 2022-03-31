import {BitSet, Node_, Sets, Symbol, Tab} from "./Tab";


//-----------------------------------------------------------------------------
//  State
//-----------------------------------------------------------------------------

export class State {               // state of finite automaton
    public nr: number;            // state number
    public firstAction: Action;// to first action of this state
    public endOf: Symbol;      // recognized token if state is final
    public ctx: boolean;       // true if state is reached via contextTrans
    public next: State;

    public AddAction(act: Action) {
        let lasta = null, a = this.firstAction;
        while (a != null && act.typ >= a.typ) {
            lasta = a;
            a = a.next;
        }
        // collecting classes at the beginning gives better performance
        act.next = a;
        if (a == this.firstAction) this.firstAction = act; else lasta.next = act;
    }

    public DetachAction(act: Action) {
        let lasta = null, a = this.firstAction;
        while (a != null && a != act) {
            lasta = a;
            a = a.next;
        }
        if (a != null)
            if (a == this.firstAction) this.firstAction = a.next; else lasta.next = a.next;
    }

    public MeltWith(s: State) { // copy actions of s to state
        for (let action = s.firstAction; action != null; action = action.next) {
            let a = new Action(action.typ, action.sym, action.tc);
            a.AddTargets(action);
            this.AddAction(a);
        }
    }

}

//-----------------------------------------------------------------------------
//  Action
//-----------------------------------------------------------------------------

export class Action {      // action of finite automaton
    public typ: number;         // type of action symbol: clas, chr
    public sym: number;         // action symbol
    public tc: number;          // transition code: normalTrans, contextTrans
    public target: Target;   // states reached from this action
    public next: Action;

    constructor(typ: number, sym: number, tc: number) {
        this.typ = typ;
        this.sym = sym;
        this.tc = tc;
    }

    public AddTarget(t: Target) { // add t to the action.targets
        let last: Target = null;
        let p = this.target;
        while (p != null && t.state.nr >= p.state.nr) {
            if (t.state == p.state) return;
            last = p;
            p = p.next;
        }
        t.next = p;
        if (p == this.target) this.target = t; else last.next = t;
    }

    public AddTargets(a: Action) { // add copy of a.targets to action.targets
        for (let p = a.target; p != null; p = p.next) {
            let t = new Target(p.state);
            this.AddTarget(t);
        }
        if (a.tc == Node_.contextTrans) this.tc = Node_.contextTrans;
    }

    public Symbols(tab: Tab): CharSet {
        let s: CharSet;
        if (this.typ == Node_.clas)
            s = tab.CharClassSet(this.sym).Clone();
        else {
            s = new CharSet();
            s.Set(this.sym);
        }
        return s;
    }

    public ShiftWith(s: CharSet, tab: Tab) {
        if (s.Elements() == 1) {
            this.typ = Node_.chr;
            this.sym = s.First();
        } else {
            let c = tab.FindCharClass(s);
            if (c == null) c = tab.NewCharClass("#", s); // class with dummy name
            this.typ = Node_.clas;
            this.sym = c.n;
        }
    }
}

//-----------------------------------------------------------------------------
//  Target
//-----------------------------------------------------------------------------

export class Target {          // set of states that are reached by an action
    public state: State;   // target state
    public next: Target;

    constructor(s: State) {
        this.state = s;
    }
}

//-----------------------------------------------------------------------------
//  Melted
//-----------------------------------------------------------------------------

export class Melted {          // info about melted states
    public set: BitSet;          // set of old states
    public state: State;         // new state
    public next: Melted;

    constructor(set: BitSet, state: State) {
        this.set = set;
        this.state = state;
    }
}

//-----------------------------------------------------------------------------
//  Comment
//-----------------------------------------------------------------------------

export class Comment {         // info about comment syntax
    public start: string;
    public stop: string;
    public nested: boolean;
    public next: Comment;

    constructor(start: string, stop: string, nested: boolean) {
        this.start = start;
        this.stop = stop;
        this.nested = nested;
    }
}

//-----------------------------------------------------------------------------
//  CharSet
//-----------------------------------------------------------------------------
export class Range {
    to: number;
    from: number;
    next: Range;

    constructor(from: number, to: number) {
        this.from = from;
        this.to = to;
    }
}

export class CharSet {
    public head: Range;

    public Get(i: number): boolean {
        for (let p = this.head; p != null; p = p.next)
            if (i < p.from) return false;
            else if (i <= p.to) return true; // p.from <= i <= p.to
        return false;
    }

    public Set(i: number) {
        let cur = this.head, prev = null;
        while (cur != null && i >= cur.from - 1) {
            if (i <= cur.to + 1) { // (cur.from-1) <= i <= (cur.to+1)
                if (i == cur.from - 1) cur.from--;
                else if (i == cur.to + 1) {
                    cur.to++;
                    let next = cur.next;
                    if (next != null && cur.to == next.from - 1) {
                        cur.to = next.to;
                        cur.next = next.next;
                    }
                    ;
                }
                return;
            }
            prev = cur;
            cur = cur.next;
        }
        let n = new Range(i, i);
        n.next = cur;
        if (prev == null) this.head = n; else prev.next = n;
    }

    public Clone(): CharSet {
        let s = new CharSet();
        let prev = null;
        for (let cur = this.head; cur != null; cur = cur.next) {
            let r = new Range(cur.from, cur.to);
            if (prev == null) s.head = r; else prev.next = r;
            prev = r;
        }
        return s;
    }

    public Equals(s: CharSet): boolean {
        let p = this.head, q = s.head;
        while (p != null && q != null) {
            if (p.from != q.from || p.to != q.to) return false;
            p = p.next;
            q = q.next;
        }
        return p == q;
    }

    public Elements(): number {
        let n = 0;
        for (let p = this.head; p != null; p = p.next) n += p.to - p.from + 1;
        return n;
    }

    public First(): number {
        if (this.head != null) return this.head.from;
        return -1;
    }

    public Or(s: CharSet) {
        for (let p = s.head; p != null; p = p.next)
            for (let i = p.from; i <= p.to; i++) this.Set(i);
    }

    public And(s: CharSet) {
        let x = new CharSet();
        for (let p = this.head; p != null; p = p.next)
            for (let i = p.from; i <= p.to; i++)
                if (s.Get(i)) x.Set(i);
        this.head = x.head;
    }

    public Subtract(s: CharSet) {
        let x = new CharSet();
        for (let p = this.head; p != null; p = p.next)
            for (let i = p.from; i <= p.to; i++)
                if (!s.Get(i)) x.Set(i);
        this.head = x.head;
    }

    public Includes(s: CharSet): boolean {
        for (let p = s.head; p != null; p = p.next)
            for (let i = p.from; i <= p.to; i++)
                if (!this.Get(i)) return false;
        return true;
    }

    public Intersects(s: CharSet): boolean {
        for (let p = s.head; p != null; p = p.next)
            for (let i = p.from; i <= p.to; i++)
                if (this.Get(i)) return true;
        return false;
    }

    public Fill() {
        //TODO: Implement this
        //this.head = new Range(Character.MIN_VALUE, Character.MAX_VALUE);
    }
}


//-----------------------------------------------------------------------------
//  Generator
//-----------------------------------------------------------------------------
class Generator {
    private static EOF = -1;

    private fram: Reader;
    private gen: PrintWriter;
    private tab: Tab;
    private frameFile: File;

    constructor(tab: Tab) {
        this.tab = tab;
    }

    public OpenFrame(frame: string): Reader {
        if (this.tab.frameDir != null) this.frameFile = new File(this.tab.frameDir, frame);
        if (this.frameFile == null || !this.frameFile.exists()) this.frameFile = new File(this.tab.srcDir, frame);
        if (this.frameFile == null || !this.frameFile.exists()) throw new Error("Cannot find : " + frame);

        try {
            this.fram = new BufferedReader(new FileReader(this.frameFile)); /* pdt */
        } catch (FileNotFoundException) {
            throw new Error("Cannot open frame file: " + this.frameFile.getPath());
        }
        return this.fram;
    }

    public OpenGen(target: string): PrintWriter {
        let f = new File(this.tab.outDir, target);
        try {
            if (f.exists()) {
                let old = new File(f.getPath() + ".old");
                old.delete();
                f.renameTo(old);
            }
            this.gen = new PrintWriter(new BufferedWriter(new FileWriter(f, false))); /* pdt */
        } catch (Exception) {
            throw new Error("Cannot generate file: " + f.getPath());
        }
        return this.gen;
    }

    public GenCopyright() {
        let copyFr = null;
        if (this.tab.frameDir != null) copyFr = new File(this.tab.frameDir, "Copyright.frame");
        if (copyFr == null || !copyFr.exists()) copyFr = new File(this.tab.srcDir, "Copyright.frame");
        if (copyFr == null || !copyFr.exists()) return;

        try {
            let scannerFram = this.fram;
            this.fram = new BufferedReader(new FileReader(copyFr));
            this.CopyFramePart(null);
            this.fram = scannerFram;
        } catch (FileNotFoundException) {
            throw new Error("Cannot open Copyright.frame");
        }
    }

    public SkipFramePart(stop: string) {
        this.CopyFramePart(stop, false);
    }

// if stop == null, copies until end of file
    private CopyFramePart(stop: string, generateOutput: boolean = true) {
        let startCh = 0;
        let endOfStopString = 0;

        if (stop != null) {
            startCh = stop.charCodeAt(0);
            endOfStopString = stop.length - 1;
        }

        let ch = this.framRead();
        while (ch != Generator.EOF) {
            if (stop != null && ch == startCh) {
                let i = 0;
                do {
                    if (i == endOfStopString) return; // stop[0..i] found
                    ch = this.framRead();
                    i++;
                } while (ch == stop.charCodeAt(i));
                // stop[0..i-1] found; continue with last read character
                if (generateOutput) this.gen.print(stop.substring(0, i));
            } else {
                if (generateOutput) this.gen.print(ch);
                ch = this.framRead();
            }
        }

        if (stop != null) throw new Error("Incomplete or corrupt frame file: " + this.frameFile.getPath());
    }

    private framRead(): number {
        try {
            return this.fram.read();
        } catch (IOException) {
            throw new Error("Error reading frame file: " + this.frameFile.getPath());
        }
    }
}

//-----------------------------------------------------------------------------
//  DFA
//-----------------------------------------------------------------------------

public class DFA {
    public ignoreCase: boolean;    // true if input should be treated case-insensitively
    public hasCtxMoves: boolean;   // DFA has context transitions

    private maxStates: number;
    private lastStateNr: number;      // highest state number
    private firstState: State;
    private lastState: State;      // last allocated state
    private lastSimState: number;     // last non melted state
    private fram: Reader;          // scanner frame input     /* pdt */
    private gen: PrintWriter;      // generated scanner file  /* pdt */
    private curSy: Symbol;         // current token to be recognized (in FindTrans)
    private dirtyDFA: boolean;     // DFA may become nondeterministic in MatchLiteral

    private tab: Tab;             // other Coco objects
    private parser: Parser;
    private errors: Errors;
    private trace: Trace;

    private firstMelted: Melted;

    //---------- Output primitives
    private Ch(ch: string): string {
        if (ch.charCodeAt(0) < ' '.charCodeAt(0) || ch.charCodeAt(0) >= 127 || ch == '\'' || ch == '\\') {
            return ch;
        } else return "'" + ch + "'";
    }

    private ChCond(ch: string): string {
        return ("ch == " + this.Ch(ch));
    }

    private PutRange(s: CharSet) {
        for (let r = s.head; r != null; r = r.next) {
            if (r.from == r.to) {
                this.gen.print("ch == " + this.Ch(String.fromCharCode(r.from)));
            } else if (r.from == 0) {
                this.gen.print("ch <= " + this.Ch(String.fromCharCode(r.to)));
            } else {
                this.gen.print("ch >= " + this.Ch(String.fromCharCode(r.from)) + " && ch <= " + this.Ch(String.fromCharCode(r.to)));
            }
            if (r.next != null) this.gen.print(" || ");
        }
    }

//---------- State handling

    NewState(): State {
        let s = new State();
        s.nr = ++this.lastStateNr;
        if (this.firstState == null) this.firstState = s; else this.lastState.next = s;
        this.lastState = s;
        return s;
    }

    NewTransition(from: State, to: State, typ: number, sym: number, tc: number) {
        let t = new Target(to);
        let a = new Action(typ, sym, tc);
        a.target = t;
        from.AddAction(a);
        if (typ == Node_.clas) this.curSy.tokenKind = Symbol.classToken;
    }

    CombineShifts() {
        let state: State;
        let a, b, c: Action;
        let seta, setb: CharSet;
        for (state = this.firstState; state != null; state = state.next) {
            for (a = state.firstAction; a != null; a = a.next) {
                b = a.next;
                while (b != null)
                    if (a.target.state == b.target.state && a.tc == b.tc) {
                        seta = a.Symbols(this.tab);
                        setb = b.Symbols(this.tab);
                        seta.Or(setb);
                        a.ShiftWith(seta, this.tab);
                        c = b;
                        b = b.next;
                        state.DetachAction(c);
                    } else b = b.next;
            }
        }
    }

    FindUsedStates(state: State, used: BitSet) {
        if (used.get(state.nr)) return;
        used.set(state.nr);
        for (let a = state.firstAction; a != null; a = a.next)
            this.FindUsedStates(a.target.state, used);
    }

    DeleteRedundantStates() {
        let newState = new State[this.lastStateNr + 1];
        let used = new BitSet(this.lastStateNr + 1);
        this.FindUsedStates(this.firstState, used);
        // combine equal final states
        for (let s1 = this.firstState.next; s1 != null; s1 = s1.next) // firstState cannot be final
            if (used.get(s1.nr) && s1.endOf != null && s1.firstAction == null && !s1.ctx)
                for (let s2 = s1.next; s2 != null; s2 = s2.next)
                    //TODO: look at this
                    // if (used.get(s2.nr) && s1.endOf == s2.endOf && s2.firstAction == null & !s2.ctx) { // ??????????
                    if (used.get(s2.nr) && s1.endOf == s2.endOf && s2.firstAction == null && !s2.ctx) {
                        used.set(s2.nr, false);
                        newState[s2.nr] = s1;
                    }
        for (let state = this.firstState; state != null; state = state.next)
            if (used.get(state.nr))
                for (let a = state.firstAction; a != null; a = a.next)
                    if (!used.get(a.target.state.nr))
                        a.target.state = newState[a.target.state.nr];
        // delete unused states
        this.lastState = this.firstState;
        this.lastStateNr = 0; // firstState has number 0
        for (let state = this.firstState.next; state != null; state = state.next)
            if (used.get(state.nr)) {
                state.nr = ++this.lastStateNr;
                this.lastState = state;
            } else this.lastState.next = state.next;
    }

    TheState(p: Node_): State {
        let state: State;
        if (p == null) {
            state = this.NewState();
            state.endOf = this.curSy;
            return state;
        } else return p.state;
    }

    Step(from: State, p: Node_, stepped: BitSet) {
        if (p == null) return;
        stepped.set(p.n);
        switch (p.typ) {
            case Node_.clas:
            case Node_.chr: {
                this.NewTransition(from, this.TheState(p.next), p.typ, p.val, p.code);
                break;
            }
            case Node_.alt: {
                this.Step(from, p.sub, stepped);
                this.Step(from, p.down, stepped);
                break;
            }
            case Node_.iter: {
                if (this.tab.DelSubGraph(p.sub)) {
                    this.parser.SemErr("contents of {...} must not be deletable");
                    return;
                }
                if (p.next != null && !stepped.get(p.next.n)) this.Step(from, p.next, stepped);
                this.Step(from, p.sub, stepped);
                if (p.state != from) {
                    this.Step(p.state, p, new BitSet(this.tab.nodes.length));
                }
                break;
            }
            case Node_.opt: {
                if (p.next != null && !stepped.get(p.next.n)) this.Step(from, p.next, stepped);
                this.Step(from, p.sub, stepped);
                break;
            }
        }
    }


// Assigns a state n.state to every node n. There will be a transition from
// n.state to n.next.state triggered by n.val. All nodes in an alternative
// chain are represented by the same state.
// Numbering scheme:
//  - any node after a chr, clas, opt, or alt, must get a new number
//  - if a nested structure starts with an iteration the iter node must get a new number
//  - if an iteration follows an iteration, it must get a new number
    NumberNodes(p: Node_, state: State, renumIter: boolean) {
        if (p == null) return;
        if (p.state != null) return; // already visited;
        if (state == null || (p.typ == Node_.iter && renumIter)) state = this.NewState();
        p.state = state;
        if (this.tab.DelGraph(p)) state.endOf = this.curSy;
        switch (p.typ) {
            case Node_.clas:
            case Node_.chr: {
                this.NumberNodes(p.next, null, false);
                break;
            }
            case Node_.opt: {
                this.NumberNodes(p.next, null, false);
                this.NumberNodes(p.sub, state, true);
                break;
            }
            case Node_.iter: {
                this.NumberNodes(p.next, state, true);
                this.NumberNodes(p.sub, state, true);
                break;
            }
            case Node_.alt: {
                this.NumberNodes(p.next, null, false);
                this.NumberNodes(p.sub, state, true);
                this.NumberNodes(p.down, state, renumIter);
                break;
            }
        }
    }

    FindTrans(p: Node_, start: boolean, marked: BitSet) {
        if (p == null || marked.get(p.n)) return;
        marked.set(p.n);
        if (start) this.Step(p.state, p, new BitSet(this.tab.nodes.size())); // start of group of equally numbered nodes
        switch (p.typ) {
            case Node_.clas:
            case Node_.chr: {
                this.FindTrans(p.next, true, marked);
                break;
            }
            case Node_.opt: {
                this.FindTrans(p.next, true, marked);
                this.FindTrans(p.sub, false, marked);
                break;
            }
            case Node_.iter: {
                this.FindTrans(p.next, false, marked);
                this.FindTrans(p.sub, false, marked);
                break;
            }
            case Node_.alt: {
                this.FindTrans(p.sub, false, marked);
                this.FindTrans(p.down, false, marked);
                break;
            }
        }
    }

    public ConvertToStates(p: Node_, sym: Symbol) {
        this.curSy = sym;
        if (this.tab.DelGraph(p)) {
            this.parser.SemErr("token might be empty");
            return;
        }
        this.NumberNodes(p, this.firstState, true);
        this.FindTrans(p, true, new BitSet(this.tab.nodes.length));
        if (p.typ == Node_.iter) {
            this.Step(this.firstState, p, new BitSet(this.tab.nodes.length));
        }
    }

// match string against current automaton; store it either as a fixedToken or as a litToken
    public MatchLiteral(s: string, sym: Symbol) {
        s = this.tab.Unescape(s.substring(1, s.length - 1));
        let i, len = s.length;
        let state = this.firstState;
        let a = null;
        for (i = 0; i < len; i++) { // try to match s against existing DFA
            a = FindAction(state, s.charAt(i));
            if (a == null) break;
            state = a.target.state;
        }
        // if s was not totally consumed or leads to a non-final state => make new DFA from it
        if (i != len || state.endOf == null) {
            state = this.firstState;
            i = 0;
            a = null;
            this.dirtyDFA = true;
        }
        for (; i < len; i++) { // make new DFA for s[i..len-1]
            let to = this.NewState();
            this.NewTransition(state, to, Node_.chr, s.charCodeAt(i), Node_.normalTrans);
            state = to;
        }
        let matchedSym = state.endOf;
        if (state.endOf == null) {
            state.endOf = sym;
        } else if (matchedSym.tokenKind == Symbol.fixedToken || (a != null && a.tc == Node_.contextTrans)) {
            // s matched a token with a fixed definition or a token with an appendix that will be cut off
            this.parser.SemErr("tokens " + sym.name + " and " + matchedSym.name + " cannot be distinguished");
        } else { // matchedSym == classToken || classLitToken
            matchedSym.tokenKind = Symbol.classLitToken;
            sym.tokenKind = Symbol.litToken;
        }
    }

    SplitActions(state: State, a: Action, b: Action) {
        let c: Action;
        let seta, setb, setc: CharSet;
        seta = a.Symbols(this.tab);
        setb = b.Symbols(this.tab);
        if (seta.Equals(setb)) {
            a.AddTargets(b);
            state.DetachAction(b);
        } else if (seta.Includes(setb)) {
            setc = seta.Clone();
            setc.Subtract(setb);
            b.AddTargets(a);
            a.ShiftWith(setc, this.tab);
        } else if (setb.Includes(seta)) {
            setc = setb.Clone();
            setc.Subtract(seta);
            a.AddTargets(b);
            b.ShiftWith(setc, this.tab);
        } else {
            setc = seta.Clone();
            setc.And(setb);
            seta.Subtract(setc);
            setb.Subtract(setc);
            a.ShiftWith(seta, this.tab);
            b.ShiftWith(setb, this.tab);
            c = new Action(0, 0, Node_.normalTrans);  // typ and sym are set in ShiftWith
            c.AddTargets(a);
            c.AddTargets(b);
            c.ShiftWith(setc, this.tab);
            state.AddAction(c);
        }
    }

    private Overlap(a: Action, b: Action): boolean {
        let seta, setb: CharSet;
        if (a.typ == Node_.chr)
            if (b.typ == Node_.chr) return a.sym == b.sym;
            else {
                setb = this.tab.CharClassSet(b.sym);
                return setb.Get(a.sym);
            }
        else {
            seta = this.tab.CharClassSet(a.sym);
            if (b.typ == Node_.chr) return seta.Get(b.sym);
            else {
                setb = this.tab.CharClassSet(b.sym);
                return seta.Intersects(setb);
            }
        }
    }

    MakeUnique(state: State) {
        let changed: boolean;
        do {
            changed = false;
            for (let a = state.firstAction; a != null; a = a.next)
                for (let b = a.next; b != null; b = b.next)
                    if (this.Overlap(a, b)) {
                        this.SplitActions(state, a, b);
                        changed = true;
                    }
        } while (changed);
    }

    MeltStates(state: State) {
        let ctx: boolean;
        let targets: BitSet;
        let endOf: Symbol;
        for (let action = state.firstAction; action != null; action = action.next) {
            if (action.target.next != null) {
                //action.GetTargetStates(out targets, out endOf, out ctx);
                let param = new Object[2];
                ctx = this.GetTargetStates(action, param);
                targets = param[0];
                endOf = param[1];
                //
                let melt = this.StateWithSet(targets);
                if (melt == null) {
                    let s = this.NewState();
                    s.endOf = endOf;
                    s.ctx = ctx;
                    for (let targ = action.target; targ != null; targ = targ.next)
                        s.MeltWith(targ.state);
                    this.MakeUnique(s);
                    melt = NewMelted(targets, s);
                }
                action.target.next = null;
                action.target.state = melt.state;
            }
        }
    }

    FindCtxStates() {
        for (let state = this.firstState; state != null; state = state.next)
            for (let a = state.firstAction; a != null; a = a.next)
                if (a.tc == Node_.contextTrans) a.target.state.ctx = true;
    }

    public MakeDeterministic() {
        let state: State;
        this.lastSimState = this.lastState.nr;
        this.maxStates = 2 * this.lastSimState; // heuristic for set size in Melted.set
        this.FindCtxStates();
        for (state = this.firstState; state != null; state = state.next)
            this.MakeUnique(state);
        for (state = this.firstState; state != null; state = state.next)
            this.MeltStates(state);
        this.DeleteRedundantStates();
        this.CombineShifts();
    }

    public PrintStates() {
        this.trace.WriteLine();
        this.trace.WriteLine("---------- states ----------");
        for (let state = this.firstState; state != null; state = state.next) {
            let first = true;
            if (state.endOf == null) this.trace.Write("               ");
            else this.trace.Write("E(" + this.tab.Name(state.endOf.name) + ")", 12);
            this.trace.Write(state.nr + ":", 3);
            if (state.firstAction == null) this.trace.WriteLine();
            for (let action = state.firstAction; action != null; action = action.next) {
                if (first) {
                    this.trace.Write(" ");
                    first = false;
                } else this.trace.Write("                   ");
                if (action.typ == Node_.clas)
                    this.trace.Write((this.tab.classes[action.sym]).name);
                else this.trace.Write(this.Ch(action.sym.toString()), 3);
                for (let targ = action.target; targ != null; targ = targ.next)
                    this.trace.Write(targ.state.nr, 3);
                if (action.tc == Node_.contextTrans) this.trace.WriteLine(" context"); else this.trace.WriteLine();
            }
        }
        this.trace.WriteLine();
        this.trace.WriteLine("---------- character classes ----------");
        this.tab.WriteCharClasses();
    }

    //------------------------ actions ------------------------------

    public FindAction(state: State, ch: string): Action {
        for (let a = state.firstAction; a != null; a = a.next)
            if (a.typ == Node_.chr && ch.charCodeAt(0) == a.sym) return a;
            else if (a.typ == Node_.clas) {
                let s = this.tab.CharClassSet(a.sym);
                if (s.Get(ch.charCodeAt(0))) return a;
            }
        return null;
    }

//public void GetTargetStates(out BitArray targets, out Symbol endOf, out bool ctx) {
    public GetTargetStates(a: Action, param: Object[]): boolean {
        // compute the set of target states
        let targets = new BitSet(this.maxStates);
        let endOf = null;
        let ctx = false;
        for (let t = a.target; t != null; t = t.next) {
            let stateNr = t.state.nr;
            if (stateNr <= this.lastSimState) targets.set(stateNr);
            else targets.or(this.MeltedSet(stateNr));
            if (t.state.endOf != null)
                if (endOf == null || endOf == t.state.endOf)
                    endOf = t.state.endOf;
                else {
                    this.errors.SemErr("Tokens " + endOf.name + " and " + t.state.endOf.name +
                        " cannot be distinguished");
                }
            if (t.state.ctx) {
                ctx = true;
                // The following check seems to be unnecessary. It reported an error
                // if a symbol + context was the prefix of another symbol, e.g.
                //   s1 = "a" "b" "c".
                //   s2 = "a" CONTEXT("b").
                // But this is ok.
                // if (t.state.endOf != null) {
                //   Console.WriteLine("Ambiguous context clause");
                //   Errors.count++;
                // }
            }
        }
        param[0] = targets;
        param[1] = endOf;
        return ctx;
    }

    //---------------------- melted states --------------------------

    // head of melted state list

    NewMelted(set: BitSet, state: State): Melted {
        let m = new Melted(set, state);
        m.next = this.firstMelted;
        this.firstMelted = m;
        return m;
    }

    MeltedSet(nr: number): BitSet {
        let m = this.firstMelted;
        while (m != null) {
            if (m.state.nr == nr) return m.set; else m = m.next;
        }
        throw new Error("Compiler error in Melted.Set");
    }

    StateWithSet(s: BitSet): Melted {
        for (let m = this.firstMelted; m != null; m = m.next)
            if (Sets.Equals(s, m.set)) return m;
        return null;
    }
}

