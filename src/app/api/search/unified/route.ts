import { NextResponse } from "next/server";
import { TwoEmbedProvider } from "@/lib/providers/twoembed";
import {
    deduplicateCatalogItems,
    cleanBaseTitle,
    type UnifiedCatalogItem,
} from "@/lib/catalog/unified-normalizer";

const twoEmbed = new TwoEmbedProvider();
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
                } as RequestInit),
                3000
            ).then(res => res.json()),
            withTimeout(
                fetch(`${TMDB_SEARCH_URL}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=en-US&page=1&include_adult=false`, { next: { revalidate: 3600 } }),
                3000
            ).then(res => res.json())
        ]);

        const rawCatalogItems: UnifiedCatalogItem[] = [];

        // 1. Process AniList Anime Results (Verified Authoritative Anime Source)
        if (anilistRes.status === 'fulfilled') {
            const anime = anilistRes.value.data?.Page?.media || [];
            anime.forEach((item: any) => {
                const authoritativeTitle = item.title.english || item.title.romaji || item.title.native || 'Anime';
                rawCatalogItems.push({
                    id: String(item.id),
                    canonicalId: `anime:al:${item.id}`,
                    title: cleanBaseTitle(authoritativeTitle),
                    altTitles: [item.title.english, item.title.romaji, item.title.native, ...(item.synonyms || [])].filter(Boolean),
                    image: item.coverImage?.extraLarge || item.coverImage?.large || item.coverImage?.medium || "",
                    type: 'anime',
                    year: item.seasonYear ? String(item.seasonYear) : null,
                    format: item.format,
                    href: `/watch/anime/${item.id}`,
                    rating: item.averageScore ? (item.averageScore / 10).toFixed(1) : null,
                    provider: 'anilist',
                    anilist_id: item.id,
                });
            });
        }

        // 2. Process Primary TMDB Movie & TV Results
        let hasMovieOrTvResults = false;
        if (tmdbRes.status === 'fulfilled') {
            const movies = tmdbRes.value.results || [];
            movies.slice(0, 10).forEach((item: any) => {
                if (!item.media_type || item.media_type === 'person') return;
                
                const mediaType = item.media_type === 'movie' ? 'movie' : 'tv';
                hasMovieOrTvResults = true;
                rawCatalogItems.push({
                    id: String(item.id),
                    canonicalId: `${mediaType}:tmdb:${item.id}`,
                    title: cleanBaseTitle(item.title || item.name || 'Untitled'),
                    overview: item.overview || '',
                    image: item.poster_path ? `https://image.tmdb.org/t/p/w200${item.poster_path}` : null,
                    type: mediaType,
                    year: (item.release_date || item.first_air_date || '').split('-')[0] || null,
                    format: item.media_type.toUpperCase(),
                    href: `/watch/${mediaType}/${item.id}`,
                    rating: item.vote_average ? item.vote_average.toFixed(1) : null,
                    provider: 'tmdb',
                    tmdb_id: item.id,
                });
            });
        }

        // 3. Optional 2Embed Metadata Provider Fallback for Movies and TV
        if (!hasMovieOrTvResults) {
            try {
                const [twoEmbedMovies, twoEmbedTv] = await Promise.all([
                    twoEmbed.searchMovies(query, 1).catch(() => []),
                    twoEmbed.searchTv(query, 1).catch(() => []),
                ]);

                [...twoEmbedMovies, ...twoEmbedTv].slice(0, 10).forEach(item => {
                    const cleanId = String(item.tmdb_id || item.imdb_id || item.id);
                    rawCatalogItems.push({
                        id: cleanId,
                        canonicalId: `${item.media_type}:twoembed:${cleanId}`,
                        title: cleanBaseTitle(item.title || item.name || 'Untitled'),
                        overview: item.overview || '',
                        image: item.poster_path ? `https://image.tmdb.org/t/p/w200${item.poster_path}` : (item.poster || null),
                        type: item.media_type,
                        year: item.year ? String(item.year) : (item.release_date || item.first_air_date || '').split('-')[0] || null,
                        format: item.media_type.toUpperCase(),
                        href: `/watch/${item.media_type}/${cleanId}`,
                        rating: null,
                        provider: 'twoembed',
                        tmdb_id: item.tmdb_id || null,
                        imdb_id: item.imdb_id || null,
                    });
                });
            } catch (twoEmbedErr: any) {
                console.warn("[UnifiedSearch] 2Embed fallback search bypassed:", twoEmbedErr?.message);
            }

            // Fallback to local pre-rendered datasets if external network is unavailable
            try {
                const fs = await import("fs/promises");
                const path = await import("path");
                const fallbackFiles = ["tv_top_rated.json", "tv_popular.json", "popular_movies.json", "top_rated_movies.json", "trending_movies.json", "trending_all.json"];
                const qLower = query.toLowerCase();

                for (const file of fallbackFiles) {
                    try {
                        const filePath = path.join(process.cwd(), "public", "data", file);
                        const fileContent = await fs.readFile(filePath, "utf-8");
                        const parsed = JSON.parse(fileContent);
                        const list = parsed.results || [];
                        for (const item of list) {
                            const name = item.title || item.name || item.original_name || item.original_title || '';
                            if (name.toLowerCase().includes(qLower)) {
                                const mediaType = (item.media_type === 'movie' || (!item.media_type && item.title)) ? 'movie' : 'tv';
                                rawCatalogItems.push({
                                    id: String(item.id),
                                    canonicalId: `${mediaType}:tmdb:${item.id}`,
                                    title: cleanBaseTitle(name),
                                    image: item.poster_path ? `https://image.tmdb.org/t/p/w200${item.poster_path}` : (item.poster || ""),
                                    type: mediaType,
                                    year: (item.release_date || item.first_air_date || '').slice(0, 4) || null,
                                    format: mediaType.toUpperCase(),
                                    href: `/watch/${mediaType}/${item.id}`,
                                    rating: item.vote_average ? item.vote_average.toFixed(1) : null,
                                    provider: 'tmdb',
                                    tmdb_id: item.id,
                                });
                            }
                        }
                    } catch (_) {}
                }
            } catch (_) {}
        }

        // 4. Deduplicate across variants and providers
        const deduplicated = deduplicateCatalogItems(rawCatalogItems);

        // 5. Sort by relevance (Normalized Title distance)
        const sortedResults = deduplicated.sort((a, b) => {
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
