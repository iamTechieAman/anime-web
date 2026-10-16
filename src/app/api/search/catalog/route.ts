import { NextResponse } from 'next/server';
import { TwoEmbedProvider } from '@/lib/providers/twoembed';
import {
    deduplicateCatalogItems,
    cleanBaseTitle,
    type UnifiedCatalogItem,
} from '@/lib/catalog/unified-normalizer';

const twoEmbed = new TwoEmbedProvider();
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

    const catalog: UnifiedCatalogItem[] = [];
    let hasMovieOrTv = false;

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
                hasMovieOrTv = true;
                const mediaType = item.media_type === 'movie' ? 'movie' : 'tv';
                catalog.push({
                    id: String(item.id),
                    canonicalId: `${mediaType}:tmdb:${item.id}`,
                    title: cleanBaseTitle(item.title || item.name || 'Untitled'),
                    overview: item.overview || '',
                    image: item.poster_path ? `https://image.tmdb.org/t/p/w200${item.poster_path}` : null,
                    type: mediaType,
                    year: (item.release_date || item.first_air_date || '').split('-')[0] || null,
                    format: item.media_type.toUpperCase(),
                    href: `/watch/${item.media_type}/${item.id}`,
                    rating: item.vote_average ? item.vote_average.toFixed(1) : null,
                    provider: 'tmdb',
                    tmdb_id: item.id,
                });
            });
        }
    } catch (e: any) {
        console.error('[Catalog API] TMDB fetch failed or timed out:', e.message);
    }

    // Optional 2Embed Fallback for trending movies/TV if TMDB failed
    if (!hasMovieOrTv) {
        try {
            const [twoEmbedMovies, twoEmbedTv] = await Promise.all([
                twoEmbed.getTrendingMovies('day', 1).catch(() => []),
                twoEmbed.getTrendingTv('day', 1).catch(() => []),
            ]);

            [...twoEmbedMovies, ...twoEmbedTv].forEach(item => {
                const cleanId = String(item.tmdb_id || item.imdb_id || item.id);
                catalog.push({
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
            console.warn('[Catalog API] 2Embed fallback bypassed:', twoEmbedErr?.message);
        }
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
                const authoritativeTitle = item.title.english || item.title.romaji || item.title.native || 'Anime';
                catalog.push({
                    id: String(item.id),
                    canonicalId: `anime:al:${item.id}`,
                    title: cleanBaseTitle(authoritativeTitle),
                    altTitles: [item.title.english, item.title.romaji, item.title.native].filter(Boolean),
                    image: item.coverImage?.medium || "",
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
    } catch (e) {
        console.error('[Catalog API] AniList fetch failed:', e);
    }

    // Deduplicate cross-provider & variant entries
    const deduplicated = deduplicateCatalogItems(catalog);

    cachedCatalog = deduplicated.map(item => ({
        ...item,
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
