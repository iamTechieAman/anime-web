import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";
import { TwoEmbedProvider } from "@/lib/providers/twoembed";

const twoEmbed = new TwoEmbedProvider();
const TMDB_KEY = "a46c50a0ccb1bafe2b15665df7fad7e1";
const TMDB_BASE = "https://api.themoviedb.org/3";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page") || "1";
    const type = searchParams.get("type") || "all"; // all, movie, tv
    const timeWindow = searchParams.get("window") || "week"; // day, week

    const res = await fetchWithTimeout(
      `${TMDB_BASE}/trending/${type}/${timeWindow}?api_key=${TMDB_KEY}&page=${page}`,
      { next: { revalidate: 3600 } },
      3000
    );

    if (!res.ok) throw new Error(`TMDB API error: ${res.status}`);

    const data = await res.json();

    return NextResponse.json({
      results: data.results,
      page: data.page,
      total_pages: data.total_pages,
      total_results: data.total_results,
    });
  } catch (error: any) {
    console.error("Trending API error:", error);
    
    // 1. Optional 2Embed trending fallback
    try {
      const { searchParams } = new URL(request.url);
      const pageNum = parseInt(searchParams.get("page") || "1", 10) || 1;
      const type = searchParams.get("type") || "all";
      const windowParam = searchParams.get("window") === "day" ? "day" : "week";

      let twoEmbedResults: any[] = [];
      if (type === "movie") {
        twoEmbedResults = await twoEmbed.getTrendingMovies(windowParam, pageNum);
      } else if (type === "tv") {
        twoEmbedResults = await twoEmbed.getTrendingTv(windowParam, pageNum);
      } else {
        const [movies, tv] = await Promise.all([
          twoEmbed.getTrendingMovies(windowParam, pageNum).catch(() => []),
          twoEmbed.getTrendingTv(windowParam, pageNum).catch(() => []),
        ]);
        twoEmbedResults = [...movies, ...tv];
      }

      if (twoEmbedResults.length > 0) {
        return NextResponse.json({
          results: twoEmbedResults.map(item => ({
            id: item.tmdb_id || item.imdb_id || item.id,
            tmdb_id: item.tmdb_id,
            imdb_id: item.imdb_id,
            title: item.title,
            name: item.name,
            overview: item.overview,
            poster_path: item.poster_path,
            backdrop_path: item.backdrop_path,
            media_type: item.media_type,
            provider: 'twoembed',
          })),
          page: pageNum,
          total_pages: 10,
          total_results: twoEmbedResults.length,
          fromProvider: 'twoembed',
        }, {
          headers: { 'Cache-Control': 's-maxage=1800, stale-while-revalidate=86400' }
        });
      }
    } catch (twoEmbedErr: any) {
      console.warn("[Trending API] 2Embed trending fallback failed:", twoEmbedErr?.message);
    }

    // 2. Fallback to local static JSON files
    try {
      const { searchParams } = new URL(request.url);
      const type = searchParams.get("type") || "all";
      
      let fileName = "trending_all.json";
      if (type === "movie") {
        fileName = "trending_movies.json";
      } else if (type === "person") {
        fileName = "trending_person.json";
      }
      
      const filePath = path.join(process.cwd(), "public", "data", fileName);
      const fileContent = await fs.readFile(filePath, "utf-8");
      const data = JSON.parse(fileContent);
      console.log(`[Trending API] Loaded fallback static file via FS: ${fileName}`);
      return NextResponse.json({
        results: data.results || [],
        page: 1,
        total_pages: 1,
        total_results: data.results?.length || 0,
        fromFallback: true
      });
    } catch (fallbackErr: any) {
      console.error("Trending fallback error:", fallbackErr.message);
    }

    return NextResponse.json(
      { error: "Failed to fetch trending content", results: [], page: 1, total_pages: 1 },
      { status: 200 }
    );
  }
}
