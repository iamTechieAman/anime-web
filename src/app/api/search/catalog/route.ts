import { NextResponse } from 'next/server';

const TMDB_KEY = process.env.TMDB_API_KEY || '522103f166160100778c1995804369a4';
const ANILIST_URL = 'https://graphql.anilist.co';

// Cache the catalog in memory on the server — refresh every 30 minutes
let cachedCatalog: any[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms))
    ]);
}

async function fetchCatalog() {
    const now = Date.now();
    if (cachedCatalog && (now - cacheTimestamp) < CACHE_DURATION) {
        return cachedCatalog;
    }

    const catalog: any[] = [];

    try {
        // Fetch trending from TMDB with a strict 3000ms timeout
        const tmdbRes = await withTimeout(
            fetch(
                `https://api.themoviedb.org/3/trending/all/day?api_key=${TMDB_KEY}`,
                { next: { revalidate: 1800 } }
            ),
            3000
        );
        const tmdbData = await tmdbRes.json();

        if (tmdbData.results) {
            tmdbData.results.forEach((item: any) => {
                if (item.media_type === 'person') return;
                catalog.push({
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
    } catch (e: any) {
        console.error('[Catalog API] TMDB fetch failed or timed out:', e.message);
    }

    try {
        // Fetch trending anime from AniList with a strict 3000ms timeout
        const animeRes = await withTimeout(
            fetch(ANILIST_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `query { Page(page:1, perPage:30) { media(sort: TRENDING_DESC, type: ANIME) { id title { english romaji native } coverImage { medium } seasonYear format averageScore } } }`
                }),
                next: { revalidate: 1800 }
            }),
            3000
        );
        const animeData = await animeRes.json();

        if (animeData.data?.Page?.media) {
            animeData.data.Page.media.forEach((item: any) => {
                catalog.push({
                    id: item.id,
                    title: item.title.english || item.title.romaji || item.title.native,
                    altTitles: [item.title.english, item.title.romaji, item.title.native].filter(Boolean),
                    image: item.coverImage?.medium || "",
                    type: 'anime',
                    year: item.seasonYear,
                    format: item.format,
                    href: `/watch/anime/${item.id}`,
                    rating: item.averageScore ? (item.averageScore / 10).toFixed(1) : null
                });
            });
        }
    } catch (e) {
        console.error('[Catalog API] AniList fetch failed:', e);
    }

    cachedCatalog = catalog.map(item => ({
        ...item,
        // Pre-normalize for faster searching
        _searchTitle: item.title.toLowerCase().trim()
    }));
    cacheTimestamp = now;
    return cachedCatalog;
}

export async function GET() {
    try {
        const catalog = await fetchCatalog();
        return NextResponse.json(
            { results: catalog, count: catalog.length },
            {
                headers: {
                    'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
                }
            }
        );
    } catch (error) {
        console.error('[Catalog API] Error:', error);
        return NextResponse.json(
            { results: [], count: 0, error: 'Failed to fetch catalog' },
            { status: 500 }
        );
    }
}
