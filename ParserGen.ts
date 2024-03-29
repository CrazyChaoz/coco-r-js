/*-------------------------------------------------------------------------
Compiler Generator Coco/R,
Copyright (c) 1990, 2004 Hanspeter Moessenboeck, University of Linz
extended by M. Loeberbauer & A. Woess, University of Linz
ported from C# to Java by Wolfgang Ahorner
with improvements by Pat Terry, Rhodes University
ported from Java to Typescript by Stefan Kempinger, University of Linz

This program is free software; you can redistribute it and/or modify it
under the terms of the GNU General Public License as published by the
Free Software Foundation; either version 2, or (at your option) any
later version.

This program is distributed in the hope that it will be useful, but
WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
for more details.

You should have received a copy of the GNU General Public License along
with this program; if not, write to the Free Software Foundation, Inc.,
59 Temple Place - Suite 330, Boston, MA 02111-1307, USA.

As an exception, it is allowed to write an extension of Coco/R that is
used as a plugin in non-free software.

If not otherwise stated, any source code generated by Coco/R (other than
Coco/R itself) does not fall under the GNU General Public License.
------------------------------------------------------------------------*/


import {Node_, Position, Sets, Symbol, Tab} from "./Tab";
import {Generator} from "./DFA";
import {Errors, Parser} from "./Parser";
import {Trace} from "./Trace";
import {Buffer} from "./Scanner";
import * as fs from "fs";
import BitSet from "bitset";
import * as os from "os";

export class ParserGen {

    static maxTerm = 3;   // sets of size < maxTerm are enumerated
    static CR = '\r';
    static LF = '\n';
    static EOF = -1;
    static ls = os.EOL;

    static tErr = 0;      // error codes
    static altErr = 1;
    static syncErr = 2;

    public usingPos: Position; // "using" definitions from the attributed grammar

    errorNr: number;       // highest parser error number
    curSy: Symbol;      // symbol whose production is currently generated
    private fram: number;  // parser frame input     /* pdt */
    protected gen: number; // generated parser file  /* pdt */
    err: string = "";  // generated parser error messages
    srcName: string;    // name of attributed grammar file
    srcDir: string;     // directory of attributed grammar file
    symSet = [];

    tab: Tab;           // other Coco objects
    trace: Trace;
    errors: Errors;
    buffer: Buffer;

    // --------------------------------------------------------------------------

    Indent(n: number) {
        fs.writeSync(this.gen, this.IndentString(n));
    }

    IndentString(n: number) {
        let retVal = ""
        for (let i = 1; i <= n; i++)
            retVal += '\t';
        return retVal
    }

    Overlaps(s1: BitSet, s2: BitSet): boolean {
        let len = s1.toArray().length;
        for (let i = 0; i < len; ++i) {
            if (s1.get(i) && s2.get(i)) {
                return true;
            }
        }
        return false;
    }

// AW: use a switch if more than 5 alternatives and none starts with a resolver, no LL1 warning
    UseSwitch(p: Node_): boolean {
        let s1, s2: BitSet;
        if (p.typ != Node_.alt) return false;
        let nAlts = 0;
        s1 = new BitSet();
        while (p != undefined) {
            s2 = this.tab.Expected0(p.sub, this.curSy);
            // must not optimize with switch statement, if there are ll1 warnings
            if (this.Overlaps(s1, s2)) {
                return false;
            }
            s1 = s1.or(s2);
            ++nAlts;
            // must not optimize with switch-statement, if alt uses a resolver expression
            if (p.sub.typ == Node_.rslv) return false;
            p = p.down;
        }
        return nAlts > 5;
    }

    CopySourcePart(pos: Position, indent: number) {
        // Copy text described by pos from atg to gen
        let ch, i: number;
        if (pos != undefined) {
            this.buffer.setPos(pos.beg);
            ch = this.buffer.Read();
            fs.writeSync(this.gen, this.IndentString(indent));

            done: while (this.buffer.getPos() <= pos.end) {
                while (ch == ParserGen.CR || ch == ParserGen.LF) {  // eol is either CR or CRLF or LF
                    fs.writeSync(this.gen, "\n" + this.IndentString(indent));
                    if (ch == ParserGen.CR) {
                        ch = this.buffer.Read();
                    }  // skip CR
                    if (ch == ParserGen.LF) {
                        ch = this.buffer.Read();
                    }  // skip LF
                    for (i = 1; i <= pos.col && ch <= ' '; i++) {
                        // skip blanks at beginning of line
                        ch = this.buffer.Read();
                    }
                    if (this.buffer.getPos() > pos.end) break done;
                }
                fs.writeSync(this.gen, String.fromCharCode(ch));
                ch = this.buffer.Read();
            }
            if (indent > 0)
                fs.writeSync(this.gen, "\n");
        }

    }


    GetSourceString(pos: Position, indent: number): string {
        // Copy text described by pos from atg to returned string
        // used for processing of these strings
        let ch, i: number;
        let retVal = "";
        if (pos != undefined) {
            this.buffer.setPos(pos.beg);
            ch = this.buffer.Read();
            retVal += this.IndentString(indent);
            done: while (this.buffer.getPos() <= pos.end) {
                while (ch == ParserGen.CR || ch == ParserGen.LF) {  // eol is either CR or CRLF or LF
                    retVal += "\n";
                    retVal += this.IndentString(indent);
                    if (ch == ParserGen.CR) {
                        ch = this.buffer.Read();
                    }  // skip CR
                    if (ch == ParserGen.LF) {
                        ch = this.buffer.Read();
                    }  // skip LF
                    for (i = 1; i <= pos.col && ch <= ' '; i++) {
                        // skip blanks at beginning of line
                        ch = this.buffer.Read();
                    }
                    if (this.buffer.getPos() > pos.end) break done;
                }
                retVal += String.fromCharCode(ch);
                ch = this.buffer.Read();
            }
            if (indent > 0)
                retVal += "\n";
        }
        return retVal
    }

    GenErrorMsg(errTyp: number, sym: Symbol) {
        this.errorNr++;
        this.err += ParserGen.ls + "\t\t\tcase " + this.errorNr + ": s = \"";
        switch (errTyp) {
            case ParserGen.tErr:
                if (sym.name.charAt(0) == '"') this.err += this.tab.Escape(sym.name) + " expected";
                else this.err += sym.name + " expected";
                break;
            case ParserGen.altErr:
                this.err += "invalid " + sym.name;
                break;
            case ParserGen.syncErr:
                this.err += "this symbol not expected in " + sym.name;
                break;
        }
        this.err += "\"; break;";
    }

    NewCondSet(s: BitSet): number {
        for (let i = 1; i < this.symSet.length; i++) // skip symSet[0] (reserved for union of SYNC sets)
            if (Sets.Equals(s, this.symSet[i])) return i;
        this.symSet.push(s.clone());
        return this.symSet.length - 1;
    }

    GenCond(s: BitSet, p: Node_) {
        if (p.typ == Node_.rslv) this.CopySourcePart(p.pos, 0);
        else {
            let n = Sets.Elements(s);
            if (n == 0) fs.writeSync(this.gen, "false"); // happens if an ANY set matches no symbol
            else if (n <= ParserGen.maxTerm) {
                for (let i = 0; i < this.tab.terminals.length; i++) {
                    let sym = this.tab.terminals[i];
                    if (s.get(sym.n)) {
                        fs.writeSync(this.gen, "this.isLaTokenKindEqualTo(" + sym.n + ")");
                        --n;
                        if (n > 0) fs.writeSync(this.gen, " || ");
                    }
                }
            } else
                fs.writeSync(this.gen, "this.StartOf(" + this.NewCondSet(s) + ")");
        }
    }

    PutCaseLabels(s: BitSet) {
        for (let i = 0; i < this.tab.terminals.length; i++) {
            let sym = this.tab.terminals[i];
            if (s.get(sym.n)) fs.writeSync(this.gen, "case " + sym.n + ": ");
        }
    }

    GenCode(p: Node_, indent: number, isChecked: BitSet) {
        let p2: Node_;
        let s1, s2: BitSet;
        while (p != undefined) {
            switch (p.typ) {
                case Node_.nt: {
                    this.Indent(indent);
                    if (p.retVar != undefined)
                        fs.writeSync(this.gen, p.retVar + " = ");
                    fs.writeSync(this.gen, "this." + p.sym.name + "(");
                    this.CopySourcePart(p.pos, 0);
                    fs.writeSync(this.gen, ");\n");
                    break;
                }
                case Node_.t: {
                    this.Indent(indent);
                    // assert: if isChecked[p.sym.n] is true, then isChecked contains only p.sym.n
                    if (isChecked.get(p.sym.n))
                        fs.writeSync(this.gen, "this.Get();\n");
                    else
                        fs.writeSync(this.gen, "this.Expect(" + p.sym.n + ");\n");
                    break;
                }
                case Node_.wt: {
                    this.Indent(indent);
                    s1 = this.tab.Expected(p.next, this.curSy);
                    s1 = s1.or(this.tab.allSyncSets);
                    fs.writeSync(this.gen, "this.ExpectWeak(" + p.sym.n + ", " + this.NewCondSet(s1) + ");\n");
                    break;
                }
                case Node_.any: {
                    this.Indent(indent);
                    let acc = Sets.Elements(p.set);
                    if (this.tab.terminals.length == (acc + 1) || (acc > 0 && Sets.Equals(p.set, isChecked))) {
                        // either this ANY accepts any terminal (the + 1 = end of file), or exactly what's allowed here
                        fs.writeSync(this.gen, "this.Get();\n");
                    } else {
                        this.GenErrorMsg(ParserGen.altErr, this.curSy);
                        if (acc > 0) {
                            // fs.writeSync(this.gen, "//@ts-ignore\n");
                            // this.Indent(indent);
                            fs.writeSync(this.gen, "if (");
                            this.GenCond(p.set, p);
                            fs.writeSync(this.gen, ") this.Get(); else this.SynErr(" + this.errorNr + ");\n");
                        } else fs.writeSync(this.gen, "this.SynErr(" + this.errorNr + "); // ANY node that matches no symbol\n");
                    }
                    break;
                }
                case Node_.eps:
                    break;  // nothing
                case Node_.rslv:
                    break; // nothing
                case Node_.sem: {
                    this.CopySourcePart(p.pos, indent);
                    break;
                }
                case Node_.sync:
                    this.GenErrorMsg(ParserGen.syncErr, this.curSy);
                    s1 = p.set.clone();
                    this.Indent(indent);
                    // fs.writeSync(this.gen, "//@ts-ignore\n");
                    // this.Indent(indent);
                    fs.writeSync(this.gen, "while (!(");
                    this.GenCond(s1, p);
                    fs.writeSync(this.gen, ")) {");
                    fs.writeSync(this.gen, "this.SynErr(" + this.errorNr + "); this.Get();");
                    fs.writeSync(this.gen, "}\n");
                    break;

                case Node_.alt: {
                    s1 = this.tab.First(p);
                    let equal = Sets.Equals(s1, isChecked);
                    let useSwitch = this.UseSwitch(p);
                    if (useSwitch) {
                        this.Indent(indent);
                        fs.writeSync(this.gen, "switch (this.la.kind) {\n");
                    }
                    p2 = p;
                    while (p2 != undefined) {
                        s1 = this.tab.Expected(p2.sub, this.curSy);
                        this.Indent(indent);
                        if (useSwitch) {
                            this.PutCaseLabels(s1);
                            fs.writeSync(this.gen, "{\n");
                        } else if (p2 == p) {
                            // fs.writeSync(this.gen, "//@ts-ignore\n");
                            // this.Indent(indent);
                            fs.writeSync(this.gen, "if (");
                            this.GenCond(s1, p2.sub);
                            fs.writeSync(this.gen, ") {\n");
                        } else if (p2.down == undefined && equal) {
                            fs.writeSync(this.gen, "} else {\n");
                        } else {
                            // fs.writeSync(this.gen, "//@ts-ignore\n");
                            // this.Indent(indent);
                            fs.writeSync(this.gen, "} else if (");
                            this.GenCond(s1, p2.sub);
                            fs.writeSync(this.gen, ") {\n");
                        }
                        this.GenCode(p2.sub, indent + 1, s1);
                        if (useSwitch) {
                            this.Indent(indent);
                            fs.writeSync(this.gen, "\tbreak;\n");
                            this.Indent(indent);
                            fs.writeSync(this.gen, "}\n");
                        }
                        p2 = p2.down;
                    }
                    this.Indent(indent);
                    if (equal) {
                        fs.writeSync(this.gen, "}\n");
                    } else {
                        this.GenErrorMsg(ParserGen.altErr, this.curSy);
                        if (useSwitch) {
                            fs.writeSync(this.gen, "default: this.SynErr(" + this.errorNr + "); break;\n");
                            this.Indent(indent);
                            fs.writeSync(this.gen, "}\n");
                        } else {
                            fs.writeSync(this.gen, "} ");
                            fs.writeSync(this.gen, "else this.SynErr(" + this.errorNr + ");\n");
                        }
                    }
                    break;
                }
                case Node_.iter: {
                    p2 = p.sub;
                    // this.Indent(indent);
                    // fs.writeSync(this.gen, "//@ts-ignore\n");
                    this.Indent(indent);
                    fs.writeSync(this.gen, "while (");
                    if (p2.typ == Node_.wt) {
                        s1 = this.tab.Expected(p2.next, this.curSy);
                        s2 = this.tab.Expected(p.next, this.curSy);
                        fs.writeSync(this.gen, "this.WeakSeparator(" + p2.sym.n + "," + this.NewCondSet(s1) + ","
                            + this.NewCondSet(s2) + ") ");
                        s1 = new BitSet();  // for inner structure
                        if (p2.up || p2.next == undefined) p2 = undefined; else p2 = p2.next;
                    } else {
                        s1 = this.tab.First(p2);
                        this.GenCond(s1, p2);
                    }
                    fs.writeSync(this.gen, ") {\n");
                    this.GenCode(p2, indent + 1, s1);
                    this.Indent(indent);
                    fs.writeSync(this.gen, "}\n");
                    break;
                }
                case Node_.opt:
                    s1 = this.tab.First(p.sub);
                    // this.Indent(indent);
                    // fs.writeSync(this.gen, "//@ts-ignore\n");
                    // this.Indent(indent);
                    fs.writeSync(this.gen, "if (");
                    this.GenCond(s1, p.sub);
                    fs.writeSync(this.gen, ") {\n");
                    this.GenCode(p.sub, indent + 1, s1);
                    this.Indent(indent);
                    fs.writeSync(this.gen, "}\n");
                    break;
            }
            if (p.typ != Node_.eps && p.typ != Node_.sem && p.typ != Node_.sync) {
                isChecked = new BitSet();  // = new BitArray(Symbol.terminals.Count);
            }
            if (p.up)
                break;
            p = p.next;
        }
    }

    GenTokens() {
        //foreach (Symbol sym in Symbol.terminals) {
        for (let i = 0; i < this.tab.terminals.length; i++) {
            let sym = this.tab.terminals[i];
            //in latin and other capitalizeable scripts the first part hits, in the non-ascii scripts the second part hits
            if (sym.name.charAt(0).toUpperCase() != sym.name.charAt(0).toLowerCase() || sym.name.charAt(0).codePointAt(0) > 127)
                // if (Character.isLetter(sym.name.charAt(0)))
                fs.writeSync(this.gen, "\tpublic static _" + sym.name + ":number = " + sym.n + ";\n");
        }
    }

    GenPragmas() {
        for (let i = 0; i < this.tab.pragmas.length; i++) {
            let sym = this.tab.pragmas[i];
            fs.writeSync(this.gen, "\tpublic static _" + sym.name + ":number = " + sym.n + ";\n");
        }
    }

    GenCodePragmas() {
        //foreach (Symbol sym in Symbol.pragmas) {
        for (let i = 0; i < this.tab.pragmas.length; i++) {
            let sym = this.tab.pragmas[i];

            // fs.writeSync(this.gen, "\t\t\t//@ts-ignore \n");
            fs.writeSync(this.gen, "\t\t\tif (this.isLaTokenKindEqualTo(" + sym.n + ")) {\n");
            this.CopySourcePart(sym.semPos, 4);
            fs.writeSync(this.gen, "\t\t\t}");
        }
    }

    GenProductions() {
        for (let i = 0; i < this.tab.nonterminals.length; i++) {
            let sym = this.tab.nonterminals[i];
            this.curSy = sym;
            fs.writeSync(this.gen, "\t");
            fs.writeSync(this.gen, sym.name + "(");
            if (sym.attrPos != undefined) {
                this.CopySourcePart(sym.attrPos, 0);
            }
            fs.writeSync(this.gen, ")");
            if (sym.retType != undefined)
                fs.writeSync(this.gen, ":" + sym.retType);
            fs.writeSync(this.gen, " {\n");
            if (sym.retVar != undefined)
                fs.writeSync(this.gen, "\t\tlet " + sym.retVar + ":" + sym.retType + ";\n");
            this.CopySourcePart(sym.semPos, 2);
            this.GenCode(sym.graph, 2, new BitSet());
            if (sym.retVar != undefined)
                fs.writeSync(this.gen, "\t\treturn " + sym.retVar + ";\n");
            fs.writeSync(this.gen, "\t}\n");
            fs.writeSync(this.gen, "\n");
        }
    }

    InitSets() {
        for (let i = 0; i < this.symSet.length; i++) {
            let s = this.symSet[i];
            fs.writeSync(this.gen, "\t\t[");
            let j = 0;
            //foreach (Symbol sym in Symbol.terminals) {
            for (let k = 0; k < this.tab.terminals.length; k++) {
                let sym = this.tab.terminals[k];
                //TODO: make static classname "Parser" dynamic
                if (s.get(sym.n))
                    fs.writeSync(this.gen, "Parser._T,");
                else
                    fs.writeSync(this.gen, "Parser._x,");
                ++j;
                if (j % 4 == 0)
                    fs.writeSync(this.gen, " ");
            }
            if (i == this.symSet.length - 1)
                fs.writeSync(this.gen, "Parser._x]\n");
            else
                fs.writeSync(this.gen, "Parser._x],\n");
        }
    }

    public WriteParser() {
        let g = new Generator(this.tab);
        let oldPos = this.buffer.getPos();  // Buffer.pos is modified by CopySourcePart
        this.symSet.push(this.tab.allSyncSets);

        this.fram = g.OpenFrame("Parser.frame");
        this.gen = g.OpenGen("Parser.ts");
        //foreach (Symbol sym in Symbol.terminals)
        for (let i = 0; i < this.tab.terminals.length; i++) {
            let sym = this.tab.terminals[i];
            this.GenErrorMsg(ParserGen.tErr, sym);
        }

        this.OnWriteParserInitializationDone();

        g.GenCopyright();
        g.SkipFramePart("-->begin");

        if (this.tab.nsName != undefined && this.tab.nsName.length > 0) {
            fs.writeSync(this.gen, "package ");
            fs.writeSync(this.gen, this.tab.nsName);
            fs.writeSync(this.gen, ";");
        }
        if (this.usingPos != undefined) {

            fs.writeSync(this.gen, "\n");

            fs.writeSync(this.gen, "\n");
            this.CopySourcePart(this.usingPos, 0);
        }
        g.CopyFramePart("-->constants");
        this.GenTokens();
        fs.writeSync(this.gen, "\tpublic static maxT:number = " + (this.tab.terminals.length - 1) + ";\n");
        this.GenPragmas();
        g.CopyFramePart("-->declarations");
        this.CopySourcePart(this.tab.semDeclPos, 0);
        g.CopyFramePart("-->pragmas");
        this.GenCodePragmas();
        g.CopyFramePart("-->productions");
        this.GenProductions();
        g.CopyFramePart("-->parseRoot");
        fs.writeSync(this.gen, "\t\tthis." + this.tab.gramSy.name + "();\n");
        if (this.tab.checkEOF) fs.writeSync(this.gen, "\t\tthis.Expect(0);\n");
        g.CopyFramePart("-->initialization");
        this.InitSets();
        g.CopyFramePart("-->errors");
        fs.writeSync(this.gen, this.err);
        g.CopyFramePart(undefined);
        // this.gen.close();
        fs.close(this.gen, function () {
        })
        this.buffer.setPos(oldPos);
    }

// Override this method if you need to replace anything before the parser is written.
// This can be used by plugins to catch the generated parser, e.g., this is used by the
// Eclipse Plugin of the Institue for System Software.
    protected OnWriteParserInitializationDone() {
        // nothing to do
    }

    public WriteStatistics() {
        this.trace.WriteLine();
        this.trace.WriteLine(this.tab.terminals.length + " terminals");
        this.trace.WriteLine(this.tab.terminals.length + this.tab.pragmas.length +
            this.tab.nonterminals.length + " symbols");
        this.trace.WriteLine(this.tab.nodes.length + " nodes");
        this.trace.WriteLine(this.symSet.length + " sets");
    }

    constructor(parser: Parser) {
        this.tab = parser.tab;
        this.errors = parser.errors;
        this.trace = parser.trace;
        this.buffer = parser.scanner.buffer;
        this.errorNr = -1;
        this.usingPos = undefined;
    }

}
