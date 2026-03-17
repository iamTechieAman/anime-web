import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execPromise = promisify(exec);

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q');
        const category = searchParams.get('category') || 'cartoon';

        const scriptPath = path.join(process.cwd(), "src/lib/python/scrapling_sync.py");
        let command = `python3 "${scriptPath}"`;
        
        if (query) {
            command += ` --cartoon_query "${query.replace(/"/g, '\\"')}"`;
        } else {
            command += ` --cartoon_category "${category.replace(/"/g, '\\"')}"`;
        }

        const { stdout, stderr } = await execPromise(command);

        if (stderr && !stdout) {
            console.error("[Cartoon API] Stderr:", stderr);
            return NextResponse.json({ error: "Scraping failed", detail: stderr }, { status: 500 });
        }

        const data = JSON.parse(stdout);
        return NextResponse.json({
            shows: (data.watchanimeworld || []).map((item: any) => ({
                _id: item.id,
                name: item.title,
                thumbnail: item.image,
                type: item.type,
                provider: 'watchanimeworld',
                is_series: item.is_series
            }))
        });

    } catch (error: any) {
        console.error("[Cartoon API] Error:", error.message);
        return NextResponse.json({ error: "Internal server error", detail: error.message }, { status: 500 });
    }
}
