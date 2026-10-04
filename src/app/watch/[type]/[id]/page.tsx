import { Suspense } from "react";
import { Metadata } from "next";
import { DetailsSkeleton } from "@/components/SkeletonLoader";
import { safeJsonLd } from "@/lib/sanitizer";
import { fetchWithTimeout } from "@/lib/utils/fetch";
import {
    buildMovieSchema,
    buildTVSeriesSchema,
    buildTVEpisodeSchema,
    buildVideoObjectSchema,
    buildBreadcrumbSchema,
} from "@/lib/seo/schema-builder";

import WatchClient from "./WatchClient";

const TMDB_KEY = process.env.TMDB_API_KEY || '522103f166160100778c1995804369a4';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.toonplayer.in';

interface PageProps {
    params: Promise<{ type: string; id: string }>;
    searchParams: Promise<{ s?: string; e?: string; season?: string; episode?: string }>;
}

/**
 * Helper to fetch content metadata from TMDB or local Cartoon catalog
 */
async function fetchContentDetails(type: string, id: string) {
    const cleanId = id.includes(':') ? id.split(':').pop()! : id;
    const targetType = type === 'anime' || type === 'cartoon' ? 'tv' : type;

    try {
        const res = await fetchWithTimeout(
            fetch(`https://api.themoviedb.org/3/${targetType}/${cleanId}?api_key=${TMDB_KEY}&append_to_response=credits`, {
                next: { revalidate: 3600 },
            }),
            3000
        );

        if (res.ok) {
            const data = await res.json();
            return {
                title: data.title || data.name || 'Untitled',
                overview: data.overview || '',
                poster: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : `${SITE_URL}/icon.png`,
                backdrop: data.backdrop_path ? `https://image.tmdb.org/t/p/original${data.backdrop_path}` : undefined,
                year: (data.release_date || data.first_air_date || '').slice(0, 4),
                rating: data.vote_average || 0,
                ratingCount: data.vote_count || 0,
                genres: data.genres?.map((g: any) => g.name) || [],
                runtime: data.runtime || (data.episode_run_time ? data.episode_run_time[0] : 24),
                numberOfSeasons: data.number_of_seasons || 1,
                numberOfEpisodes: data.number_of_episodes || 12,
                director: data.credits?.crew?.find((c: any) => c.job === 'Director')?.name,
                actors: data.credits?.cast?.slice(0, 8).map((c: any) => c.name) || [],
            };
        }
    } catch (e) {
        console.warn(`[SEO] Failed to fetch TMDB details for ${type}/${id}:`, e);
    }

    // Fallback if TMDB fails or for custom cartoon IDs
    return {
        title: type === 'cartoon' ? 'Cartoon Show' : type === 'anime' ? 'Anime Series' : type === 'movie' ? 'Movie' : 'TV Show',
        overview: `Watch full episodes and movies online in HD on ToonPlayer.`,
        poster: `${SITE_URL}/icon.png`,
        backdrop: `${SITE_URL}/icon.png`,
        year: new Date().getFullYear().toString(),
        rating: 8.5,
        ratingCount: 150,
        genres: ['Animation', 'Action', 'Adventure'],
        runtime: type === 'movie' ? 100 : 24,
        numberOfSeasons: 1,
        numberOfEpisodes: 12,
        director: undefined,
        actors: [],
    };
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
    const { type, id: rawId } = await params;
    const { s, e, season, episode } = await searchParams;
    const id = rawId.includes(':') ? rawId.split(':').pop()! : rawId;

    const seasonNum = parseInt(s || season || '1', 10);
    const episodeNum = e || episode ? parseInt(e || episode || '1', 10) : undefined;

    const details = await fetchContentDetails(type, id);
    const title = details.title;
    const yearStr = details.year ? ` (${details.year})` : '';

    let metaTitle: string;
    let metaDescription: string;
    let canonicalUrl: string;

    if (type === 'movie') {
        metaTitle = `Watch ${title}${yearStr} Full Movie Free Online in HD - ToonPlayer`;
        metaDescription = `Stream ${title}${yearStr} in full 1080p/4K HD for free. No ads, no subscription or sign-up required. Multi-audio & English subtitles available on ToonPlayer.`;
        canonicalUrl = `${SITE_URL}/watch/movie/${id}`;
    } else if (episodeNum) {
        metaTitle = `Watch ${title} Episode ${episodeNum} Free Online in HD - ToonPlayer`;
        metaDescription = `Stream ${title} Episode ${episodeNum} (Season ${seasonNum}) free online in HD. Watch full episodes with English Sub/Dub and Hindi audio. Zero ads, instant streaming on ToonPlayer.`;
        canonicalUrl = `${SITE_URL}/watch/${type}/${id}?s=${seasonNum}&e=${episodeNum}`;
    } else {
        metaTitle = `Watch ${title}${yearStr} Full Episodes Free Online in HD - ToonPlayer`;
        metaDescription = `Watch all seasons and episodes of ${title} online for free in HD. Available in Hindi, English Sub & Dub with zero ads on ToonPlayer.`;
        canonicalUrl = `${SITE_URL}/watch/${type}/${id}`;
    }

    const backdropImage = details.backdrop || details.poster;
    const isEpisode = !!episodeNum && type !== 'movie';

    return {
        title: {
            absolute: metaTitle,
        },
        description: metaDescription,
        keywords: [
            title,
            `Watch ${title} free online`,
            `Watch ${title} Episode ${episodeNum || 1} Hindi / English Sub`,
            `Watch ${title} Episode ${episodeNum || 1} English Dub`,
            `${title} stream free`,
            `${title} no ads`,
            `${title} full episodes`,
            `${title} 1080p HD`,
            `${type === 'anime' ? 'free anime streaming' : type === 'cartoon' ? 'free cartoons online' : 'free streaming'}`,
            'ToonPlayer',
        ],
        alternates: {
            canonical: canonicalUrl,
        },
        openGraph: {
            title: metaTitle,
            description: metaDescription,
            url: canonicalUrl,
            siteName: 'ToonPlayer',
            type: type === 'movie' ? 'video.movie' : isEpisode ? 'video.episode' : 'video.tv_show',
            images: [
                {
                    url: backdropImage,
                    width: 1920,
                    height: 1080,
                    alt: `${title} HD Stream`,
                },
                {
                    url: details.poster,
                    width: 600,
                    height: 900,
                    alt: `${title} Poster`,
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title: metaTitle,
            description: metaDescription,
            images: [backdropImage],
            creator: '@ToonPlayer',
        },
        robots: {
            index: true,
            follow: true,
            googleBot: {
                index: true,
                follow: true,
                'max-video-preview': -1,
                'max-image-preview': 'large',
                'max-snippet': -1,
            },
        },
    };
}

export default async function WatchPage({ params, searchParams }: PageProps) {
    const { type, id: rawId } = await params;
    const { s, e, season, episode } = await searchParams;
    const id = rawId.includes(':') ? rawId.split(':').pop()! : rawId;

    const seasonNum = parseInt(s || season || '1', 10);
    const episodeNum = e || episode ? parseInt(e || episode || '1', 10) : undefined;

    const details = await fetchContentDetails(type, id);
    const title = details.title;

    const isMovie = type === 'movie';
    const isEpisode = !!episodeNum && !isMovie;
    const canonicalUrl = isMovie
        ? `${SITE_URL}/watch/movie/${id}`
        : isEpisode
        ? `${SITE_URL}/watch/${type}/${id}?s=${seasonNum}&e=${episodeNum}`
        : `${SITE_URL}/watch/${type}/${id}`;

    // 1. Build Main Content Schema (Movie, TVEpisode, or TVSeries)
    let mainSchema: any;
    if (isMovie) {
        mainSchema = buildMovieSchema({
            title,
            description: details.overview || `Watch ${title} online for free in HD on ToonPlayer.`,
            image: details.poster,
            backdrop: details.backdrop,
            datePublished: details.year ? `${details.year}-01-01` : undefined,
            durationMinutes: details.runtime,
            rating: details.rating,
            ratingCount: details.ratingCount,
            genres: details.genres,
            director: details.director,
            actors: details.actors,
            canonicalUrl,
            embedUrl: canonicalUrl,
        });
    } else if (isEpisode) {
        mainSchema = buildTVEpisodeSchema({
            seriesTitle: title,
            episodeTitle: `${title} - Episode ${episodeNum}`,
            episodeNumber: episodeNum,
            seasonNumber: seasonNum,
            description: details.overview || `Watch ${title} Season ${seasonNum} Episode ${episodeNum} in HD online for free on ToonPlayer.`,
            image: details.backdrop || details.poster,
            datePublished: details.year ? `${details.year}-01-01` : undefined,
            durationMinutes: details.runtime,
            canonicalUrl,
            embedUrl: canonicalUrl,
        });
    } else {
        mainSchema = buildTVSeriesSchema({
            title,
            description: details.overview || `Watch ${title} all episodes in HD online for free on ToonPlayer.`,
            image: details.poster,
            backdrop: details.backdrop,
            startDate: details.year ? `${details.year}-01-01` : undefined,
            numberOfSeasons: details.numberOfSeasons,
            numberOfEpisodes: details.numberOfEpisodes,
            rating: details.rating,
            ratingCount: details.ratingCount,
            genres: details.genres,
            canonicalUrl,
        });
    }

    // 2. Build VideoObject Schema (High-ranking rich snippet in Google Search)
    const videoObjectSchema = buildVideoObjectSchema({
        title: isEpisode ? `${title} Episode ${episodeNum} HD Stream` : `${title} Full HD Stream`,
        description: details.overview || `Watch ${title} in HD quality online for free on ToonPlayer.`,
        thumbnailUrl: [details.backdrop || details.poster],
        uploadDate: new Date().toISOString(),
        durationMinutes: details.runtime,
        contentUrl: canonicalUrl,
        embedUrl: canonicalUrl,
        isFamilyFriendly: true,
    });

    // 3. Build BreadcrumbList Schema
    const categoryName = type === 'tv' ? 'TV Shows' : type === 'anime' ? 'Anime' : type === 'cartoon' ? 'Cartoons' : 'Movies';
    const categoryUrl = type === 'anime' ? `${SITE_URL}/browse?type=anime` : type === 'cartoon' ? `${SITE_URL}/browse?type=tv&genre_id=16` : `${SITE_URL}/${type === 'movie' ? 'movies' : 'tv'}`;

    const breadcrumbs = [
        { name: 'Home', url: SITE_URL },
        { name: categoryName, url: categoryUrl },
        { name: title, url: `${SITE_URL}/watch/${type}/${id}` },
    ];

    if (isEpisode) {
        breadcrumbs.push({
            name: `Season ${seasonNum} Ep ${episodeNum}`,
            url: canonicalUrl,
        });
    }

    const breadcrumbSchema = buildBreadcrumbSchema(breadcrumbs);

    return (
        <>
            {/* Primary Schema: Movie / TVEpisode / TVSeries */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: safeJsonLd(mainSchema) }}
            />
            {/* Google Rich Video Snippet Schema */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: safeJsonLd(videoObjectSchema) }}
            />
            {/* Navigational Breadcrumb Schema */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbSchema) }}
            />
            <Suspense fallback={<DetailsSkeleton />}>
                <WatchClient key={`${type}-${id}`} type={type} id={id} />
            </Suspense>
        </>
    );
}
