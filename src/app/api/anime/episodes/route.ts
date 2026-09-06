import { NextResponse } from "next/server";
import { AnimeProviderManager } from "@/lib/providers/AnimeProviderManager";

export const revalidate = 1800;

// Helper to query AniList GraphQL for metadata and search title
async function fetchAniListMetadata(anilistId: number) {
    const query = `
    query ($id: Int) {
      Media (id: $id, type: ANIME) {
        idMal
        title {
          english
          romaji
          userPreferred
        }
        description
        coverImage {
          extraLarge
          large
        }
        bannerImage
      }
    }
    `;
    try {
        const res = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, variables: { id: anilistId } }),
            signal: AbortSignal.timeout(4000)
        });
        const data = await res.json();
        return data?.data?.Media || null;
    } catch (err) {
        console.error(`[Episodes Route] AniList GraphQL fetch failed:`, err);
        return null;
    }
}

// Clean title for HiAnime search matching
function cleanSearchTitle(title: string): string {
    if (!title) return "";
    return title
        .replace(/\(TV\)/gi, "")
        .replace(/\(Selected\)/gi, "")
        .replace(/\(Double Episode\)/gi, "")
        .replace(/\(20\d{2}\)/g, "") // Remove year in parentheses
        .replace(/[^a-zA-Z0-9 ]/g, " ") // Replace special characters with spaces
        .replace(/\s+/g, " ") // Collapse spaces
        .trim();
}

import { ProviderName } from "@/lib/providers";

function normalizeProvider(name?: string | null): ProviderName | undefined {
    if (!name) return undefined;
    const lower = name.toLowerCase().trim();
    if (lower === 'hi' || lower === 'hianime' || lower === 'hianime_fallback') return 'hianime';
    if (lower === 'aw' || lower === 'aniwatch') return 'aniwatch';
    if (lower === 'anikai') return 'anikai';
    if (lower === 'allanime') return 'allanime';
    if (lower === 'aniwave') return 'aniwave';
    if (lower === 'aniwatchtv') return 'aniwatchtv';
    if (lower === 'consumet' || lower === 'anilist') return 'consumet';
    if (lower === 'gogoanime') return 'gogoanime';
    if (lower === 'animepahe') return 'animepahe';
    if (lower === 'cinevo') return 'cinevo';
    if (lower === 'vidsrc') return 'vidsrc';
    if (lower === 'jikan') return 'jikan';
    return undefined;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const fullId = searchParams.get("id");
    const rawProvider = searchParams.get("provider");

    if (!fullId) {
        return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    // Strip provider prefix if any (e.g., "hi:naruto-355" -> "naruto-355")
    const hasPrefix = fullId.includes(':');
    const prefixProvider = hasPrefix ? fullId.split(':')[0] : null;
    const id = hasPrefix ? fullId.split(':').slice(1).join(':') : fullId;
    const isNumeric = /^\d+$/.test(id);
    const preferredProvider = normalizeProvider(rawProvider) || normalizeProvider(prefixProvider);

    let info: any = null;
    let fallbackUsed = false;
    let aniListMeta: any = null;

    try {
        if (isNumeric) {
            // 1. Try Consumet first for AniList IDs
            try {
                info = await AnimeProviderManager.getInfo(id, preferredProvider || 'consumet');
            } catch (err: any) {
                console.warn(`[Episodes] Consumet failed for AniList ID ${id}: ${err.message}. Trying HiAnime mapping fallback...`);
            }

            // 2. Fallback to AniList GraphQL -> HiAnime search mapping if Consumet failed
            if (!info) {
                aniListMeta = await fetchAniListMetadata(parseInt(id));
                if (aniListMeta) {
                    const searchTitles = [
                        aniListMeta.title.english,
                        aniListMeta.title.userPreferred,
                        aniListMeta.title.romaji
                    ].filter(Boolean) as string[];

                    for (const title of searchTitles) {
                        const cleaned = cleanSearchTitle(title);
                        console.log(`[Episodes] Searching HiAnime for title: "${cleaned}" (original: "${title}")`);
                        const searchResults = await AnimeProviderManager.search(cleaned);
                        if (searchResults && searchResults.length > 0) {
                            const matchedId = searchResults[0].id;
                            console.log(`[Episodes] Found HiAnime match! ID: ${matchedId}`);
                            info = await AnimeProviderManager.getInfo(matchedId, 'hianime');
                            if (info) {
                                fallbackUsed = true;
                                break;
                            }
                        }
                    }
                }
            }
        } else {
            // Non-numeric ID: Query preferred provider or default to hianime
            info = await AnimeProviderManager.getInfo(id, preferredProvider || 'hianime');
        }

        if (!info) {
            // As a last-resort safety net, if AniList resolved but scraper returned nothing, create mock episodes list so page doesn't hang
            if (isNumeric && aniListMeta) {
                const mockEpisodes = Array.from({ length: 12 }, (_, i) => ({
                    id: `${id}?ep=${i + 1}`,
                    number: i + 1,
                    title: `Episode ${i + 1}`,
                    image: aniListMeta.coverImage?.extraLarge || aniListMeta.coverImage?.large || "",
                    description: `Episode ${i + 1} of ${aniListMeta.title.english || aniListMeta.title.userPreferred}`,
                }));
                const show = {
                    id: id,
                    showId: id,
                    _id: id,
                    name: aniListMeta.title.english || aniListMeta.title.userPreferred || 'Unknown',
                    englishName: aniListMeta.title.english || null,
                    romajiName: aniListMeta.title.romaji || null,
                    thumbnail: aniListMeta.coverImage?.extraLarge || aniListMeta.coverImage?.large || "",
                    anilistId: parseInt(id),
                    malId: aniListMeta.idMal || null,
                    description: aniListMeta.description || "",
                    availableEpisodesDetail: { 
                        sub: mockEpisodes, 
                        dub: mockEpisodes 
                    },
                    provider: preferredProvider || 'hianime_fallback',
                };
                return NextResponse.json({ show });
            }
            return NextResponse.json({ error: "Anime not found via providers" }, { status: 404 });
        }

        // Map the episodes list to the standard format
        const episodesList = info.episodes.map((ep: any) => ({
            id: ep.id,
            number: ep.number,
            title: ep.title,
            image: ep.image || (aniListMeta?.coverImage?.extraLarge || aniListMeta?.coverImage?.large || info.image || ""),
            description: ep.description || `Episode ${ep.number} of ${info.title}`,
            isFiller: ep.isFiller,
            hasDub: ep.hasDub,
        }));

        const show = {
            id: id,
            showId: id,
            _id: id, // Stay consistent across all consumers
            name: info.title || aniListMeta?.title?.english || aniListMeta?.title?.userPreferred || 'Unknown',
            englishName: aniListMeta?.title?.english || info.title || null,
            romajiName: aniListMeta?.title?.romaji || info.romajiName || null,
            thumbnail: aniListMeta?.coverImage?.extraLarge || aniListMeta?.coverImage?.large || info.image || "",
            anilistId: isNumeric ? parseInt(id) : (info.anilistId || null),
            malId: aniListMeta?.idMal || info.malId || null,
            description: info.description || aniListMeta?.description || "",
            availableEpisodesDetail: { 
                sub: episodesList, 
                // Pass same list to dub
                dub: episodesList
            },
            provider: fallbackUsed ? 'hianime' : (preferredProvider || info.provider || 'consumet'),
        };

        return NextResponse.json({ show });

    } catch (error: any) {
        console.error(`[Episodes] Critical error: ${error.message}`);
        return NextResponse.json({ error: "Failed to fetch episodes" }, { status: 500 });
    }
}
