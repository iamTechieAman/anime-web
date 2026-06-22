import { NextResponse } from "next/server";

export const revalidate = 3600;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");
    const genre = searchParams.get("genre");
    const status = searchParams.get("status");
    const format = searchParams.get("format");
    const page = parseInt(searchParams.get("page") || "1");

    if (!query && !genre && !status && !format) {
        return NextResponse.json({ shows: [] });
    }

    try {
        let graphqlQuery = `
            query($page: Int, $perPage: Int, $search: String, $genre: String, $status: MediaStatus, $format: MediaFormat) {
                Page(page: $page, perPage: $perPage) {
                    media(search: $search, genre: $genre, status: $status, format: $format, type: ANIME, isAdult: false, sort: [POPULARITY_DESC]) {
                        id
                        title { english romaji native }
                        coverImage { extraLarge large }
                        episodes
                        status
                        format
                    }
                }
            }
        `;

        const variables: any = {
            page: page,
            perPage: 20
        };

        if (query) variables.search = query;
        if (genre) variables.genre = genre;
        if (status) {
            const sMap: any = { "ongoing": "RELEASING", "completed": "FINISHED" };
            variables.status = sMap[status.toLowerCase()] || status.toUpperCase();
        }
        if (format) {
            variables.format = format.toUpperCase();
        }

        const res = await fetch("https://graphql.anilist.co", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            body: JSON.stringify({ query: graphqlQuery, variables }),
            next: { revalidate: 3600 }
        });

        const data = await res.json();

        if (!data?.data?.Page?.media) {
            return NextResponse.json({ shows: [] });
        }

        const shows = data.data.Page.media.map((item: any) => ({
            _id: String(item.id),
            name: item.title.english || item.title.romaji || item.title.native,
            thumbnail: item.coverImage?.extraLarge || item.coverImage?.large || "",
            availableEpisodes: { sub: item.episodes || 0, dub: 0 },
            provider: "anilist",
            __typename: "Show",
            type: "anime",
            status: item.status,
            format: item.format
        }));

        return NextResponse.json({ shows });

    } catch (err: any) {
        console.error("[AnimeSearch] AniList failed:", err.message);
        return NextResponse.json({ shows: [] }, { status: 500 });
    }
}
