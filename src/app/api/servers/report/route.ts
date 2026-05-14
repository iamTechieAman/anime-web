import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { ServerModel } from '@/models/Server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { serverId, success } = body;

        if (!serverId || typeof success !== 'boolean') {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        await connectToDatabase();

        const scoreChange = success ? 5 : -10;
        
        // Find the server and update it
        // We cap the score between 0 and 100 in the update query
        const server = await ServerModel.findOne({ serverId });
        
        if (!server) {
            return NextResponse.json({ error: 'Server not found' }, { status: 404 });
        }

        let newScore = server.qualityScore + scoreChange;
        if (newScore > 100) newScore = 100;
        if (newScore < 0) newScore = 0;

        server.qualityScore = newScore;
        if (!success) {
            server.failureCount += 1;
        }

        await server.save();

        return NextResponse.json({ success: true, newScore });
    } catch (error: any) {
        console.error('Failed to update server health:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
