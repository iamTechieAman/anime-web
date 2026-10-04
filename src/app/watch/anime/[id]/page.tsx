import { Suspense } from "react";
import { Metadata } from "next";
import { fetchWithTimeout } from "@/lib/utils/fetch";
import { safeJsonLd } from "@/lib/sanitizer";
import {
    buildTVSeriesSchema,
    buildTVEpisodeSchema,
    buildVideoObjectSchema,
    buildBreadcrumbSchema,
} from "@/lib/seo/schema-builder";
import WatchClient from "./WatchClient";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.toonplayer.in';

interface PageProps {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ ep?: string; episode?: string; mode?: string }>;
}

async function fetchAnimeShow(id: string) {
    try {
        const res = await fetchWithTimeout(
            fetch(`${SITE_URL}/api/anime/episodes?id=${encodeURIComponent(id)}`, {
                next: { revalidate: 3600 },
            }),
            3000
        );
        if (res.ok) {
            const data = await res.json();
            return data.show || null;
        }
    } catch (e) {
        console.warn(`[SEO] Failed to fetch anime metadata for ${id}:`, e);
    }
    return null;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
    const { id } = await params;
    const { ep, episode } = await searchParams;
    const episodeNum = ep || episode ? parseInt(ep || episode || '1', 10) : undefined;

    const show = await fetchAnimeShow(id);

    if (!show) {
        const fallbackTitle = decodeURIComponent(id).replace(/[-_]/g, ' ');
        const fallbackUrl = episodeNum
            ? `${SITE_URL}/watch/anime/${id}?ep=${episodeNum}`
            : `${SITE_URL}/watch/anime/${id}`;

        return {
            title: episodeNum
                ? `Watch ${fallbackTitle} Episode ${episodeNum} Free Online in HD - ToonPlayer`
                : `Watch ${fallbackTitle} Anime Free Online in HD - ToonPlayer`,
            description: `Stream ${fallbackTitle} online in HD with English Sub/Dub and Hindi audio. Zero ads on ToonPlayer.`,
            alternates: { canonical: fallbackUrl },
        };
    }

    const showTitle = show.name;
    const isEpisode = !!episodeNum;
    const canonicalUrl = isEpisode
        ? `${SITE_URL}/watch/anime/${id}?ep=${episodeNum}`
        : `${SITE_URL}/watch/anime/${id}`;

    const metaTitle = isEpisode
        ? `Watch ${showTitle} Episode ${episodeNum} Free Online in HD - ToonPlayer`
        : `Watch ${showTitle} Full Anime Episodes Free Online in HD - ToonPlayer`;

    const metaDesc = isEpisode
        ? `Stream ${showTitle} Episode ${episodeNum} in full HD online for free. Watch with English Sub/Dub and Hindi audio. Zero ads, instant streaming on ToonPlayer.`
        : `Watch all episodes of ${showTitle} online for free in HD with English Sub/Dub. ${show.description ? show.description.slice(0, 120) + '...' : 'Stream now with no ads on ToonPlayer.'}`;

    const image = show.thumbnail || `${SITE_URL}/icon.png`;

    return {
        title: {
            absolute: metaTitle,
        },
        description: metaDesc,
        keywords: [
            showTitle,
            `Watch ${showTitle} free online`,
            `Watch ${showTitle} Episode ${episodeNum || 1} Hindi / English Sub`,
            `Watch ${showTitle} Episode ${episodeNum || 1} English Dub`,
            `${showTitle} stream free`,
            `${showTitle} no ads`,
            `${showTitle} full episodes`,
            'free anime online',
            'anime streaming HD',
            'ToonPlayer',
        ],
        alternates: {
            canonical: canonicalUrl,
        },
        openGraph: {
            title: metaTitle,
            description: metaDesc,
            url: canonicalUrl,
            siteName: 'ToonPlayer',
            type: isEpisode ? 'video.episode' : 'video.tv_show',
            images: [
                {
                    url: image,
                    width: 1200,
                    height: 630,
                    alt: showTitle,
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title: metaTitle,
            description: metaDesc,
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

export default async function WatchPage({ params, searchParams }: PageProps) {
    const { id } = await params;
    const { ep, episode } = await searchParams;
    const episodeNum = ep || episode ? parseInt(ep || episode || '1', 10) : 1;

    const show = await fetchAnimeShow(id);
    const showTitle = show?.name || decodeURIComponent(id).replace(/[-_]/g, ' ');
    const showDesc = show?.description || `Watch ${showTitle} online in HD for free on ToonPlayer.`;
    const image = show?.thumbnail || `${SITE_URL}/icon.png`;

    const canonicalUrl = `${SITE_URL}/watch/anime/${id}?ep=${episodeNum}`;

    // 1. Primary Schema: TVEpisode
    const episodeSchema = buildTVEpisodeSchema({
        seriesTitle: showTitle,
        episodeTitle: `${showTitle} - Episode ${episodeNum}`,
        episodeNumber: episodeNum,
        seasonNumber: 1,
        description: `Stream ${showTitle} Episode ${episodeNum} with English Sub/Dub in HD free on ToonPlayer.`,
        image,
        durationMinutes: 24,
        canonicalUrl,
        embedUrl: canonicalUrl,
    });

    // 2. TVSeries Schema
    const seriesSchema = buildTVSeriesSchema({
        title: showTitle,
        description: showDesc,
        image,
        numberOfSeasons: 1,
        numberOfEpisodes: show?.availableEpisodesDetail?.sub?.length || 24,
        genres: ['Animation', 'Anime', 'Action', 'Fantasy'],
        canonicalUrl: `${SITE_URL}/watch/anime/${id}`,
    });

    // 3. VideoObject Schema for Google Rich Snippets
    const videoObjectSchema = buildVideoObjectSchema({
        title: `${showTitle} Episode ${episodeNum} HD Stream`,
        description: `Stream ${showTitle} Episode ${episodeNum} in 1080p HD quality free on ToonPlayer.`,
        thumbnailUrl: [image],
        uploadDate: new Date().toISOString(),
        durationMinutes: 24,
        contentUrl: canonicalUrl,
        embedUrl: canonicalUrl,
        isFamilyFriendly: true,
    });

    // 4. BreadcrumbList Schema
    const breadcrumbSchema = buildBreadcrumbSchema([
        { name: 'Home', url: SITE_URL },
        { name: 'Anime', url: `${SITE_URL}/browse?type=anime` },
        { name: showTitle, url: `${SITE_URL}/watch/anime/${id}` },
        { name: `Episode ${episodeNum}`, url: canonicalUrl },
    ]);

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: safeJsonLd(episodeSchema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: safeJsonLd(seriesSchema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: safeJsonLd(videoObjectSchema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbSchema) }}
            />
            <Suspense fallback={<div className="min-h-dvh pt-24 text-center text-accent-warm font-bold bg-bg-main">Loading Player...</div>}>
                <WatchClient key={`anime-${id}`} id={id} />
            </Suspense>
        </>
    );
}
