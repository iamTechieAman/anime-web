import { NextResponse } from "next/server";
import axios from "axios";
import { OnoflixProvider } from "@/lib/providers/onoflix";

const ANILIST_URL = 'https://graphql.anilist.co';
const TMDB_SEARCH_URL = 'https://api.themoviedb.org/3/search/multi';
const TMDB_API_KEY = process.env.TMDB_API_KEY || "522103f166160100778c1995804369a4"; // Fallback to provided key if missing

const ANILIST_QUERY = `
query($search: String) {
  Page(page: 1, perPage: 5) {
    media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
      id
      title { romaji english native }
      coverImage { medium }
      format
      seasonYear
      type
    }
  }
}
`;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const rawQuery = searchParams.get('q') || searchParams.get('query') || '';
    const query = rawQuery
        .replace(/[-_.,/:;()]/g, ' ') // Replace separators with space
        .replace(/([a-z])([A-Z])/g, '$1 $2') // Split camelCase (e.g., DemonSlayer -> Demon Slayer)
        .replace(/\s+/g, ' ') // Collapse multiple spaces
        .trim();

    if (!query || query.length < 2) {
        return NextResponse.json({ results: [] });
    }

    try {
        const [anilistRes, tmdbRes, onoflixResults] = await Promise.allSettled([
            axios.post(ANILIST_URL, {
                query: ANILIST_QUERY,
                variables: { search: query }
            }),
            axios.get(TMDB_SEARCH_URL, {
                params: {
                    api_key: TMDB_API_KEY,
                    query: query,
                    language: 'en-US',
                    page: 1,
                    include_adult: false
                }
            }),
            new OnoflixProvider().search(query)
        ]);

        const results: any[] = [];

        // Process AniList Results
        if (anilistRes.status === 'fulfilled') {
            const anime = anilistRes.value.data.data.Page.media || [];
            anime.forEach((item: any) => {
                results.push({
                    id: item.id,
                    title: item.title.english || item.title.romaji,
                    image: item.coverImage.medium,
                    type: 'anime',
                    year: item.seasonYear,
                    format: item.format,
                    href: `/watch/anime/${item.id}`
                });
            });
        }

        // Process TMDB Results
        if (tmdbRes.status === 'fulfilled') {
            const movies = tmdbRes.value.data.results || [];
            movies.slice(0, 10).forEach((item: any) => {
                if (item.media_type === 'person') return;
                
                results.push({
                    id: item.id,
                    title: item.title || item.name,
                    image: item.poster_path ? `https://image.tmdb.org/t/p/w200${item.poster_path}` : null,
                    type: item.media_type === 'movie' ? 'movie' : 'tv',
                    year: (item.release_date || item.first_air_date || '').split('-')[0],
                    format: item.media_type.toUpperCase(),
                    href: `/watch/${item.media_type}/${item.id}`
                });
            });
        }

        // Process Onoflix Results
        if (onoflixResults.status === 'fulfilled') {
            onoflixResults.value.slice(0, 5).forEach((item: any) => {
                const [type, realId] = item.id.includes('|') ? item.id.split('|') : ['movie', item.id];
                results.push({
                    ...item,
                    href: type === 'tv' 
                        ? `/watch/tv/${realId}?provider=onoflix`
                        : `/watch/movie/${realId}?provider=onoflix`
                });
            });
        }

        // Sort by relevance or just return merged (already limited)
        return NextResponse.json({ results: results.slice(0, 10) });

    } catch (error: any) {
        console.error("[UnifiedSearch] Error:", error.message);
        return NextResponse.json({ error: "Failed to fetch results", results: [] }, { status: 500 });
    }
}
