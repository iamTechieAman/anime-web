import { NextResponse } from "next/server";
import { fetchFromScraper } from "@/lib/scraper-client";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q');
        const category = searchParams.get('category') || 'cartoon';

        const data = await fetchFromScraper({
            cartoon_query: query || undefined,
            cartoon_category: !query ? category : undefined
        });

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
        console.error("[Cartoon API] Full Error:", error);
        return NextResponse.json({ 
            error: "Internal server error", 
            detail: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}
