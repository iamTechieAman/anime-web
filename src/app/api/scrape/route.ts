import { NextResponse } from "next/server";
import { fetchFromScraper } from "@/lib/scraper-client";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q');
        const aniwatchPage = searchParams.get('aniwatch_page');
        const cartoonQuery = searchParams.get('cartoon_query');
        const cartoonCategory = searchParams.get('cartoon_category');
        const waInfo = searchParams.get('wa_info')?.split(':').pop();
        const waSource = searchParams.get('wa_source')?.split(':').pop();

        if (!query && !aniwatchPage && !cartoonQuery && !cartoonCategory && !waInfo && !waSource) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
        }

        const data = await fetchFromScraper({
            query: query || undefined,
            aniwatch_page: aniwatchPage || undefined,
            cartoon_query: cartoonQuery || undefined,
            cartoon_category: cartoonCategory || undefined,
            wa_info: waInfo || undefined,
            wa_source: waSource || undefined
        });

        return NextResponse.json(data);

    } catch (error: any) {
        console.error("[Scrapling API] Error:", error.message);
        return NextResponse.json({ error: "Internal server error", detail: error.message }, { status: 500 });
    }
}
