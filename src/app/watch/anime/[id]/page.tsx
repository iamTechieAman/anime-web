import { Suspense } from "react";
import WatchClient from "./WatchClient";
import { fetchWithTimeout } from "@/lib/utils/fetch";
import { safeJsonLd } from "@/lib/sanitizer";


const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.toonplayer.in';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    try {
        // Fetch show data for metadata
        // Note: In a real app, you might want to cache this or use a shared fetch utility
        const res = await fetchWithTimeout(fetch(`${SITE_URL}/api/anime/episodes?id=${encodeURIComponent(id)}`), 3000);
        const data = await res.json();
        const show = data.show;

        if (!show) {
            return {
                title: 'Anime Not Found | ToonPlayer',
                description: 'The requested anime could not be found on ToonPlayer.'
            }
        }

        return {
            title: `Watch ${show.name} Online Free HD`,
            description: `Stream ${show.name} in HD with English Sub/Dub. ${show.description || 'Watch now on ToonPlayer for free.'}`,
            openGraph: {
                title: `Watch ${show.name} - ToonPlayer`,
                description: `Stream ${show.name} in HD. No ads, high quality.`,
                images: [
                    {
                        url: show.thumbnail || '/og-image.jpg',
                        width: 1200,
                        height: 630,
                        alt: show.name,
                    }
                ],
            },
            twitter: {
                card: 'summary_large_image',
                title: `Watch ${show.name}`,
                description: `Stream ${show.name} in HD on ToonPlayer.`,
                images: [show.thumbnail || '/og-image.jpg'],
            }
        }
    } catch (e) {
        return {
            title: 'Watch Anime Online | ToonPlayer',
            description: 'Stream your favorite anime in HD on ToonPlayer.'
        }
    }
}

export default async function WatchPage({ params, searchParams }: { params: any, searchParams: any }) {
    const { id } = await params;
    const { ep } = await searchParams;

    console.log(`[GlobalClickDebugger] 🛣️ ROUTE ID (Anime): ${id} | EP: ${ep || 1}`);

    let metaTitle = "Anime Show";
    let metaDesc = "Watch free HD anime on ToonPlayer";
    let metaImage = "https://www.toonplayer.in/icon.png";

    try {
        const res = await fetchWithTimeout(fetch(`${SITE_URL}/api/anime/episodes?id=${encodeURIComponent(id)}`), 3000);
        const data = await res.json();
        const show = data.show;
        if (show) {
            metaTitle = show.name || metaTitle;
            metaDesc = show.description || metaDesc;
            metaImage = show.thumbnail || metaImage;
        }
    } catch (e) {}

    return (
        <>
            {/* JSON-LD Structured Data for Video */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: safeJsonLd({
                        "@context": "https://schema.org",
                        "@type": "VideoObject",
                        "name": metaTitle,
                        "description": metaDesc.slice(0, 160),
                        "thumbnailUrl": [metaImage],
                        "uploadDate": new Date().toISOString(),
                        "contentUrl": `https://www.toonplayer.in/watch/anime/${id}`,
                        "embedUrl": `https://www.toonplayer.in/watch/anime/${id}`,
                        "publisher": {
                            "@type": "Organization",
                            "name": "ToonPlayer",
                            "logo": {
                                "@type": "ImageObject",
                                "url": "https://www.toonplayer.in/icon.png"
                            }
                        }
                    })
                }}
            />
            {/* BreadcrumbList for navigation */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: safeJsonLd({
                        "@context": "https://schema.org",
                        "@type": "BreadcrumbList",
                        "itemListElement": [
                            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.toonplayer.in" },
                            { "@type": "ListItem", "position": 2, "name": "Anime", "item": "https://www.toonplayer.in/az-list/all" },
                            { "@type": "ListItem", "position": 3, "name": metaTitle, "item": `https://www.toonplayer.in/watch/anime/${id}` },
                        ]
                    })
                }}
            />
            <Suspense fallback={<div className="min-h-dvh pt-24 text-center text-accent-warm font-bold bg-bg-main">Loading Player...</div>}>
                <WatchClient key={`anime-${id}-ep${ep || '1'}`} id={id} />
            </Suspense>
        </>
    );
}
