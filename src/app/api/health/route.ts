import { NextResponse } from "next/server";
import axios from "axios";
import { providerHealth } from "@/lib/provider-health";

function getProviderNameFromUrl(url: string): string | null {
    const lower = url.toLowerCase();
    if (lower.includes('vidsrc.me')) return 'VidSrc ME';
    if (lower.includes('vidsrc.to')) return 'VidSrc TO';
    if (lower.includes('multiembed.com') || lower.includes('multiembed')) return 'SuperEmbed';
    if (lower.includes('autoembed.to') || lower.includes('autoembed')) return 'AutoEmbed';
    return null;
}

async function checkUrlWithRetry(url: string, retries = 3): Promise<{ url: string; alive: boolean; status?: number; error?: string; latency?: number }> {
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    const providerName = getProviderNameFromUrl(url);
    
    for (let attempt = 1; attempt <= retries; attempt++) {
        const start = Date.now();
        try {
            // Try HEAD request
            const response = await axios.head(url, { 
                timeout: 5000, 
                headers: { 
                    'User-Agent': userAgent,
                    'Referer': 'https://toonplayer.in/'
                },
                validateStatus: (status) => status < 400
            });
            const latency = Date.now() - start;
            if (providerName) {
                providerHealth.reportSuccess(providerName, latency);
            }
            return { url, alive: true, status: response.status, latency };
        } catch (err: any) {
            // HEAD request failed or blocked, try a light GET request as fallback
            try {
                const response = await axios.get(url, { 
                    timeout: 5000, 
                    headers: { 
                        'User-Agent': userAgent,
                        'Range': 'bytes=0-0',
                        'Referer': 'https://toonplayer.in/'
                    },
                    validateStatus: (status) => status < 400
                });
                const latency = Date.now() - start;
                if (providerName) {
                    providerHealth.reportSuccess(providerName, latency);
                }
                return { url, alive: true, status: response.status, latency };
            } catch (e: any) {
                if (attempt === retries) {
                    const errorMsg = e.message || "Connection failed";
                    if (providerName) {
                        providerHealth.reportError(providerName, errorMsg);
                    }
                    return { url, alive: false, status: e.response?.status, error: errorMsg };
                }
                // Small backoff before retry
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }
    }
    if (providerName) {
        providerHealth.reportError(providerName, "Max retries reached");
    }
    return { url, alive: false, error: "Max retries reached" };
}

export async function POST(request: Request) {
    try {
        const { urls } = await request.json();
        
        if (!urls || !Array.isArray(urls)) {
            return NextResponse.json({ error: "Invalid URLs list" }, { status: 400 });
        }

        // Parallel check all URLs with 5s timeout & 3 retries per URL
        const results = await Promise.allSettled(
            urls.map((url) => checkUrlWithRetry(url, 3))
        );

        const healthCheckResults = results.map((res: any) => 
            res.status === 'fulfilled' ? res.value : { url: 'unknown', alive: false, error: "Task rejected" }
        );

        return NextResponse.json({ results: healthCheckResults });
    } catch (error: any) {
        return NextResponse.json({ error: "Health check failed" }, { status: 500 });
    }
}
