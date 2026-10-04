import { Metadata } from "next";
import { redirect } from "next/navigation";
import { fetchWithTimeout } from "@/lib/utils/fetch";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.toonplayer.in';
const TMDB_KEY = process.env.TMDB_API_KEY || '522103f166160100778c1995804369a4';

interface PageProps {
    params: Promise<{ type: string }>;
    searchParams: Promise<{ [key: string]: string | undefined }>;
}

const CATEGORY_NAMES: Record<string, string> = {
    movie: 'Movies',
    movies: 'Movies',
    tv: 'TV Shows',
    anime: 'Anime',
    cartoon: 'Cartoons',
    cartoons: 'Cartoons',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { type: slug } = await params;
    const lowerSlug = slug.toLowerCase();

    // 1. Generic Category Listing
    if (CATEGORY_NAMES[lowerSlug]) {
        const catName = CATEGORY_NAMES[lowerSlug];
        return {
            title: {
                absolute: `Watch ${catName} Free Online in HD - ToonPlayer`,
            },
            description: `Stream the latest and trending ${catName.toLowerCase()} online for free in 1080p HD. No ads, no subscription required on ToonPlayer.`,
            alternates: {
                canonical: `${SITE_URL}/browse?type=${lowerSlug === 'cartoons' ? 'tv&genre_id=16' : lowerSlug === 'movies' ? 'movie' : lowerSlug}`,
            },
        };
    }

    // 2. Slug / ID resolution for single-segment watch routes (/watch/:slug)
    const cleanId = slug.includes(':') ? slug.split(':').pop()! : slug;
    const isNumeric = /^\d+$/.test(cleanId);
    let resolvedTitle = decodeURIComponent(slug).replace(/[-_]/g, ' ');

    try {
        if (isNumeric) {
            // Try movie first, then TV
            const res = await fetchWithTimeout(fetch(`https://api.themoviedb.org/3/movie/${cleanId}?api_key=${TMDB_KEY}`), 2000);
            if (res.ok) {
                const data = await res.json();
                resolvedTitle = data.title || resolvedTitle;
            }
        }
    } catch (e) {}

    return {
        title: {
            absolute: `Watch ${resolvedTitle} Free Online in HD - ToonPlayer`,
        },
        description: `Stream ${resolvedTitle} online for free in HD quality. Zero ads, instant streaming on ToonPlayer.`,
        alternates: {
            canonical: `${SITE_URL}/watch/${cleanId}`,
        },
        robots: {
            index: true,
            follow: true,
        },
    };
}

export default async function WatchSlugPage({ params, searchParams }: PageProps) {
    const { type: slug } = await params;
    const sParams = await searchParams;
    const lowerSlug = slug.toLowerCase();

    // 1. If it's a category name without an ID, redirect to the browse catalog
    if (CATEGORY_NAMES[lowerSlug]) {
        if (lowerSlug === 'anime') {
            redirect('/browse?type=anime');
        } else if (lowerSlug === 'cartoon' || lowerSlug === 'cartoons') {
            redirect('/browse?type=tv&genre_id=16');
        } else if (lowerSlug === 'movies' || lowerSlug === 'movie') {
            redirect('/browse?type=movie');
        } else {
            redirect('/browse?type=tv');
        }
    }

    // 2. If it's an ID or title slug, resolve and redirect permanently (308) to authoritative route
    const cleanId = slug.includes(':') ? slug.split(':').pop()! : slug;
    const isNumeric = /^\d+$/.test(cleanId);
    let targetType = 'movie';

    if (isNumeric) {
        try {
            // Probe if it's a movie or TV show
            const movieRes = await fetchWithTimeout(fetch(`https://api.themoviedb.org/3/movie/${cleanId}?api_key=${TMDB_KEY}`), 2000);
            if (!movieRes.ok) {
                targetType = 'tv';
            }
        } catch (e) {
            targetType = 'tv';
        }
    } else {
        targetType = 'anime';
    }

    // Preserve query parameters (e.g. ?s=1&e=5)
    const queryString = new URLSearchParams(sParams as Record<string, string>).toString();
    const destination = queryString
        ? `/watch/${targetType}/${cleanId}?${queryString}`
        : `/watch/${targetType}/${cleanId}`;

    redirect(destination);
}
