import { NextResponse } from "next/server";

/**
 * CinEvo Download API — Generates download links via dl.vidsrc.vip.
 * Supports movies and TV episodes (with season/episode parameters).
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        const type = searchParams.get("type") || "movie";
        const season = searchParams.get("season") || "1";
        const episode = searchParams.get("episode") || "1";

        if (!id) {
            return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
        }

        const isMovie = type === "movie";

        // Generate download links from multiple download providers
        const downloadLinks = [
            {
                name: "VidSrc Download",
                url: isMovie
                    ? `https://dl.vidsrc.vip/movie/${id}`
                    : `https://dl.vidsrc.vip/tv/${id}/${season}/${episode}`,
                quality: "Multi-Quality",
                type: "direct"
            },
            {
                name: "2Embed",
                url: isMovie
                    ? `https://www.2embed.cc/embed/${id}`
                    : `https://www.2embed.cc/embedtv/${id}&s=${season}&e=${episode}`,
                quality: "HD",
                type: "embed"
            },
            {
                name: "VidBinge Download",
                url: isMovie
                    ? `https://vidbinge.com/embed/movie/${id}`
                    : `https://vidbinge.com/embed/tv/${id}/${season}/${episode}`,
                quality: "4K/HD",
                type: "embed"
            }
        ];

        return NextResponse.json({
            tmdbId: id,
            type,
            season: isMovie ? null : parseInt(season),
            episode: isMovie ? null : parseInt(episode),
            downloads: downloadLinks,
            primaryDownload: downloadLinks[0].url,
        });
    } catch (error: any) {
        console.error("CinEvo Download API error:", error);
        return NextResponse.json({ error: "Failed to generate download links" }, { status: 500 });
    }
}
