import {BitSet, Node_, Tab} from "./Tab";


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

