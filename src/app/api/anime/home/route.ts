import { NextResponse } from "next/server";

export const revalidate = 3600; // Cache for 1 hour

export async function GET() {
    try {
        const query = `
        query {
          trending: Page(page: 1, perPage: 20) {
            media(sort: POPULARITY_DESC, type: ANIME, isAdult: false) {
              id
              title { english romaji }
              coverImage { extraLarge large }
            }
          }
          latest: Page(page: 1, perPage: 20) {
            media(sort: TRENDING_DESC, type: ANIME, status: RELEASING, isAdult: false) {
              id
              title { english romaji }
              coverImage { extraLarge large }
            }
          }
        }
        `;

        const res = await fetch("https://graphql.anilist.co", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            body: JSON.stringify({ query }),
            next: { revalidate: 3600 }
        });

        const data = await res.json();
        
        if (!data?.data) {
            throw new Error("Invalid AniList response");
        }

        const mapAniListToStandard = (item: any) => ({
            id: String(item.id),
            title: item.title.english || item.title.romaji,
            image: item.coverImage.extraLarge || item.coverImage.large,
            type: "anime"
        });

        const trending = data.data.trending.media.map(mapAniListToStandard);
        const latest = data.data.latest.media.map(mapAniListToStandard);

        console.log(`[AnimeHome] Successfully fetched from AniList (Trending: ${trending.length}, Latest: ${latest.length})`);

        return NextResponse.json({ trending, latest, slides: [] }, {
            headers: {
                'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
            }
        });
    } catch (error: any) {
        console.error("[AnimeHome] Critical Failure:", error.message);
        return NextResponse.json({ trending: [], latest: [], slides: [] }, { status: 200 });
    }
}
