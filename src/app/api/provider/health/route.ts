import { NextRequest, NextResponse } from 'next/server';
import { getAllHealth, resetHealth, getHealth } from '@/lib/provider-health';

/** All tracked anime provider names */
const ALL_PROVIDERS = [
    'allanime', 'hianime', 'anikai', 'aniwatch',
    'consumet', 'gogoanime', 'animepahe',
    'aniwave', 'vidsrc', 'jikan',
];

/**
 * GET /api/provider/health
 * Returns live health scores for all anime providers.
 * Used by: frontend Server Status display, source route for dynamic ordering.
 *
 * Query params:
 * - ?reset=<providerName>  → resets that provider's health record
 * - ?provider=<name>       → get health for single provider
 */
export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl;
    const resetParam = searchParams.get('reset');
    const singleParam = searchParams.get('provider');

    // Reset a single provider's health
    if (resetParam) {
        resetHealth(resetParam);
        return NextResponse.json({
            success: true,
            message: `Health record reset for: ${resetParam}`,
        });
    }

    // Single provider query
    if (singleParam) {
        const record = getHealth(singleParam);
        return NextResponse.json(
            { provider: record },
            {
                headers: {
                    'Cache-Control': 'no-store',
                    'Access-Control-Allow-Origin': '*',
                },
            }
        );
    }

    // All providers
    const records = getAllHealth(ALL_PROVIDERS);

    const summary = {
        healthy: records.filter(r => r.score >= 60).length,
        degraded: records.filter(r => r.score >= 20 && r.score < 60).length,
        blacklisted: records.filter(r => r.isBlacklisted).length,
        total: records.length,
    };

    return NextResponse.json(
        {
            summary,
            providers: records.map(r => ({
                name: r.provider,
                score: r.score,
                status: r.score >= 60 ? 'healthy' : r.score >= 20 ? 'degraded' : 'down',
                avgResponseMs: r.avgResponseMs,
                successCount: r.successCount,
                failureCount: r.failureCount,
                lastSuccess: r.lastSuccess ? new Date(r.lastSuccess).toISOString() : null,
                lastFailure: r.lastFailure ? new Date(r.lastFailure).toISOString() : null,
                isBlacklisted: r.isBlacklisted,
            })),
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
