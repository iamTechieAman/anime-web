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
        const jaQuery = searchParams.get('ja_query');
        const jaInfo = searchParams.get('ja_info')?.split(':').pop();
        const jaSource = searchParams.get('ja_source')?.split(':').pop();
        const axQuery = searchParams.get('ax_query');
        const axInfo = searchParams.get('ax_info')?.split(':').pop();
        const axSource = searchParams.get('ax_source')?.split(':').pop();
        const slug = searchParams.get('slug');

        if (!query && !aniwatchPage && !cartoonQuery && !cartoonCategory && !waInfo && !waSource && !jaQuery && !jaInfo && !jaSource && !axQuery && !axInfo && !axSource) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
        }

        const data = await fetchFromScraper({
            query: query || undefined,
            aniwatch_page: aniwatchPage || undefined,
            cartoon_query: cartoonQuery || undefined,
            cartoon_category: cartoonCategory || undefined,
            wa_info: waInfo || undefined,
            wa_source: waSource || undefined,
            ja_query: jaQuery || undefined,
            ja_info: jaInfo || undefined,
            ja_source: jaSource || undefined,
            ax_query: axQuery || undefined,
            ax_info: axInfo || undefined,
            ax_source: axSource || undefined,
            slug: slug || undefined
        });

        return NextResponse.json(data);

    } catch (error: any) {
        console.error("[Scrapling API] Error:", error.message);
        return NextResponse.json({ error: "Internal server error", detail: error.message }, { status: 500 });
    }
}
