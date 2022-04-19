import * as fs from "fs";
import * as path from "path";

export class Trace {
    file: string;              /* pdt */
    w: number;

    private CheckOpen() {
        if (this.w == null) {
            try {
                this.w = fs.openSync(this.file,"w") /* pdt */
            } catch (e) {
                throw new Error("Could not open " + this.file);
            }
        }
    }

    constructor(dir: string) {
        this.file = path.join(dir, "trace.txt"); /* pdt */
    }

// returns a string with a minimum length of |w| characters
// the string is left-adjusted if w < 0 and right-adjusted otherwise
    public formatString(s: string, w: number): string {
        let size = s.length;
        let b = "";
        if (w >= 0) {
            for (let i = 0; i < w - size; i++) b += " ";
            return (b.toString() + s);
        } else {
            for (let i = w; i < -size; i++) b += " ";
            return (s + b.toString());
        }
    }


    // writes a string with a minimum length of |w| characters
    public Write(s: string, w?: number) {
        if (w != undefined) {
            s = this.formatString(s, w)
        }
        this.CheckOpen();
        fs.writeSync(this.w, s);
    }

    public WriteLine(s?: string, w?: number) {
        this.CheckOpen();
        if (s == undefined) {
            fs.writeSync(this.w,"\n");
        } else {
            if (w != undefined)
                s = this.formatString(s, w)
            fs.writeSync(this.w,s+"\n");
        }
    }

    public Close() { /* pdt */
        if (this.w != null) {
            // this.w.close();
            fs.close(this.w)
            console.log("trace output is in " + this.file);
        }
    }

}