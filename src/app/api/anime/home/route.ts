import { NextResponse } from "next/server";
import { AnikaiProvider } from "@/lib/providers/anikai";

export const revalidate = 0;

export async function GET() {
    try {
        const provider = new AnikaiProvider();
        const data = await provider.getHome();

        // Enhance slides with fallback images if needed (client side can handle too)
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
