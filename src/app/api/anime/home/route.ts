import { NextResponse } from "next/server";
import { getProvider } from "@/lib/providers";

export async function GET() {
    try {
        const provider = getProvider('aniwaves');
        if (!provider.getTrending || !provider.getRecent) {
            return NextResponse.json({ error: "Provider not fully implemented" }, { status: 400 });
        }

        const [trending, latest] = await Promise.all([
            provider.getTrending(),
            provider.getRecent()
        ]);

        return NextResponse.json({ trending, latest });
    } catch (error: any) {
        console.error("[AnimeHome] Failed:", error.message);
        return NextResponse.json({ error: "Failed to fetch anime home" }, { status: 500 });
    }
}
