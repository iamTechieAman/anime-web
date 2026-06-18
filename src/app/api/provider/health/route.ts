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

async function pingTarget(name: string, url: string, retries = 3): Promise<void> {
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    let lastError = '';
    
    for (let attempt = 1; attempt <= retries; attempt++) {
        const start = Date.now();
        try {
            // Try HEAD request first for efficiency
            await axios.head(url, {
                timeout: 5000,
                headers: { 
                    'User-Agent': userAgent,
                    'Referer': 'https://toonplayer.in/'
                },
                validateStatus: (status) => status < 500 // Allow 404/403 since it proves server is alive
            });
            const latency = Date.now() - start;
            providerHealth.reportSuccess(name, latency);
            return;
        } catch (err: any) {
            // Fallback to GET check
            try {
                await axios.get(url, {
                    timeout: 5000,
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
    providerHealth.reportError(name, `${lastError} (after ${retries} attempts)`);
}

export async function GET(request: NextRequest) {
    const stats = providerHealth.getStats();
    const records = Object.entries(stats).map(([name, stat]: [string, any]) => ({
        name,
        category: stat.category || 'stream',
        score: stat.healthScore ?? (stat.isDead ? 0 : 100),
        status: stat.isDead ? 'offline' : (stat.status || 'healthy'),
        avgResponseMs: stat.avgResponseMs || 0,
        successCount: stat.successCount || 0,
        failureCount: stat.failureCount || 0,
        lastChecked: stat.lastChecked,
        isBlacklisted: stat.isDead,
        uptimePercentage: stat.uptimePercentage ?? 100,
        errorLogs: stat.errorLogs || []
    }));

    const summary = {
        healthy: records.filter(r => r.status === 'healthy').length,
        slow: records.filter(r => r.status === 'slow').length,
        offline: records.filter(r => r.status === 'offline').length,
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
            PROVIDER_TARGETS.map(target => pingTarget(target.name, target.url, 3))
        );

        return GET(request);
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Failed to ping providers' }, { status: 500 });
    }
}
