import { Suspense } from "react";
import { Metadata } from "next";
import { DetailsSkeleton } from "@/components/SkeletonLoader";
import { safeJsonLd } from "@/lib/sanitizer";
import { fetchWithTimeout } from "@/lib/utils/fetch";
import connectToDatabase from "@/lib/db";
import { CartoonCatalogModel } from "@/models/CartoonCatalog";
import {
    buildTVSeriesSchema,
    buildTVEpisodeSchema,
    buildVideoObjectSchema,
    buildBreadcrumbSchema,
} from "@/lib/seo/schema-builder";
import WatchClient from "../../watch/[type]/[id]/WatchClient";

const TMDB_KEY = process.env.TMDB_API_KEY || '522103f166160100778c1995804369a4';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.toonplayer.in';

interface PageProps {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ s?: string; e?: string; season?: string; episode?: string }>;
}

async function fetchCartoonData(id: string) {
    const cleanId = id.includes(':') ? id.split(':').pop()! : id;

    // 1. Try local MongoDB scraped CartoonCatalog
    try {
        await connectToDatabase();
        const cartoon = await CartoonCatalogModel.findOne({
            $or: [{ externalId: cleanId }, { slug: cleanId }, { _id: cleanId.match(/^[0-9a-fA-F]{24}$/) ? cleanId : null }],
        }).lean();

        if (cartoon) {
            return {
                title: cartoon.title,
                description: cartoon.description || `Watch ${cartoon.title} online for free on ToonPlayer.`,
                poster: cartoon.poster || `${SITE_URL}/icon.png`,
                backdrop: cartoon.banner || cartoon.poster || `${SITE_URL}/icon.png`,
                year: cartoon.year?.toString() || '',
                rating: cartoon.rating || 8.0,
                ratingCount: 120,
                genres: cartoon.genres || ['Animation', 'Comedy'],
                totalSeasons: cartoon.totalSeasons || 1,
                totalEpisodes: cartoon.totalEpisodes || 12,
            };
        }
    } catch (e) {
        // Fall back to TMDB
    }

    // 2. Try TMDB TV/Cartoon query
    try {
        const res = await fetchWithTimeout(
            fetch(`https://api.themoviedb.org/3/tv/${cleanId}?api_key=${TMDB_KEY}`, {
                next: { revalidate: 3600 },
            }),
            3000
        );
        if (res.ok) {
            const data = await res.json();
            return {
                title: data.name || data.title || 'Cartoon Show',
                description: data.overview || `Watch full cartoon episodes online in HD on ToonPlayer.`,
                poster: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : `${SITE_URL}/icon.png`,
                backdrop: data.backdrop_path ? `https://image.tmdb.org/t/p/original${data.backdrop_path}` : `${SITE_URL}/icon.png`,
                year: (data.first_air_date || '').slice(0, 4),
                rating: data.vote_average || 8.2,
                ratingCount: data.vote_count || 100,
                genres: data.genres?.map((g: any) => g.name) || ['Animation', 'Kids', 'Comedy'],
                totalSeasons: data.number_of_seasons || 1,
                totalEpisodes: data.number_of_episodes || 12,
            };
        }
    } catch (e) {
        console.warn(`[SEO] Failed to fetch TMDB cartoon for ${id}:`, e);
    }

    const fallbackTitle = decodeURIComponent(cleanId).replace(/[-_]/g, ' ');
    return {
        title: fallbackTitle,
        description: `Watch ${fallbackTitle} cartoon episodes online for free in HD on ToonPlayer.`,
        poster: `${SITE_URL}/icon.png`,
        backdrop: `${SITE_URL}/icon.png`,
        year: new Date().getFullYear().toString(),
        rating: 8.0,
        ratingCount: 50,
        genres: ['Animation', 'Comedy', 'Family'],
        totalSeasons: 1,
        totalEpisodes: 12,
    };
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
    const { id } = await params;
    const { s, e, season, episode } = await searchParams;

    const seasonNum = parseInt(s || season || '1', 10);
    const episodeNum = e || episode ? parseInt(e || episode || '1', 10) : undefined;

    const data = await fetchCartoonData(id);
    const title = data.title;
    const yearStr = data.year ? ` (${data.year})` : '';

    const isEpisode = !!episodeNum;
    const canonicalUrl = isEpisode
        ? `${SITE_URL}/cartoon/${id}?s=${seasonNum}&e=${episodeNum}`
        : `${SITE_URL}/cartoon/${id}`;

    const metaTitle = isEpisode
        ? `Watch ${title} Episode ${episodeNum} Cartoon Free Online in HD - ToonPlayer`
        : `Watch ${title}${yearStr} Cartoon Full Episodes Free Online in HD - ToonPlayer`;

    const metaDescription = isEpisode
        ? `Stream ${title} Season ${seasonNum} Episode ${episodeNum} cartoon free online in HD. English & Hindi audio, full episodes with zero ads on ToonPlayer.`
        : `Watch all episodes and seasons of ${title} cartoon free online in full HD. High speed streaming, no sign up required on ToonPlayer.`;

    const image = data.backdrop || data.poster;

    return {
        title: {
            absolute: metaTitle,
        },
        description: metaDescription,
        keywords: [
            title,
            `Watch ${title} cartoon free online`,
            `Watch ${title} Episode ${episodeNum || 1} Hindi / English Sub`,
            `Watch ${title} Episode ${episodeNum || 1} English Dub`,
            `${title} cartoon full episodes`,
            `${title} stream free`,
            `${title} no ads`,
            'free cartoons online',
            'watch cartoons in HD',
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
            type: isEpisode ? 'video.episode' : 'video.tv_show',
            images: [
                {
                    url: image,
                    width: 1200,
                    height: 630,
                    alt: title,
                },
                {
                    url: data.poster,
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
            images: [image],
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

export default async function CartoonPage({ params, searchParams }: PageProps) {
    const { id } = await params;
    const { s, e, season, episode } = await searchParams;

    const seasonNum = parseInt(s || season || '1', 10);
    const episodeNum = e || episode ? parseInt(e || episode || '1', 10) : undefined;

    const data = await fetchCartoonData(id);
    const title = data.title;
    const isEpisode = !!episodeNum;
    const canonicalUrl = isEpisode
        ? `${SITE_URL}/cartoon/${id}?s=${seasonNum}&e=${episodeNum}`
        : `${SITE_URL}/cartoon/${id}`;

    // 1. Primary Schema
    let mainSchema: any;
    if (isEpisode) {
        mainSchema = buildTVEpisodeSchema({
            seriesTitle: title,
            episodeTitle: `${title} - Episode ${episodeNum}`,
            episodeNumber: episodeNum,
            seasonNumber: seasonNum,
            description: `Watch ${title} Episode ${episodeNum} cartoon free online in HD on ToonPlayer.`,
            image: data.backdrop || data.poster,
            canonicalUrl,
            embedUrl: canonicalUrl,
        });
    } else {
        mainSchema = buildTVSeriesSchema({
            title,
            description: data.description,
            image: data.poster,
            backdrop: data.backdrop,
            numberOfSeasons: data.totalSeasons,
            numberOfEpisodes: data.totalEpisodes,
            rating: data.rating,
            ratingCount: data.ratingCount,
            genres: data.genres,
            canonicalUrl,
        });
    }

    // 2. VideoObject Schema
    const videoObjectSchema = buildVideoObjectSchema({
        title: isEpisode ? `${title} Episode ${episodeNum} Cartoon HD Stream` : `${title} Cartoon Full Stream`,
        description: data.description,
        thumbnailUrl: [data.backdrop || data.poster],
        uploadDate: new Date().toISOString(),
        durationMinutes: 22,
        contentUrl: canonicalUrl,
        embedUrl: canonicalUrl,
        isFamilyFriendly: true,
    });

    // 3. Breadcrumb Schema
    const breadcrumbSchema = buildBreadcrumbSchema([
        { name: 'Home', url: SITE_URL },
        { name: 'Cartoons', url: `${SITE_URL}/browse?type=tv&genre_id=16` },
        { name: title, url: `${SITE_URL}/cartoon/${id}` },
        ...(isEpisode ? [{ name: `Season ${seasonNum} Ep ${episodeNum}`, url: canonicalUrl }] : []),
    ]);

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: safeJsonLd(mainSchema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: safeJsonLd(videoObjectSchema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbSchema) }}
            />
            <Suspense fallback={<DetailsSkeleton />}>
                <WatchClient key={`cartoon-${id}`} type="cartoon" id={id} />
            </Suspense>
        </>
    );
}
