export class Trace {
    file: File;              /* pdt */
    w: PrintWriter;

    private CheckOpen() {
        if (this.w == null) {
            try {
                this.w = new PrintWriter(new BufferedWriter(new FileWriter(this.file, false))); /* pdt */
            } catch (e) {
                throw new Error("Could not open " + this.file.getPath());
            }
        }
    }

    constructor(dir: string) {
        this.file = new File(dir, "trace.txt"); /* pdt */
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
        this.w.print(s);
    }

    public WriteLine(s?: string, w?: number) {
        this.CheckOpen();
        if (s == undefined) {
            this.w.println();
        } else {
            if (w != undefined)
                s = this.formatString(s, w)
            this.w.println(s);
        }
    }

    public Close() { /* pdt */
        if (this.w != null) {
            this.w.close();
            console.log("trace output is in " + this.file.getPath());
        }
    }

}