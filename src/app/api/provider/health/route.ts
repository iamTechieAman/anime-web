import { NextRequest, NextResponse } from 'next/server';
import { providerHealth } from '@/lib/provider-health';

/** All tracked anime provider names */
const ALL_PROVIDERS = [
    'allanime', 'hianime', 'anikai', 'aniwatch',
    'consumet', 'gogoanime', 'animepahe',
    'aniwave', 'vidsrc', 'jikan',
];

export async function GET(request: NextRequest) {
    const stats = providerHealth.getStats();
    const records = Object.entries(stats).map(([name, stat]: [string, any]) => ({
        name,
        score: stat.isDead ? 0 : 100,
        status: stat.isDead ? 'down' : 'healthy',
        avgResponseMs: 0,
        successCount: stat.success,
        failureCount: stat.errors,
        lastSuccess: null,
        lastFailure: null,
        isBlacklisted: stat.isDead,
    }));

    const summary = {
        healthy: records.filter(r => r.score >= 60).length,
        degraded: 0,
        blacklisted: records.filter(r => r.isBlacklisted).length,
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
