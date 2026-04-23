import { Suspense } from "react";
import { Metadata } from "next";
import WatchClient from "./WatchClient";
import { DetailsSkeleton } from "@/components/SkeletonLoader";

const TMDB_KEY = process.env.TMDB_API_KEY || '522103f166160100778c1995804369a4';

export async function generateMetadata({ params }: { params: Promise<{ type: string; id: string }> }): Promise<Metadata> {
    const { type, id: rawId } = await params;
    const id = rawId.includes(':') ? rawId.split(':').pop()! : rawId;

    try {
        const res = await fetch(
            `https://api.themoviedb.org/3/${type === 'anime' ? 'tv' : type}/${id}?api_key=${TMDB_KEY}`,
            { next: { revalidate: 3600 } }
        );
        
        if (!res.ok) throw new Error(`TMDB returned ${res.status}`);
        const data = await res.json();

        const title = data.title || data.name || 'Watch Now';
        const description = data.overview || `Watch ${title} online for free in HD quality on ToonPlayer.`;
        const poster = data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : '/icon.png';
        const backdrop = data.backdrop_path ? `https://image.tmdb.org/t/p/original${data.backdrop_path}` : poster;
        const year = (data.release_date || data.first_air_date || '').slice(0, 4);
        const rating = data.vote_average ? `${(data.vote_average * 10).toFixed(0)}%` : '';

        return {
            title: `Watch ${title}${year ? ` (${year})` : ''} Online Free HD`,
            description: `Stream ${title} in HD quality for free. ${description.slice(0, 150)}...`,
            keywords: [
                title,
                `watch ${title} online`,
                `${title} free streaming`,
                `${title} HD`,
                `${type === 'tv' ? 'TV show' : type} streaming`,
                'ToonPlayer',
                'free movies',
                'free anime',
            ],
            openGraph: {
                title: `Watch ${title} - ToonPlayer`,
                description: `Stream ${title} in HD for free. ${rating ? `${rating} match. ` : ''}No ads, no sign-up.`,
                url: `https://toonplayer.in/watch/${type}/${id}`,
                type: 'video.other',
                images: [
                    { url: backdrop, width: 1920, height: 1080, alt: title },
                    { url: poster, width: 500, height: 750, alt: `${title} poster` },
                ],
            },
            twitter: {
                card: 'summary_large_image',
                title: `Watch ${title} Free - ToonPlayer`,
                description: `Stream ${title} in HD quality. Free, no ads.`,
                images: [backdrop],
            },
            alternates: {
                canonical: `https://toonplayer.in/watch/${type}/${id}`,
            },
            robots: {
                index: true,
                follow: true,
            },
        };
    } catch (e) {
        const typeLabel = type === 'tv' ? 'TV Show' : type === 'anime' ? 'Anime' : 'Movie';
        return {
            title: `Watch ${typeLabel} Online Free | ToonPlayer`,
            description: `Stream this ${typeLabel.toLowerCase()} in HD quality for free on ToonPlayer. No ads, no sign-up required.`,
        };
    }
}

export default async function WatchPage({ params }: { params: Promise<{ type: string; id: string }> }) {
    const { type, id: rawId } = await params;
    const id = rawId.includes(':') ? rawId.split(':').pop()! : rawId;

    let metaTitle = "Video Content";
    let metaDesc = "Watch free HD content on ToonPlayer";
    let metaImage = "https://toonplayer.in/icon.png";

    try {
        const res = await fetch(`https://api.themoviedb.org/3/${type === 'anime' ? 'tv' : type}/${id}?api_key=${TMDB_KEY}`);
        const data = await res.json();
        metaTitle = data.title || data.name || metaTitle;
        metaDesc = data.overview || metaDesc;
        metaImage = data.backdrop_path ? `https://image.tmdb.org/t/p/w780${data.backdrop_path}` : metaImage;
    } catch (e) {}

    return (
        <>
            {/* JSON-LD Structured Data for Video */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "VideoObject",
                        "name": metaTitle,
                        "description": metaDesc.slice(0, 160),
                        "thumbnailUrl": [metaImage],
                        "uploadDate": new Date().toISOString(),
                        "contentUrl": `https://toonplayer.in/watch/${type}/${id}`,
                        "embedUrl": `https://toonplayer.in/watch/${type}/${id}`,
                        "publisher": {
                            "@type": "Organization",
                            "name": "ToonPlayer",
                            "logo": {
                                "@type": "ImageObject",
                                "url": "https://toonplayer.in/icon.png"
                            }
                        }
                    })
                }}
            />
            {/* BreadcrumbList for navigation */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "BreadcrumbList",
                        "itemListElement": [
                            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://toonplayer.in" },
                            { "@type": "ListItem", "position": 2, "name": type === 'tv' ? 'TV Shows' : type === 'anime' ? 'Anime' : 'Movies', "item": `https://toonplayer.in/${type === 'anime' ? 'az-list/all' : 'discover'}` },
                            { "@type": "ListItem", "position": 3, "name": metaTitle, "item": `https://toonplayer.in/watch/${type}/${id}` },
                        ]
                    })
                }}
            />
            <Suspense fallback={<DetailsSkeleton />}>
                <WatchClient type={type} id={id} />
            </Suspense>
        </>
    );
}
