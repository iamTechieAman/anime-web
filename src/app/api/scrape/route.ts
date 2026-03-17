import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execPromise = promisify(exec);

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q');
        const aniwatchPage = searchParams.get('aniwatch_page');
        const cartoonQuery = searchParams.get('cartoon_query');
        const cartoonCategory = searchParams.get('cartoon_category');

        if (!query && !aniwatchPage && !cartoonQuery && !cartoonCategory) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
        }

        const scriptPath = path.join(process.cwd(), "src/lib/python/scrapling_sync.py");
        let command = `python3 "${scriptPath}"`;
        
        if (query) command += ` --query "${query.replace(/"/g, '\\"')}"`;
        if (aniwatchPage) command += ` --aniwatch_page ${aniwatchPage}`;
        if (cartoonQuery) command += ` --cartoon_query "${cartoonQuery.replace(/"/g, '\\"')}"`;
        if (cartoonCategory) command += ` --cartoon_category "${cartoonCategory.replace(/"/g, '\\"')}"`;

        const { stdout, stderr } = await execPromise(command);

        if (stderr && !stdout) {
            console.error("[Scrapling API] Stderr:", stderr);
            return NextResponse.json({ error: "Scraping failed", detail: stderr }, { status: 500 });
        }

        const data = JSON.parse(stdout);
        return NextResponse.json(data);

    } catch (error: any) {
        console.error("[Scrapling API] Error:", error.message);
        return NextResponse.json({ error: "Internal server error", detail: error.message }, { status: 500 });
    }
}
