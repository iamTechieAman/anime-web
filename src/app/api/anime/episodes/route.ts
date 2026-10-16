import { NextResponse } from "next/server";
import { AnimeProviderManager } from "@/lib/providers/AnimeProviderManager";
import { ProviderName } from "@/lib/providers";
import { animeCache, cacheKey, TTL } from "@/lib/anime-cache";

export const revalidate = 1800;

import { fetchWithTimeout } from "@/lib/utils/fetch";

const TMDB_KEY = process.env.TMDB_API_KEY || '522103f166160100778c1995804369a4';

// Helper to query AniList GraphQL for metadata and search title
async function fetchAniListMetadata(anilistId: number) {
    const cKey = cacheKey.anilistMeta(anilistId.toString());
    const cached = animeCache.get<any>(cKey);
    if (cached) return cached;

    const query = `
    query ($id: Int) {
      Media (id: $id) {
        id
        idMal
        title {
          english
          romaji
          userPreferred
          native
        }
        description
        episodes
        status
        format
        type
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
            signal: AbortSignal.timeout(5000)
        });
        const data = await res.json();
        const media = data?.data?.Media || null;
        if (media) {
            animeCache.set(cKey, media, TTL.ANILIST_META);
        }
        return media;
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
            const anilistNum = parseInt(id, 10);
            aniListMeta = await fetchAniListMetadata(anilistNum);

            // 1. If we have real AniList metadata, use its authentic titles to search for provider episodes
            if (aniListMeta) {
                try {
                    const primaryTitle = cleanSearchTitle(aniListMeta.title?.english || aniListMeta.title?.romaji || '');
                    if (primaryTitle) {
                        const searchPromise = async () => {
                            const searchResults = await AnimeProviderManager.search(primaryTitle);
                            if (searchResults && searchResults.length > 0) {
                                const matchedId = searchResults[0].id;
                                const matchedProvider = (searchResults[0] as any).providerId || 'hianime';
                                const fetchedInfo = await AnimeProviderManager.getInfo(matchedId, matchedProvider);
                                if (fetchedInfo && Array.isArray(fetchedInfo.episodes) && fetchedInfo.episodes.length > 0) {
                                    return fetchedInfo;
                                }
                            }
                            return null;
                        };

                        info = await Promise.race([
                            searchPromise(),
                            new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500))
                        ]);
                        if (info) fallbackUsed = true;
                    }
                } catch (searchErr) {
                    console.warn(`[Episodes] Provider search skipped/failed:`, searchErr);
                }
            }

            // 2. If provider search did not yield real episodes, construct authoritative episode list from AniList
            if (!info || !Array.isArray(info.episodes) || info.episodes.length === 0) {
                if (aniListMeta) {
                    const realName = aniListMeta.title?.english || aniListMeta.title?.userPreferred || aniListMeta.title?.romaji || 'Unknown Anime';
                    const episodeCount = aniListMeta.episodes && aniListMeta.episodes > 0 ? aniListMeta.episodes : 12;
                    const defaultImg = aniListMeta.bannerImage || aniListMeta.coverImage?.extraLarge || aniListMeta.coverImage?.large || "";

                    const episodesList = Array.from({ length: episodeCount }, (_, i) => ({
                        id: `${id}?ep=${i + 1}`,
                        number: i + 1,
                        title: `Episode ${i + 1}`,
                        image: defaultImg,
                        description: `Episode ${i + 1} of ${realName}`,
                        isFiller: false,
                        hasDub: true
                    }));

                    const show = {
                        id: id,
                        showId: id,
                        _id: id,
                        name: realName,
                        title: realName,
                        englishName: aniListMeta.title?.english || realName,
                        romajiName: aniListMeta.title?.romaji || null,
                        nativeName: aniListMeta.title?.native || null,
                        thumbnail: aniListMeta.coverImage?.extraLarge || aniListMeta.coverImage?.large || defaultImg,
                        bannerImage: aniListMeta.bannerImage || "",
                        anilistId: anilistNum,
                        malId: aniListMeta.idMal || null,
                        description: aniListMeta.description || "",
                        totalEpisodes: episodeCount,
                        format: aniListMeta.format || "TV",
                        status: aniListMeta.status || "FINISHED",
                        availableEpisodesDetail: {
                            sub: episodesList,
                            dub: episodesList
                        },
                        provider: 'anilist',
                    };

                    console.log(`[Episodes] Successfully resolved ${episodeCount} episodes via AniList for "${realName}" (MAL: ${aniListMeta.idMal})`);
                    return NextResponse.json({ show });
                }

                // 3. Fallback to TMDB for numeric IDs (Cartoons, TV Shows, Anime cataloged via TMDB)
                try {
                    const tmdbTvRes = await fetchWithTimeout(
                        fetch(`https://api.themoviedb.org/3/tv/${id}?api_key=${TMDB_KEY}&language=en-US`, { next: { revalidate: 3600 } }),
                        3000
                    );
                    if (tmdbTvRes.ok) {
                        const tmdbData = await tmdbTvRes.json();
                        if (tmdbData && tmdbData.name) {
                            const realName = tmdbData.name;
                            const episodeCount = tmdbData.number_of_episodes || (tmdbData.seasons?.[0]?.episode_count) || 12;
                            const defaultImg = tmdbData.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}` : "";
                            const bannerImg = tmdbData.backdrop_path ? `https://image.tmdb.org/t/p/original${tmdbData.backdrop_path}` : defaultImg;
                            const episodesList = Array.from({ length: episodeCount }, (_, i) => ({
                                id: `${id}?ep=${i + 1}`,
                                number: i + 1,
                                title: `Episode ${i + 1}`,
                                image: defaultImg,
                                description: `Episode ${i + 1} of ${realName}`,
                                isFiller: false,
                                hasDub: true
                            }));
                            const show = {
                                id: id,
                                showId: id,
                                _id: id,
                                name: realName,
                                title: realName,
                                englishName: realName,
                                romajiName: null,
                                nativeName: tmdbData.original_name || null,
                                thumbnail: defaultImg,
                                bannerImage: bannerImg,
                                anilistId: null,
                                malId: null,
                                tmdbId: tmdbData.id,
                                description: tmdbData.overview || "",
                                totalEpisodes: episodeCount,
                                format: "TV",
                                status: tmdbData.status || "FINISHED",
                                availableEpisodesDetail: {
                                    sub: episodesList,
                                    dub: episodesList
                                },
                                provider: 'tmdb',
                            };
                            return NextResponse.json({ show });
                        }
                    }
                } catch (_) {}

                try {
                    const tmdbMovieRes = await fetchWithTimeout(
                        fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_KEY}&language=en-US`, { next: { revalidate: 3600 } }),
                        3000
                    );
                    if (tmdbMovieRes.ok) {
                        const tmdbData = await tmdbMovieRes.json();
                        if (tmdbData && tmdbData.title) {
                            const realName = tmdbData.title;
                            const defaultImg = tmdbData.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}` : "";
                            const bannerImg = tmdbData.backdrop_path ? `https://image.tmdb.org/t/p/original${tmdbData.backdrop_path}` : defaultImg;
                            const episodesList = [{
                                id: `${id}?ep=1`,
                                number: 1,
                                title: realName,
                                image: defaultImg,
                                description: tmdbData.overview || `Watch ${realName} online in HD`,
                                isFiller: false,
                                hasDub: true
                            }];
                            const show = {
                                id: id,
                                showId: id,
                                _id: id,
                                name: realName,
                                title: realName,
                                englishName: realName,
                                romajiName: null,
                                nativeName: tmdbData.original_title || null,
                                thumbnail: defaultImg,
                                bannerImage: bannerImg,
                                anilistId: null,
                                malId: null,
                                tmdbId: tmdbData.id,
                                description: tmdbData.overview || "",
                                totalEpisodes: 1,
                                format: "MOVIE",
                                status: tmdbData.status || "FINISHED",
                                availableEpisodesDetail: {
                                    sub: episodesList,
                                    dub: episodesList
                                },
                                provider: 'tmdb',
                            };
                            return NextResponse.json({ show });
                        }
                    }
                } catch (_) {}

                return NextResponse.json({ error: "Anime not found via providers" }, { status: 404 });
            }
        } else {
            // Non-numeric ID: Query preferred provider or default to hianime
            info = await AnimeProviderManager.getInfo(id, preferredProvider || 'hianime');
        }

        if (!info || !Array.isArray(info.episodes) || info.episodes.length === 0) {
            return NextResponse.json({ error: "Anime not found via providers" }, { status: 404 });
        }

        // Map the episodes list to the standard format
        const episodesList = info.episodes.map((ep: any) => ({
            id: ep.id,
            number: ep.number,
            title: ep.title,
            image: ep.image || (aniListMeta?.coverImage?.extraLarge || aniListMeta?.coverImage?.large || info.image || ""),
            description: ep.description || `Episode ${ep.number} of ${info.title}`,
            isFiller: ep.isFiller || false,
            hasDub: ep.hasDub ?? true,
        }));

        const resolvedName = aniListMeta?.title?.english || aniListMeta?.title?.userPreferred || info.title || 'Unknown Anime';

        const show = {
            id: id,
            showId: id,
            _id: id,
            name: resolvedName,
            title: resolvedName,
            englishName: aniListMeta?.title?.english || info.title || null,
            romajiName: aniListMeta?.title?.romaji || info.romajiName || null,
            thumbnail: aniListMeta?.coverImage?.extraLarge || aniListMeta?.coverImage?.large || info.image || "",
            bannerImage: aniListMeta?.bannerImage || "",
            anilistId: isNumeric ? parseInt(id, 10) : (info.anilistId || null),
            malId: aniListMeta?.idMal || info.malId || null,
            description: info.description || aniListMeta?.description || "",
            totalEpisodes: info.totalEpisodes || episodesList.length,
            availableEpisodesDetail: { 
                sub: episodesList, 
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
