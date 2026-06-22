import { NextResponse } from "next/server";

const TMDB_KEY = "a46c50a0ccb1bafe2b15665df7fad7e1";
const TMDB_BASE = "https://api.themoviedb.org/3";

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms))
    ]);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page") || "1";
    const type = searchParams.get("type") || "all"; // all, movie, tv
    const timeWindow = searchParams.get("window") || "week"; // day, week

    const res = await withTimeout(fetch(
      `${TMDB_BASE}/trending/${type}/${timeWindow}?api_key=${TMDB_KEY}&page=${page}`,
      { next: { revalidate: 3600 } }
    ), 3000);

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
    
    // Fallback to local static JSON files
    try {
      const { searchParams } = new URL(request.url);
      const type = searchParams.get("type") || "all";
      
      let fileName = "trending_all.json";
      if (type === "movie") {
        fileName = "trending_movies.json";
      } else if (type === "person") {
        fileName = "trending_person.json";
      }
      
      const fallbackUrl = new URL(`/data/${fileName}`, request.url);
      const fallbackRes = await fetch(fallbackUrl);
      if (fallbackRes.ok) {
        const data = await fallbackRes.json();
        console.log(`[Trending API] Loaded fallback static file: ${fileName}`);
        return NextResponse.json({
          results: data.results || [],
          page: 1,
          total_pages: 1,
          total_results: data.results?.length || 0,
          fromFallback: true
        });
      }
    } catch (fallbackErr: any) {
      console.error("Trending fallback error:", fallbackErr.message);
    }

    return NextResponse.json(
      { error: "Failed to fetch trending content", results: [], page: 1, total_pages: 1 },
      { status: 200 }
    );
  }
}
