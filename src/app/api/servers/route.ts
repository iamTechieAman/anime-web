import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { ServerModel } from '@/models/Server';
import { INITIAL_SERVERS } from './seed/route';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'movie';

    const getStaticFallback = () => {
        return INITIAL_SERVERS.filter(s => 
            type === 'anime' ? s.type === 'anime' : (s.type === 'movie' || s.type === 'tv')
        ).sort((a, b) => b.qualityScore - a.qualityScore);
    };

    try {
        // Wait for DB connection with short timeout
        const dbTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error("DB Timeout")), 1500));
        await Promise.race([connectToDatabase(), dbTimeout]);

        // Fetch servers, sort descending by qualityScore
        const query = (type === 'anime') ? { type: 'anime' } : { type: { $in: ['movie', 'tv'] } };
        
        const servers = await ServerModel.find(query).sort({ qualityScore: -1 }).lean();

        if (!servers || servers.length === 0) {
            return NextResponse.json({ success: true, servers: getStaticFallback(), isFallback: true });
        }

        return NextResponse.json({ success: true, servers });
    } catch (error: any) {
        // Gracefully return configured high-reliability server list on DB failure
        return NextResponse.json({ success: true, servers: getStaticFallback(), isFallback: true });
    }
}
