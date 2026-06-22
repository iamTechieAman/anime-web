import { NextResponse } from 'next/server';

const TMDB_KEY = process.env.TMDB_API_KEY || '522103f166160100778c1995804369a4';
const ANILIST_URL = 'https://graphql.anilist.co';

// Cache the catalog in memory on the server — refresh every 30 minutes
let cachedCatalog: any[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

async function fetchCatalog() {
    const now = Date.now();
    if (cachedCatalog && (now - cacheTimestamp) < CACHE_DURATION) {
        return cachedCatalog;
    }

    const catalog: any[] = [];

    try {
        // Fetch trending from TMDB
        const tmdbRes = await fetch(
            `https://api.themoviedb.org/3/trending/all/day?api_key=${TMDB_KEY}`,
            { next: { revalidate: 1800 } } // ISR: revalidate every 30min
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
                    href: `/watch/${item.media_type}/${item.id}`
                });
            });
        }
    } catch (e) {
        console.error('[Catalog API] TMDB fetch failed:', e);
    }

    try {
        // Fetch trending anime from AniList
        const animeRes = await fetch(ANILIST_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: `query { Page(page:1, perPage:30) { media(sort: TRENDING_DESC, type: ANIME) { id title { english romaji native } coverImage { medium } seasonYear format } } }`
            }),
            next: { revalidate: 1800 }
        });
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
                    href: `/watch/anime/${item.id}`
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
