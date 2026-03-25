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

        // Generate embed URLs for all servers — same as cinevo.site
        const servers = [
            {
                id: "vidlink",
                name: "VidLink Pro",
                badge: "Auto-Next",
                url: isMovie
                    ? `https://vidlink.pro/movie/${id}?primaryColor=3b82f6&secondaryColor=1e3a5f&autoplay=true&title=false`
                    : `https://vidlink.pro/tv/${id}/${season}/${episode}?primaryColor=3b82f6&secondaryColor=1e3a5f&autoplay=true&title=false`,
            },
            {
                id: "autoembed",
                name: "AutoEmbed Pro",
                badge: "HD",
                url: isMovie
                    ? `https://player.autoembed.cc/embed/movie/${id}`
                    : `https://player.autoembed.cc/embed/tv/${id}/${season}/${episode}`,
            },
            {
                id: "vidsrc_cc",
                name: "VidSrc",
                badge: "Stable",
                url: isMovie
                    ? `https://vidsrc.cc/v2/embed/movie/${id}`
                    : `https://vidsrc.cc/v2/embed/tv/${id}/${season}/${episode}`,
            },
            {
                id: "embedsu",
                name: "Embed.su",
                badge: "Multi-Quality",
                url: isMovie
                    ? `https://embed.su/embed/movie/${id}`
                    : `https://embed.su/embed/tv/${id}/${season}/${episode}`,
            },
            {
                id: "multiembed",
                name: "MultiEmbed",
                badge: "Reliable",
                url: isMovie
                    ? `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1`
                    : `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1&s=${season}&e=${episode}`,
            },
            {
                id: "smashy",
                name: "SmashyStream",
                badge: "Fast",
                url: isMovie
                    ? `https://embed.smashystream.com/playere.php?tmdb=${id}`
                    : `https://embed.smashystream.com/playere.php?tmdb=${id}&season=${season}&episode=${episode}`,
            },
            {
                id: "2embed",
                name: "2Embed",
                badge: null,
                url: isMovie
                    ? `https://www.2embed.cc/embed/${id}`
                    : `https://www.2embed.cc/embedtv/${id}&s=${season}&e=${episode}`,
            },
            {
                id: "vidsrc_net",
                name: "VidSrc.net",
                badge: "Backup",
                url: isMovie
                    ? `https://vidsrc.net/embed/movie/${id}`
                    : `https://vidsrc.net/embed/tv/${id}/${season}/${episode}`,
            },
            {
                id: "cineby",
                name: "CineBy",
                badge: "Fast",
                url: isMovie
                    ? `https://www.cineby.gd/embed/movie?tmdb=${id}`
                    : `https://www.cineby.gd/embed/tv?tmdb=${id}&s=${season}&e=${episode}`,
            },
            {
                id: "vidbinge",
                name: "VidBinge",
                badge: "4K",
                url: isMovie
                    ? `https://vidbinge.com/embed/movie/${id}`
                    : `https://vidbinge.com/embed/tv/${id}/${season}/${episode}`,
            },
            {
                id: "peachify",
                name: "ToonPlayer VIP",
                badge: "Multi-Audio",
                url: isMovie
                    ? `https://peachify.top/?type=movie&id=${id}`
                    : `https://peachify.top/?type=tv&id=${id}&s=${season}&e=${episode}`,
            },
            {
                id: "nontongo",
                name: "NontonGo",
                badge: null,
                url: isMovie
                    ? `https://www.nontongo.win/embed/movie/${id}`
                    : `https://www.nontongo.win/embed/tv/${id}/${season}/${episode}`,
            },
            {
                id: "rivestream",
                name: "RiveStream",
                badge: "HD",
                url: isMovie
                    ? `https://rivestream.org/embed?type=movie&id=${id}`
                    : `https://rivestream.org/embed?type=tv&id=${id}&s=${season}&e=${episode}`,
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
