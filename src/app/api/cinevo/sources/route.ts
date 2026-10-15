import { NextResponse } from "next/server";

/**
 * CinEvo Sources API — Generates multi-server embed URLs for streaming.
 * Mirrors the server architecture of cinevo.site.
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        const type = searchParams.get("type") || "movie"; // movie or tv
        const season = parseInt(searchParams.get("season") || "1");
        const episode = parseInt(searchParams.get("episode") || "1");

        if (!id) {
            return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
        }

        const isMovie = type === "movie";

        // Generate embed URLs for all servers — verified from Onoflix collection
        const servers = [
            {
                id: "vidcore",
                name: "Toon Player Core",
                badge: "Core HD",
                url: isMovie
                    ? `https://vidcore.net/movie/${id}`
                    : `https://vidcore.net/tv/${id}/${season}/${episode}`,
            },
            {
                id: "embedmaster",
                name: "Toon Player Master",
                badge: "Master",
                url: isMovie
                    ? `https://embedmaster.link/movie/${id}`
                    : `https://embedmaster.link/tv/${id}/${season}/${episode}`,
            },
            {
                id: "peachify",
                name: "ToonPlayer VIP",
                badge: "Multi-Audio",
                url: isMovie
                    ? `https://peachify.top/?type=movie&id=${id}&autoplay=1`
                    : `https://peachify.top/?type=tv&id=${id}&s=${season}&e=${episode}&autoplay=1`,
            },
            {
                id: "vidfast",
                name: "Toon Player Fast",
                badge: "Auto-Next",
                url: isMovie
                    ? `https://vidfast.pro/movie/${id}?autoPlay=true&title=true&poster=true`
                    : `https://vidfast.pro/tv/${id}/${season}/${episode}?autoPlay=true&title=true&poster=true&nextButton=true`,
            },
            {
                id: "vidnest",
                name: "Toon Player Nest",
                badge: "Ultra",
                url: isMovie
                    ? `https://vidnest.fun/movie/${id}`
                    : `https://vidnest.fun/tv/${id}/${season}/${episode}`,
            },
            {
                id: "vidlink",
                name: "Toon Player Link",
                badge: "VidLink",
                url: isMovie
                    ? `https://vidlink.pro/movie/${id}?primaryColor=7C3AED&title=false&autoplay=true`
                    : `https://vidlink.pro/tv/${id}/${season}/${episode}?primaryColor=7C3AED&title=false&autoplay=true`,
            },
            {
                id: "vidrock",
                name: "Toon Player Rock",
                badge: "Stable",
                url: isMovie
                    ? `https://vidrock.net/movie/${id}`
                    : `https://vidrock.net/tv/${id}/${season}/${episode}`,
            },
            {
                id: "vidking",
                name: "Toon Player King",
                badge: "Cinema",
                url: isMovie
                    ? `https://www.vidking.net/embed/movie/${id}`
                    : `https://www.vidking.net/embed/tv/${id}/${season}/${episode}`,
            },
            {
                id: "vixsrc",
                name: "Toon Player Vix",
                badge: "HD",
                url: isMovie
                    ? `https://vixsrc.to/movie/${id}`
                    : `https://vixsrc.to/tv/${id}/${season}/${episode}`,
            },
            {
                id: "videasy",
                name: "Toon Player Easy",
                badge: "Stream",
                url: isMovie
                    ? `https://player.videasy.net/movie/${id}`
                    : `https://player.videasy.net/tv/${id}/${season}/${episode}`,
            },
            {
                id: "vidsrc_embed_ru",
                name: "Toon Player VidSrc",
                badge: "VidSrc",
                url: isMovie
                    ? `https://vidsrc-embed.ru/embed/movie?tmdb=${id}&autoplay=1&ds_lang=en`
                    : `https://vidsrc-embed.ru/embed/tv?tmdb=${id}&season=${season}&episode=${episode}&autoplay=1&ds_lang=en`,
            },
            {
                id: "smashy",
                name: "Toon Player Smashy",
                badge: "Multi-Host",
                url: isMovie
                    ? `https://player.smashystream.com/movie/${id}`
                    : `https://player.smashystream.com/show/${id}/${season}/${episode}`,
            },
            {
                id: "vidora",
                name: "Toon Player Vidora",
                badge: "Alt",
                url: isMovie
                    ? `https://vidora.su/movie/${id}`
                    : `https://vidora.su/tv/${id}/${season}/${episode}`,
            },
            {
                id: "movies111",
                name: "Toon 111",
                badge: "Mirror",
                url: isMovie
                    ? `https://111movies.com/movie/${id}`
                    : `https://111movies.com/tv/${id}/${season}/${episode}`,
            },
        ];

        return NextResponse.json({
            tmdbId: id,
            type,
            season: isMovie ? null : season,
            episode: isMovie ? null : episode,
            servers,
            totalServers: servers.length,
        });
    } catch (error: any) {
        console.error("CinEvo Sources API error:", error);
        return NextResponse.json({ error: "Failed to generate sources" }, { status: 500 });
    }
}
