import {Scanner} from "./Scanner.generated";
import {Parser} from "./Parser.generated";
import {CodeGenerator, SymbolTable} from "./TasteClasses";

if (process.argv.length > 0) {
    let scanner = new Scanner(process.argv[0]);
    let parser = new Parser(scanner);
    parser.tab = new SymbolTable(parser);
    parser.gen = new CodeGenerator();
    parser.Parse();
    if (parser.errors.count == 0) {
        parser.gen.Decode();
        parser.gen.Interpret("Taste.IN");
    }
} else
    console.log("-- No source file specified");