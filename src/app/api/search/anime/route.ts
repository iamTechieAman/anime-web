import { NextRequest, NextResponse } from 'next/server';
import { getProvider, type ProviderName } from '@/lib/providers';
import { animeCache, cacheKey, TTL } from '@/lib/anime-cache';

/**
 * GET /api/search/anime
 *
 * Unified anime search — aggregates results from multiple providers simultaneously.
 * Deduplicates by normalized title, scores and ranks results.
 *
 * Query params:
 * - q=<query>         (required)
 * - providers=a,b,c  (optional, default: allanime,hianime,consumet)
 * - limit=<n>        (optional, default: 30)
 */

// Default search providers — stable, fast
const DEFAULT_SEARCH_PROVIDERS: ProviderName[] = ['allanime', 'hianime', 'consumet'];

function normalizeTitle(t: string): string {
    return t?.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim() || '';
}

function scoreResult(item: any, query: string): number {
    const norm = normalizeTitle(item.title || '');
    const normQ = normalizeTitle(query);
    let score = 0;
    if (norm === normQ) score += 100;
    else if (norm.startsWith(normQ)) score += 60;
    else if (norm.includes(normQ)) score += 30;
    if (item.image) score += 5;
    if (item.extra?.subOrDub?.sub > 0) score += 3;
    if (item.extra?.subOrDub?.dub > 0) score += 2;
    return score;
}

export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl;
    const query = searchParams.get('q')?.trim();
    const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 60);
    const providersParam = searchParams.get('providers');

    if (!query) {
        return NextResponse.json({ error: 'Query parameter q is required' }, { status: 400 });
    }

    // Check cache
    const ck = cacheKey.search(query, 'unified');
    const cached = animeCache.get<any[]>(ck);
    if (cached) {
        return NextResponse.json({ results: cached.slice(0, limit), fromCache: true, query });
    }

    const providerNames: ProviderName[] = providersParam
        ? (providersParam.split(',').map(p => p.trim()) as ProviderName[])
        : DEFAULT_SEARCH_PROVIDERS;

    // Run all provider searches in parallel
    const searchTasks = providerNames.map(async (name) => {
        try {
            const p = getProvider(name);
            const results = await Promise.race([
                p.search(query),
                new Promise<any[]>((_, rej) => setTimeout(() => rej(new Error('timeout')), 6000)),
            ]) as any[];
            return results.map(r => ({ ...r, _source: name }));
        } catch (e: any) {
            console.warn(`[UnifiedSearch] ${name} failed: ${e.message}`);
            return [];
        }
    });

    const allResults = (await Promise.all(searchTasks)).flat();

    // Deduplicate by normalized title
    const seen = new Map<string, any>();
    for (const item of allResults) {
        const key = normalizeTitle(item.title || '');
        if (!key) continue;
        if (!seen.has(key)) {
            seen.set(key, { ...item, _sources: [item._source] });
        } else {
            // Merge: combine sources, prefer item with image
            const existing = seen.get(key);
            existing._sources = [...new Set([...existing._sources, item._source])];
            if (!existing.image && item.image) existing.image = item.image;
        }
    }

    // Score and sort
    const ranked = Array.from(seen.values())
        .map(item => ({ ...item, _score: scoreResult(item, query) }))
        .sort((a, b) => b._score - a._score)
        .slice(0, 60); // cache top 60, serve up to limit

    // Cache for 10 min
    animeCache.set(ck, ranked, 10 * 60 * 1000);

    return NextResponse.json(
        {
            results: ranked.slice(0, limit),
            total: ranked.length,
            query,
            providers: providerNames,
            fromCache: false,
        },
        {
            headers: {
                'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
            },
        }
    );
}
