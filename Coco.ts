/*-------------------------------------------------------------------------
Compiler Generator Coco/R,
Copyright (c) 1990, 2004 Hanspeter Moessenboeck, University of Linz
extended by M. Loeberbauer & A. Woess, Univ. of Linz
ported from C# to Java by Wolfgang Ahorner
with improvements by Pat Terry, Rhodes University

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
-------------------------------------------------------------------------*/
/*-------------------------------------------------------------------------
  Trace output options
  0 | A: prints the states of the scanner automaton
  1 | F: prints the First and Follow sets of all nonterminals
  2 | G: prints the syntax graph of the productions
  3 | I: traces the computation of the First sets
  4 | J: prints the sets associated with ANYs and synchronisation sets
  6 | S: prints the symbol table (terminals, nonterminals, pragmas)
  7 | X: prints a cross reference list of all syntax symbols
  8 | P: prints statistics about the Coco run

  Trace output can be switched on by the pragma
    $ { digit | letter }
  in the attributed grammar or as a command-line option
  -------------------------------------------------------------------------*/


import { Tab} from "./Tab";
import {DFA} from "./DFA";
import {Trace} from "./Trace";
import {ParserGen} from "./ParserGen";
import {Parser} from "./Parser";
import {Scanner} from "./Scanner";



function main() {
    console.log("Coco/R (Apr 15, 2013)");
    let srcName = null, nsName = null, frameDir = null, ddtString = null, outDir = null;
    let retVal = 1;
    for (let i = 0; i < process.argv.length; i++) {
        if (process.argv[i].equals("-package") && i < process.argv.length - 1) nsName = process.argv[++i].trim();
        else if (process.argv[i].equals("-frames") && i < process.argv.length - 1) frameDir = process.argv[++i].trim();
        else if (process.argv[i].equals("-trace") && i < process.argv.length - 1) ddtString = process.argv[++i].trim();
        else if (process.argv[i].equals("-o") && i < process.argv.length - 1) outDir = process.argv[++i].trim();
        else srcName = process.argv[i];
    }
    if (process.argv.length > 0 && srcName != null) {
        try {
            let srcDir = new File(srcName).getParent();

            let scanner = new Scanner(srcName);
            let parser = new Parser(scanner);

            parser.trace = new Trace(srcDir);
            parser.tab = new Tab(parser);
            parser.dfa = new DFA(parser);
            parser.pgen = new ParserGen(parser);

            parser.tab.srcName = srcName;
            parser.tab.srcDir = srcDir;
            parser.tab.nsName = nsName;
            parser.tab.frameDir = frameDir;
            parser.tab.outDir = (outDir != null) ? outDir : srcDir;
            if (ddtString != null) parser.tab.SetDDT(ddtString);

            parser.Parse();

            parser.trace.Close();
            console.log(parser.errors.count + " errors detected");
            if (parser.errors.count == 0) { retVal = 0; }
        } catch (e) {
            console.log(e.getMessage());
        }
    } else {
        console.log(
            "Usage: Coco Grammar.ATG {Option}\n" +
            "Options:\n" +
            "  -package <packageName>\n" +
            "  -frames  <frameFilesDirectory>\n" +
            "  -trace   <traceString>\n" +
            "  -o       <outputDirectory>\n" +
            "Valid characters in the trace string:\n" +
            "  A  trace automaton\n" +
            "  F  list first/follow sets\n" +
            "  G  print syntax graph\n" +
            "  I  trace computation of first sets\n" +
            "  J  list ANY and SYNC sets\n" +
            "  P  print statistics\n" +
            "  S  list symbol table\n" +
            "  X  list cross reference table\n" +
            "Scanner.frame and Parser.frame files needed in ATG directory\n" +
            "or in a directory specified in the -frames option.\n"
        );
    }
    process.exit(retVal);
}
// end Coco
