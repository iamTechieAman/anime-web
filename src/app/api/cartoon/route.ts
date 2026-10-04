import { NextResponse } from "next/server";
import { getHomeCartoons, searchCartoons } from "@/lib/providers/kartoons";
import { fetchFromScraper } from "@/lib/scraper-client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const category = searchParams.get('category') || 'cartoon';

    // 1. Try Kartoons.to primary provider
    try {
      if (query && query.trim()) {
        const searchResults = await searchCartoons(query);
        if (searchResults && searchResults.length > 0) {
          return NextResponse.json({
            shows: searchResults.map((item) => ({
              _id: item.id,
              name: item.title,
              thumbnail: item.poster || item.banner,
              type: item.type === 'movie' ? 'movie' : 'cartoon',
              provider: 'kartoons',
              is_series: item.type !== 'movie',
              description: item.description,
              rating: item.rating,
              year: item.year,
            })),
          });
        }
      } else {
        const homeData = await getHomeCartoons();
        if (homeData.featured.length > 0 || homeData.movies.length > 0) {
          const combined = [...homeData.featured, ...homeData.movies];
          return NextResponse.json({
            shows: combined.map((item) => ({
              _id: item.id,
              name: item.title,
              thumbnail: item.poster || item.banner,
              type: item.type === 'movie' ? 'movie' : 'cartoon',
              provider: 'kartoons',
              is_series: item.type !== 'movie',
              description: item.description,
              rating: item.rating,
              year: item.year,
            })),
          });
        }
      }
    } catch (kartoonsErr) {
      console.warn('[Cartoon API] Kartoons provider failed, falling back to legacy scraper client:', kartoonsErr);
    }

    // 2. Fallback to legacy scraper client
    const data = await fetchFromScraper({
      cartoon_query: query || undefined,
      cartoon_category: !query ? category : undefined,
    });

    return NextResponse.json({
      shows: (data.watchanimeworld || []).map((item: any) => ({
        _id: item.id,
        name: item.title,
        thumbnail: item.image,
        type: item.type,
        provider: 'watchanimeworld',
        is_series: item.is_series,
      })),
    });
  } catch (error: any) {
    console.error("[Cartoon API] Full Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        detail: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
