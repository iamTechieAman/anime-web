import { NextResponse } from "next/server";
import axios from "axios";

const ANILIST_URL = 'https://graphql.anilist.co';
const TMDB_SEARCH_URL = 'https://api.themoviedb.org/3/search/multi';
const TMDB_API_KEY = process.env.TMDB_API_KEY || "522103f166160100778c1995804369a4"; // Fallback to provided key if missing

const ANILIST_QUERY = `
query($search: String) {
  Page(page: 1, perPage: 8) {
    media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
      id
      title { romaji english native }
      coverImage { extraLarge large medium }
      format
      seasonYear
      type
      averageScore
      synonyms
    }
  }
}
`;

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms))
    ]);
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const rawQuery = searchParams.get('q') || searchParams.get('query') || '';
    const query = rawQuery.trim();

    if (!query || query.length < 2) {
        return NextResponse.json({ results: [] });
    }

    try {
        const [anilistRes, tmdbRes] = await Promise.allSettled([
            withTimeout(
                fetch(ANILIST_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: ANILIST_QUERY, variables: { search: query } }),
                    next: { revalidate: 3600 }
                }),
                3000
            ).then(res => res.json()),
            withTimeout(
                fetch(`${TMDB_SEARCH_URL}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=en-US&page=1&include_adult=false`, { next: { revalidate: 3600 } }),
                3000
            ).then(res => res.json())
        ]);

        const results: any[] = [];

        // Process AniList Results
        if (anilistRes.status === 'fulfilled') {
            const anime = anilistRes.value.data?.Page?.media || [];
            anime.forEach((item: any) => {
                results.push({
                    id: item.id,
                    title: item.title.english || item.title.romaji,
                    altTitles: [item.title.english, item.title.romaji, item.title.native, ...(item.synonyms || [])].filter(Boolean),
                    image: item.coverImage?.extraLarge || item.coverImage?.large || item.coverImage?.medium || "",
                    type: 'anime',
                    year: item.seasonYear,
                    format: item.format,
                    href: `/watch/anime/${item.id}`,
                    rating: item.averageScore ? (item.averageScore / 10).toFixed(1) : null
                });
            });
        }

        // Process TMDB Results
        if (tmdbRes.status === 'fulfilled') {
            const movies = tmdbRes.value.results || [];
            movies.slice(0, 10).forEach((item: any) => {
                if (item.media_type === 'person') return;
                
                results.push({
                    id: item.id,
                    title: item.title || item.name,
                    image: item.poster_path ? `https://image.tmdb.org/t/p/w200${item.poster_path}` : null,
                    type: item.media_type === 'movie' ? 'movie' : 'tv',
                    year: (item.release_date || item.first_air_date || '').split('-')[0],
                    format: item.media_type.toUpperCase(),
                    href: `/watch/${item.media_type}/${item.id}`,
                    rating: item.vote_average ? item.vote_average.toFixed(1) : null
                });
            });
        }

        // Sort by relevance (Normalized Title distance)
        const sortedResults = results.sort((a, b) => {
            const aTitle = (a.title || "").toLowerCase();
            const bTitle = (b.title || "").toLowerCase();
            const q = query.toLowerCase();
            
            // Exact match priority (primary title)
            const aExact = aTitle === q;
            const bExact = bTitle === q;
            if (aExact && !bExact) return -1;
            if (bExact && !aExact) return 1;

            // Exact match priority (alternative titles / Japanese / synonyms)
            const aAltExact = a.altTitles?.some((t: string) => t.toLowerCase() === q);
            const bAltExact = b.altTitles?.some((t: string) => t.toLowerCase() === q);
            if (aAltExact && !bAltExact) return -1;
            if (bAltExact && !aAltExact) return 1;

            // Starts with match priority (primary title)
            const aStarts = aTitle.startsWith(q);
            const bStarts = bTitle.startsWith(q);
            if (aStarts && !bStarts) return -1;
            if (bStarts && !aStarts) return 1;

            // Starts with match priority (alternative titles / Japanese / synonyms)
            const aAltStarts = a.altTitles?.some((t: string) => t.toLowerCase().startsWith(q));
            const bAltStarts = b.altTitles?.some((t: string) => t.toLowerCase().startsWith(q));
            if (aAltStarts && !bAltStarts) return -1;
            if (bAltStarts && !aAltStarts) return 1;

            // Includes match priority (primary title)
            const aIncludes = aTitle.includes(q);
            const bIncludes = bTitle.includes(q);
            if (aIncludes && !bIncludes) return -1;
            if (bIncludes && !aIncludes) return 1;

            // Includes match priority (alternative titles / Japanese / synonyms)
            const aAltIncludes = a.altTitles?.some((t: string) => t.toLowerCase().includes(q));
            const bAltIncludes = b.altTitles?.some((t: string) => t.toLowerCase().includes(q));
            if (aAltIncludes && !bAltIncludes) return -1;
            if (bAltIncludes && !aAltIncludes) return 1;

            return 0;
        });

        return NextResponse.json({ results: sortedResults.slice(0, 10) });

    } catch (error: any) {
        console.error("[UnifiedSearch] Error:", error.message);
        return NextResponse.json({ error: "Failed to fetch results", results: [] }, { status: 500 });
    }
}
