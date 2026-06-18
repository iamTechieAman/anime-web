import { NextResponse } from "next/server";
import axios from "axios";
import { providerHealth } from "@/lib/provider-health";

// GET handler — simple ping response (prevents 504 on GET requests)
export async function GET() {
    return NextResponse.json({ status: "ok", timestamp: Date.now() });
}

function getProviderNameFromUrl(url: string): string | null {
    const lower = url.toLowerCase();
    if (lower.includes('vidsrc.me')) return 'VidSrc ME';
    if (lower.includes('vidsrc.to')) return 'VidSrc TO';
    if (lower.includes('multiembed')) return 'SuperEmbed';
    if (lower.includes('autoembed')) return 'AutoEmbed';
    return null;
}

async function checkUrl(url: string): Promise<{ url: string; alive: boolean; status?: number; error?: string; latency?: number }> {
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
    const providerName = getProviderNameFromUrl(url);
    const start = Date.now();

    try {
        const response = await axios.head(url, {
            timeout: 3000, // 3s max per URL (down from 5s × 3 retries)
            headers: { 'User-Agent': userAgent, 'Referer': 'https://toonplayer.in/' },
            validateStatus: (status) => status < 500
        });
        const latency = Date.now() - start;
        if (providerName) providerHealth.reportSuccess(providerName, latency);
        return { url, alive: true, status: response.status, latency };
    } catch (err: any) {
        const latency = Date.now() - start;
        const errorMsg = err.message || "Connection failed";
        if (providerName) providerHealth.reportError(providerName, errorMsg);
        return { url, alive: false, latency, error: errorMsg };
    }
}

export async function POST(request: Request) {
    try {
        const { urls } = await request.json();

        if (!urls || !Array.isArray(urls) || urls.length === 0) {
            return NextResponse.json({ error: "Invalid URLs list" }, { status: 400 });
        }

        // Cap at 5 URLs and add 8s overall timeout to prevent Vercel 504
        const cappedUrls = urls.slice(0, 5);
        const deadline = new Promise<null>(resolve => setTimeout(() => resolve(null), 8000));

        const checks = Promise.allSettled(cappedUrls.map(checkUrl));
        const winner = await Promise.race([checks, deadline]);

        if (!winner) {
            // Deadline hit — return partial timeout response
            return NextResponse.json({
                results: cappedUrls.map(url => ({ url, alive: false, error: "Health check timed out" })),
                partial: true
            });
        }

        const healthCheckResults = (winner as PromiseSettledResult<any>[]).map((res) =>
            res.status === 'fulfilled' ? res.value : { url: 'unknown', alive: false, error: "Task rejected" }
        );

        return NextResponse.json({ results: healthCheckResults });
    } catch (error: any) {
        return NextResponse.json({ error: "Health check failed" }, { status: 500 });
    }
}
