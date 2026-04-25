import { NextResponse } from "next/server";
import { getProvider } from "@/lib/providers";

export async function GET() {
    try {
        const provider = getProvider('aniwaves');
        if (!provider.getTrending || !provider.getRecent) {
            return NextResponse.json({ error: "Provider not fully implemented" }, { status: 400 });
        }

        const [trending, latest] = await Promise.all([
            provider.getTrending(),
            provider.getRecent()
        ]);

        return NextResponse.json({ trending, latest }, {
            headers: {
                'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
            }
        });
    } catch (error: any) {
        console.error("[AnimeHome] Failed:", error.message);
        return NextResponse.json({ error: "Failed to fetch anime home", trending: [], latest: [] }, { status: 200 });
    }
}
