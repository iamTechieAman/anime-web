import { NextResponse } from 'next/server';

export const revalidate = 3600; // Cache for 1 hour

// Default fallback list of verified servers matching Onoflix collection with custom Toon branding
const FALLBACK_SOURCES = [
    {
        id: "source-0",
        name: "Toon Player Core",
        badge: "Core HD",
        movieUrl: "https://vidcore.net/movie/{id}",
        tvUrl: "https://vidcore.net/tv/{id}/{season}/{episode}",
        featured: true,
        priority: 0,
        enabled: true,
        isDefault: true,
    },
    {
        id: "source-1",
        name: "Toon Player VIP",
        badge: "Multi-Audio",
        movieUrl: "https://peachify.top/?type=movie&id={id}&autoplay=1",
        tvUrl: "https://peachify.top/?type=tv&id={id}&s={season}&e={episode}&autoplay=1",
        featured: true,
        priority: 1,
        enabled: true,
    },
    {
        id: "source-2",
        name: "Toon Player Master",
        badge: "Master",
        movieUrl: "https://embedmaster.link/movie/{id}",
        tvUrl: "https://embedmaster.link/tv/{id}/{season}/{episode}",
        featured: true,
        priority: 2,
        enabled: true,
    },
    {
        id: "source-3",
        name: "Toon Player Fast",
        badge: "Auto-Next",
        movieUrl: "https://vidfast.pro/movie/{id}?autoPlay=true&title=true&poster=true",
        tvUrl: "https://vidfast.pro/tv/{id}/{season}/{episode}?autoPlay=true&title=true&poster=true&nextButton=true",
        featured: true,
        priority: 3,
        enabled: true,
    },
    {
        id: "source-4",
        name: "Toon Player Nest",
        badge: "Ultra",
        movieUrl: "https://vidnest.fun/movie/{id}",
        tvUrl: "https://vidnest.fun/tv/{id}/{season}/{episode}",
        featured: true,
        priority: 4,
        enabled: true,
    },
    {
        id: "source-5",
        name: "Toon Player Link",
        badge: "VidLink",
        movieUrl: "https://vidlink.pro/movie/{id}?primaryColor=7C3AED&title=false&autoplay=true",
        tvUrl: "https://vidlink.pro/tv/{id}/{season}/{episode}?primaryColor=7C3AED&title=false&autoplay=true",
        featured: true,
        priority: 5,
        enabled: true,
    },
    {
        id: "source-6",
        name: "Toon Player Rock",
        badge: "Stable",
        movieUrl: "https://vidrock.net/movie/{id}",
        tvUrl: "https://vidrock.net/tv/{id}/{season}/{episode}",
        featured: true,
        priority: 6,
        enabled: true,
    },
    {
        id: "source-7",
        name: "Toon Player King",
        badge: "Cinema",
        movieUrl: "https://www.vidking.net/embed/movie/{id}",
        tvUrl: "https://www.vidking.net/embed/tv/{id}/{season}/{episode}",
        featured: true,
        priority: 7,
        enabled: true,
    },
    {
        id: "source-8",
        name: "Toon Player Vix",
        badge: "HD",
        movieUrl: "https://vixsrc.to/movie/{id}",
        tvUrl: "https://vixsrc.to/tv/{id}/{season}/{episode}",
        featured: true,
        priority: 8,
        enabled: true,
    },
    {
        id: "source-9",
        name: "Toon Player Easy",
        badge: "Stream",
        movieUrl: "https://player.videasy.net/movie/{id}",
        tvUrl: "https://player.videasy.net/tv/{id}/{season}/{episode}",
        featured: false,
        priority: 9,
        enabled: true,
    },
    {
        id: "source-10",
        name: "Toon Player VidSrc",
        badge: "VidSrc",
        movieUrl: "https://vidsrc-embed.ru/embed/movie?tmdb={id}&autoplay=1&ds_lang=en",
        tvUrl: "https://vidsrc-embed.ru/embed/tv?tmdb={id}&season={season}&episode={episode}&autoplay=1&ds_lang=en",
        featured: false,
        priority: 10,
        enabled: true,
    },
    {
        id: "source-11",
        name: "Toon Player Smashy",
        badge: "Multi-Host",
        movieUrl: "https://player.smashystream.com/movie/{id}",
        tvUrl: "https://player.smashystream.com/show/{id}/{season}/{episode}",
        featured: false,
        priority: 11,
        enabled: true,
    },
    {
        id: "source-12",
        name: "Toon Player Vidora",
        badge: "Alt",
        movieUrl: "https://vidora.su/movie/{id}",
        tvUrl: "https://vidora.su/tv/{id}/{season}/{episode}",
        featured: false,
        priority: 12,
        enabled: true,
    },
    {
        id: "source-13",
        name: "Toon 111",
        badge: "Mirror",
        movieUrl: "https://111movies.com/movie/{id}",
        tvUrl: "https://111movies.com/tv/{id}/{season}/{episode}",
        featured: false,
        priority: 13,
        enabled: true,
    },
];

const BRANDING_MAP: Record<string, string> = {
    peachify: "Toon Player VIP",
    vidcore: "Toon Player Core",
    embedmaster: "Toon Player Master",
    movies111: "Toon 111",
    vidsrc: "Toon Player VidSrc",
    vidnest: "Toon Player Nest",
    vidify: "Toon Player Vidify",
    vidfast: "Toon Player Fast",
    vixsrc: "Toon Player Vix",
    videasy: "Toon Player Easy",
    vidking: "Toon Player King",
    vidplus: "Toon Player Plus",
    vidrock: "Toon Player Rock",
    smashy: "Toon Player Smashy",
    vidora: "Toon Player Vidora",
    vidlink: "Toon Player Link",
};

export async function GET() {
    try {
        const response = await fetch("https://onoflix.live/api/sources/cached", {
            headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                "Referer": "https://onoflix.live/",
            },
            next: { revalidate: 3600 },
        });

        if (!response.ok) {
            return NextResponse.json({ sources: FALLBACK_SOURCES, fromCache: false, isFallback: true });
        }

        const data = await response.json();
        const sources = (data.sources || []).map((s: any) => {
            const rawKey = (s.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
            const brandedName = BRANDING_MAP[rawKey] || `Toon Player ${s.name}`;
            return {
                ...s,
                name: brandedName,
                originalName: s.name,
            };
        });

        return NextResponse.json({
            sources: sources.length > 0 ? sources : FALLBACK_SOURCES,
            fromCache: true,
            version: "toon-synced-v1",
            timestamp: Date.now(),
        });
    } catch (err: any) {
        console.error("[Sources Cached] Failed to fetch live sources, serving fallback:", err?.message);
        return NextResponse.json({ sources: FALLBACK_SOURCES, fromCache: false, isFallback: true });
    }
}
