import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { ServerModel } from '@/models/Server';
import { INITIAL_SERVERS } from './seed/route';
import { getCanonicalProviderId } from '@/lib/providers/registry';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'movie';

    const getStaticFallback = () => {
        return INITIAL_SERVERS.filter(s => {
            if (type === 'all') return true;
            if (type === 'anime') return s.type === 'anime';
            if (type === 'tv' || type === 'cartoon') return s.type === 'tv';
            if (type === 'movie') return s.type === 'movie';
            return s.type === type;
        }).map(s => ({
            ...s,
            canonicalId: s.canonicalId || getCanonicalProviderId(s.serverId),
        })).sort((a, b) => b.qualityScore - a.qualityScore);
    };

    try {
        // Wait for DB connection with short timeout
        const dbTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error("DB Timeout")), 1500));
        await Promise.race([connectToDatabase(), dbTimeout]);

        // Construct targeted query based on requested type
        let query: any = {};
        if (type === 'all') {
            query = { type: { $in: ['movie', 'tv', 'anime'] } };
        } else if (type === 'anime') {
            query = { type: 'anime' };
        } else if (type === 'tv' || type === 'cartoon') {
            query = { type: 'tv' };
        } else if (type === 'movie') {
            query = { type: 'movie' };
        } else {
            query = { type };
        }
        
        const servers = await ServerModel.find(query).sort({ qualityScore: -1 }).lean();

        if (!servers || servers.length === 0) {
            return NextResponse.json({ success: true, servers: getStaticFallback(), isFallback: true });
        }

        const normalizedServers = servers.map((s: any) => ({
            ...s,
            canonicalId: s.canonicalId || getCanonicalProviderId(s.serverId),
        }));

        return NextResponse.json({ success: true, servers: normalizedServers });
    } catch (error: any) {
        // Gracefully return configured high-reliability server list on DB failure
        return NextResponse.json({ success: true, servers: getStaticFallback(), isFallback: true });
    }
}
