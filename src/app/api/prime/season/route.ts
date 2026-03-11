import { NextResponse } from "next/server";

const TMDB_KEY = "a46c50a0ccb1bafe2b15665df7fad7e1";
const TMDB_BASE = "https://api.themoviedb.org/3";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        const season = searchParams.get("season") || "1";

        if (!id) {
            return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
        }

        const res = await fetch(`${TMDB_BASE}/tv/${id}/season/${season}?api_key=${TMDB_KEY}&language=en-US`);

        if (!res.ok) {
            return NextResponse.json({ error: "Failed to fetch season details" }, { status: res.status });
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
