import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { ServerModel } from '@/models/Server';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type') || 'movie';

        // Wait for DB connection with timeout
        const dbTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error("DB Timeout")), 5000));
        await Promise.race([connectToDatabase(), dbTimeout]);

        // Fetch servers, sort descending by qualityScore
        // To prevent servers from completely dying off if they were temporarily down,
        // we always return them, but just ordered by score so the frontend picks the best ones first.
        const query = (type === 'anime') ? { type: 'anime' } : { type: { $in: ['movie', 'tv'] } };
        
        const servers = await ServerModel.find(query).sort({ qualityScore: -1 }).lean();

        if (!servers || servers.length === 0) {
            // Fallback empty response if DB is not seeded
            return NextResponse.json({ success: true, servers: [] });
        }

        return NextResponse.json({ success: true, servers });
    } catch (error: any) {
        console.error('Failed to fetch servers from DB (falling back to empty):', error);
        // Returning success: true but empty servers list triggers hardcoded fallbacks in frontend
        return NextResponse.json({ success: true, servers: [], isFallback: true });
    }
}
