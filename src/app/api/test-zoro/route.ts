
import { NextResponse } from "next/server";
import { HiAnimeProvider } from "@/lib/providers/hianime";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || "Re:Zero";

    const provider = new HiAnimeProvider();

    try {
        // 1. Search
        console.log(`Searching for: ${query}`);
        const searchResults = await provider.search(query);
        if (searchResults.length === 0) return NextResponse.json({ error: "No results found" });

        const firstResult = searchResults[0];
        console.log(`Found: ${firstResult.title} (${firstResult.id})`);

        // 2. Get Info (Episodes)
        const info = await provider.getInfo(firstResult.id);
        const firstEp = info.episodes[0];
        if (!firstEp) return NextResponse.json({ error: "No episodes found" });

        console.log(`First Episode: ${firstEp.id}`);

        // 3. Get Sources
        const sources = await provider.getSources(firstResult.id, firstEp.id, "sub");

        return NextResponse.json({
            step1_search: firstResult,
            step2_info: { totalEps: info.totalEpisodes, firstEpId: firstEp.id },
            step3_sources: sources
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
    }
}
