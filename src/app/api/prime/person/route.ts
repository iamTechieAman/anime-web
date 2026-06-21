import { NextResponse } from "next/server";

// CRITICAL: Keep TMDB key server-side only — never in client bundles
const TMDB_KEY = process.env.TMDB_API_KEY || "522103f166160100778c1995804369a4";
const TMDB_BASE = "https://api.themoviedb.org/3";

export const revalidate = 3600;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const personId = searchParams.get("id");

    if (!personId) {
        return NextResponse.json({ error: "Missing person id" }, { status: 400 });
    }

    try {
        const [bioRes, creditsRes] = await Promise.all([
            fetch(
                `${TMDB_BASE}/person/${personId}?api_key=${TMDB_KEY}&language=en-US`,
                { signal: AbortSignal.timeout(5000), next: { revalidate: 3600 } }
            ),
            fetch(
                `${TMDB_BASE}/person/${personId}/combined_credits?api_key=${TMDB_KEY}&language=en-US`,
                { signal: AbortSignal.timeout(5000), next: { revalidate: 3600 } }
            ),
        ]);

        const bio = bioRes.ok ? await bioRes.json() : null;
        const credits = creditsRes.ok ? await creditsRes.json() : null;

        return NextResponse.json({ bio, credits });
    } catch (err: any) {
        console.error("[Person API]", err.message);
        return NextResponse.json({ bio: null, credits: null }, { status: 500 });
    }
}
