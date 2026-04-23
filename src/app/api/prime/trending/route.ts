import { NextResponse } from "next/server";

const TMDB_KEY = "a46c50a0ccb1bafe2b15665df7fad7e1";
const TMDB_BASE = "https://api.themoviedb.org/3";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page") || "1";
    const type = searchParams.get("type") || "all"; // all, movie, tv
    const timeWindow = searchParams.get("window") || "week"; // day, week

    const res = await fetch(
      `${TMDB_BASE}/trending/${type}/${timeWindow}?api_key=${TMDB_KEY}&page=${page}`,
      { next: { revalidate: 3600 } }
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
    return NextResponse.json(
      { error: "Failed to fetch trending content" },
      { status: 500 }
    );
  }
}
