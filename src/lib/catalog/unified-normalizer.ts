/**
 * ToonPlayer — Unified Catalog & Identifier Normalization Engine
 *
 * Enforces architectural invariants across Movies, TV Series, and Anime:
 * 1. Unified Content Interface: All media types share a single canonical shape.
 * 2. Scoped Identifiers: Numeric IDs are NEVER matched across different media types or namespaces.
 *    (e.g., AniList anime ID 113415 will NEVER match TMDB movie ID 113415).
 * 3. Authority-First Title Resolution: Authoritative titles from TMDB, AniList, or 2Embed
 *    are prioritized over raw scraper strings or numeric identifiers.
 * 4. Sub/Dub Variant Merging: Strips variant tags like "(Dub)", "[Sub]", "(TV)" for deduplication
 *    while preserving availability flags (hasSub, hasDub).
 * 5. Multi-Provider Reconciliation: When multiple providers yield the same title, merges
 *    sources without creating duplicate catalog records or overwriting richer metadata.
 * 6. Ambiguity Guard: When external IDs cannot be verified, uses cautious title+year matching.
 *    If confidence is low, refuses to match to avoid opening the wrong title.
 */

export type CatalogMediaType = 'movie' | 'tv' | 'anime';

export interface UnifiedCatalogItem {
    id: string; // Route ID: "550", "1399", "113415"
    canonicalId: string; // Globally unique namespaced ID: "movie:tmdb:550", "anime:al:113415"
    type: CatalogMediaType;
    title: string;
    altTitles?: string[];
    overview?: string;
    image?: string | null;
    backdrop?: string | null;
    year?: string | number | null;
    rating?: string | number | null;
    format?: string;
    href: string;
    provider: string; // 'tmdb' | 'twoembed' | 'anilist' | 'hianime' | 'allanime'
    provider_id?: string;
    tmdb_id?: number | null;
    imdb_id?: string | null;
    anilist_id?: number | null;
    mal_id?: number | null;
    hasSub?: boolean;
    hasDub?: boolean;
    popularity?: number;
}

/**
 * Strips Sub/Dub/Language variant tags from titles for canonical deduplication.
 * E.g.: "Jujutsu Kaisen (Dub)" -> "Jujutsu Kaisen"
 *       "Bleach: Thousand-Year Blood War [Sub]" -> "Bleach: Thousand-Year Blood War"
 */
export function cleanBaseTitle(title: string): string {
    if (!title) return '';
    return title
        .replace(/\s*[\(\[]\s*(?:sub|dub|raw|tv|uncensored|dual audio|english dub|hindi dub)\s*[\)\]]/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Normalizes title for fuzzy comparison (lowercase, alphanumeric only).
 */
export function normalizeSearchKey(title: string): string {
    return cleanBaseTitle(title)
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Detects whether a title indicates Sub or Dub variant.
 */
export function detectLanguageVariant(title: string): { isSub: boolean; isDub: boolean } {
    const lower = (title || '').toLowerCase();
    const isDub = /\b(dub|english dub|hindi dub|dual audio)\b/i.test(lower);
    const isSub = /\b(sub|raw)\b/i.test(lower) || !isDub; // default to sub if not explicitly dub
    return { isSub, isDub };
}

/**
 * Generates the canonical watch URL for any catalog item.
 */
export function buildCanonicalHref(
    type: CatalogMediaType,
    id: string | number,
    options?: { season?: number; episode?: number | string; provider?: string }
): string {
    const cleanId = String(id).replace(/^(tmdb|twoembed|al|mal):[a-z]+:/i, '');

    if (type === 'movie') {
        return `/watch/movie/${encodeURIComponent(cleanId)}`;
    }

    if (type === 'tv') {
        const s = options?.season || 1;
        const e = options?.episode || 1;
        return `/watch/tv/${encodeURIComponent(cleanId)}?s=${s}&e=${e}`;
    }

    // Anime
    const ep = options?.episode || 1;
    const providerParam = options?.provider ? `&provider=${encodeURIComponent(options.provider)}` : '';
    return `/watch/anime/${encodeURIComponent(cleanId)}?ep=${encodeURIComponent(String(ep))}${providerParam}`;
}

/**
 * Verifies whether two items can be matched with high confidence.
 * Returns true only if verified external identifiers match or cautious title+year matches.
 */
export function isConfidentMatch(a: UnifiedCatalogItem, b: UnifiedCatalogItem): boolean {
    // RULE 1: Never match items of different media types
    if (a.type !== b.type) return false;

    // RULE 2: Match by verified external identifiers (Highest Confidence)
    if (a.tmdb_id && b.tmdb_id && a.tmdb_id === b.tmdb_id) return true;
    if (a.imdb_id && b.imdb_id && a.imdb_id.toLowerCase() === b.imdb_id.toLowerCase()) return true;
    if (a.anilist_id && b.anilist_id && a.anilist_id === b.anilist_id) return true;
    if (a.mal_id && b.mal_id && a.mal_id === b.mal_id) return true;

    // RULE 3: Cautious Title + Year match only when external identifiers are missing
    const keyA = normalizeSearchKey(a.title);
    const keyB = normalizeSearchKey(b.title);
    if (!keyA || !keyB || keyA !== keyB) return false;

    // If years are present, they must match within 1 year (accounting for regional releases)
    if (a.year && b.year) {
        const yA = parseInt(String(a.year).slice(0, 4), 10);
        const yB = parseInt(String(b.year).slice(0, 4), 10);
        if (!isNaN(yA) && !isNaN(yB) && Math.abs(yA - yB) <= 1) {
            return true;
        }
        return false;
    }

    // Exact title match with no conflicting years
    return true;
}

/**
 * Merges two matching records, preserving richer metadata and aggregating language variants.
 */
export function mergeCatalogItems(primary: UnifiedCatalogItem, incoming: UnifiedCatalogItem): UnifiedCatalogItem {
    const variant = detectLanguageVariant(incoming.title);

    // Prefer authoritative title (avoid raw numeric strings or scraper tags)
    let bestTitle = primary.title;
    if (/^\d+$/.test(bestTitle) && !/^\d+$/.test(incoming.title)) {
        bestTitle = cleanBaseTitle(incoming.title);
    } else {
        bestTitle = cleanBaseTitle(primary.title);
    }

    // Combine alternate titles without duplicates
    const combinedAlt = Array.from(new Set([
        ...(primary.altTitles || []),
        ...(incoming.altTitles || []),
        incoming.title,
    ])).filter(t => Boolean(t) && t !== bestTitle);

    return {
        ...primary,
        title: bestTitle,
        altTitles: combinedAlt,
        overview: primary.overview || incoming.overview || '',
        image: primary.image || incoming.image || null,
        backdrop: primary.backdrop || incoming.backdrop || null,
        year: primary.year || incoming.year || null,
        rating: primary.rating || incoming.rating || null,
        tmdb_id: primary.tmdb_id || incoming.tmdb_id || null,
        imdb_id: primary.imdb_id || incoming.imdb_id || null,
        anilist_id: primary.anilist_id || incoming.anilist_id || null,
        mal_id: primary.mal_id || incoming.mal_id || null,
        hasSub: primary.hasSub || variant.isSub || incoming.hasSub || false,
        hasDub: primary.hasDub || variant.isDub || incoming.hasDub || false,
    };
}

/**
 * Deduplicates an array of catalog items using scoped identifier mapping and cautious title matching.
 */
export function deduplicateCatalogItems(items: UnifiedCatalogItem[]): UnifiedCatalogItem[] {
    const result: UnifiedCatalogItem[] = [];

    for (const item of items) {
        if (!item || !item.title) continue;

        const lang = detectLanguageVariant(item.title);
        const normalizedItem: UnifiedCatalogItem = {
            ...item,
            title: cleanBaseTitle(item.title),
            hasSub: item.hasSub ?? lang.isSub,
            hasDub: item.hasDub ?? lang.isDub,
        };

        // Find existing match
        const matchIndex = result.findIndex(existing => isConfidentMatch(existing, normalizedItem));

        if (matchIndex >= 0) {
            result[matchIndex] = mergeCatalogItems(result[matchIndex], normalizedItem);
        } else {
            result.push(normalizedItem);
        }
    }

    return result;
}
