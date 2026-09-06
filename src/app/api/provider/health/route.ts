import { NextRequest, NextResponse } from 'next/server';
import { providerHealth } from '@/lib/provider-health';
import axios from 'axios';

const PROVIDER_TARGETS: { name: string; category: 'metadata' | 'stream'; url: string }[] = [
    { name: 'TMDB API', category: 'metadata', url: 'https://api.themoviedb.org/3' },
    { name: 'AniList API', category: 'metadata', url: 'https://graphql.anilist.co' },
    { name: 'Jikan API', category: 'metadata', url: 'https://api.jikan.moe/v4/status' },
    { name: 'VidSrc ME', category: 'stream', url: 'https://vidsrc.me' },
    { name: 'VidSrc TO', category: 'stream', url: 'https://vidsrc.to' },
    { name: 'SuperEmbed', category: 'stream', url: 'https://multiembed.com.co' },
    { name: 'AutoEmbed', category: 'stream', url: 'https://player.autoembed.to' },
    { name: 'HiAnime', category: 'stream', url: 'https://hianime.to' },
    { name: 'Gogoanime', category: 'stream', url: 'https://gogoanime3.co' }
];

async function pingTarget(name: string, url: string, retries = 2): Promise<void> {
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    let lastError = '';

    for (let attempt = 1; attempt <= retries; attempt++) {
        const start = Date.now();
        try {
            // Try HEAD request first for efficiency
            await axios.head(url, {
                timeout: 4000,
                headers: { 
                    'User-Agent': userAgent,
                    'Referer': 'https://toonplayer.in/'
                },
                validateStatus: (status) => status < 500 // Allow 404/403 since it proves server is alive & reachable
            });
            const latency = Date.now() - start;
            providerHealth.reportSuccess(name, latency);
            return;
        } catch (err: any) {
            // Fallback to GET check
            try {
                await axios.get(url, {
                    timeout: 4000,
                    headers: { 
                        'User-Agent': userAgent,
                        'Referer': 'https://toonplayer.in/'
                    },
                    validateStatus: (status) => status < 500
                });
                const latency = Date.now() - start;
                providerHealth.reportSuccess(name, latency);
                return;
            } catch (e: any) {
                lastError = e.message || 'Connection failed';
                if (attempt < retries) {
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
            }
        }
    }
    // Only genuine connection / network failures are marked as UNAVAILABLE
    providerHealth.reportError(name, `${lastError} (after ${retries} attempts)`, 'UNAVAILABLE');
}

export async function GET(request: NextRequest) {
    const stats = providerHealth.getStats();
    const records = Object.entries(stats).map(([name, stat]: [string, any]) => ({
        name: stat.name || name,
        category: stat.category || 'stream',
        score: stat.healthScore ?? (stat.isDead ? 0 : 100),
        status: stat.isDead ? 'UNAVAILABLE' : (stat.status || 'HEALTHY'),
        isReachable: !stat.isDead,
        avgResponseMs: stat.avgResponseMs || 0,
        successCount: stat.successCount || 0,
        failureCount: stat.failureCount || 0,
        lastChecked: stat.lastChecked,
        isBlacklisted: stat.isDead,
        uptimePercentage: stat.uptimePercentage ?? 100,
        errorLogs: stat.errorLogs || [],
        recentDiagnostics: stat.recentDiagnostics || []
    }));

    const summary = {
        healthy: records.filter(r => r.status === 'HEALTHY').length,
        degraded: records.filter(r => r.status === 'DEGRADED').length,
        scraperErrors: records.filter(r => r.status === 'SCRAPER_ERROR').length,
        temporaryFailures: records.filter(r => r.status === 'TEMPORARY_FAILURE').length,
        unavailable: records.filter(r => r.status === 'UNAVAILABLE').length,
        unsupported: records.filter(r => r.status === 'UNSUPPORTED').length,
        slow: records.filter(r => r.status === 'DEGRADED').length,
        offline: records.filter(r => r.status === 'UNAVAILABLE').length,
        total: records.length,
    };

    return NextResponse.json(
        {
            summary,
            providers: records,
            updatedAt: new Date().toISOString(),
        },
        {
            headers: {
                'Cache-Control': 'no-store, no-cache',
                'Access-Control-Allow-Origin': '*',
            },
        }
    );
}

export async function POST(request: NextRequest) {
    try {
        // Run pings in parallel
        await Promise.allSettled(
            PROVIDER_TARGETS.map(target => pingTarget(target.name, target.url, 2))
        );

        return GET(request);
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Failed to ping providers' }, { status: 500 });
    }
}

