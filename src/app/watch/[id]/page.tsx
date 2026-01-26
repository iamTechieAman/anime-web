import WatchClient from "./WatchClient";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    try {
        // Fetch show data for metadata
        // Note: In a real app, you might want to cache this or use a shared fetch utility
        const res = await fetch(`https://anime-web-neon-one.vercel.app/api/anime/episodes?id=${id}`).then(r => r.json());
        const show = res.show;

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

export default async function WatchPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <WatchClient id={id} />;
}
