import { NextResponse } from "next/server";
import { getProvider } from "@/lib/providers";

export async function GET() {
    try {
        const hianime = getProvider('hianime');
        const anikai = getProvider('anikai');
        const consumet = getProvider('consumet');

        // Parallelize fetching with a total timeout
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Timeout")), 8000)
        );

        const fetchHome = async () => {
            try {
                // Try Anikai first (verified working scraper — anikai.to)
                const homeData = await anikai.getHome?.() ?? { trending: [], latest: [], slides: [], completed: [], upcoming: [] };
                const { trending, latest, slides } = homeData;
                if (trending.length > 0 || latest.length > 0) {
                    return { trending, latest, slides: slides || [] };
                }
            } catch (e) {
                console.warn("[AnimeHome] Anikai getHome failed, trying HiAnime:", e);
            }

            try {
                // Try HiAnime as fallback
                const [trending, latest] = await Promise.all([
                    hianime.getTrending?.() ?? Promise.resolve([]),
                    hianime.getRecent?.() ?? Promise.resolve([])
                ]);

                if (trending.length > 0 || latest.length > 0) {
                    return { trending, latest, slides: [] };
                }
            } catch (e) {
                console.warn("[AnimeHome] HiAnime failed, trying Consumet:", e);
            }

            try {
                // Try Consumet (API-based)
                const [trending, latest] = await Promise.all([
                    consumet.getTrending?.() ?? Promise.resolve([]),
                    consumet.getRecent?.() ?? Promise.resolve([])
                ]);

                if (trending.length > 0 || latest.length > 0) {
                    return { trending, latest, slides: [] };
                }
            } catch (e) {
                console.warn("[AnimeHome] Consumet failed, trying Anikai fallback methods:", e);
            }

            try {
                // Anikai getTrending + getRecent fallback
                const [trending, latest] = await Promise.all([
                    anikai.getTrending?.() ?? Promise.resolve([]),
                    anikai.getRecent?.() ?? Promise.resolve([])
                ]);
                return { trending, latest, slides: [] };
            } catch (e) {
                console.error("[AnimeHome] All providers failed:", e);
                return { trending: [], latest: [], slides: [] };
            }
        };


        const result: any = await Promise.race([fetchHome(), timeoutPromise]);

        return NextResponse.json(result, {
            headers: {
                'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
            }
        });
    } catch (error: any) {
        console.error("[AnimeHome] Critical Failure:", error.message);
        return NextResponse.json({ trending: [], latest: [] }, { status: 200 });
    }
}

