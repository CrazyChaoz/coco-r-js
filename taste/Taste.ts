import {Scanner} from "./Scanner";
import {Parser} from "./Parser";
import {CodeGenerator, SymbolTable} from "./TasteClasses";

if (process.argv.length > 0) {
    let scanner = new Scanner(process.argv[2]);
    let parser = new Parser(scanner);
    parser.tab = new SymbolTable(parser);
    parser.gen = new CodeGenerator();
    parser.Parse();
    if (parser.errors.count == 0) {
        parser.gen.Decode();
        parser.gen.Interpret("taste/Taste.IN");
    }
} else
    console.log("-- No source file specified");