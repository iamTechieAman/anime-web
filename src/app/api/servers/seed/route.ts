import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { ServerModel } from '@/models/Server';

const INITIAL_SERVERS = [
    {
        serverId: 'toon4k_movie', name: 'Toon4K', badge: 'Premium 4K', type: 'movie',
        urlTemplate: 'https://vidlink.pro/movie/{id}?primaryColor=3b82f6&title=false'
    },
    {
        serverId: 'toon4k_tv', name: 'Toon4K', badge: 'Premium 4K', type: 'tv',
        urlTemplate: 'https://vidlink.pro/tv/{id}/{s}/{e}?primaryColor=3b82f6&title=false'
    },
    {
        serverId: 'toon_ultimate_movie', name: 'Toon Player Ultimate', badge: 'Best', type: 'movie',
        urlTemplate: 'https://111movies.net/movie/{id}?autoplay=1'
    },
    {
        serverId: 'toon_ultimate_tv', name: 'Toon Player Ultimate', badge: 'Best', type: 'tv',
        urlTemplate: 'https://111movies.net/tv/{id}/{s}/{e}?autoplay=1'
    },
    {
        serverId: 'vidfast_movie', name: 'Toon Player Auto', badge: 'Fast', type: 'movie',
        urlTemplate: 'https://vidfast.pro/movie/{id}?autoPlay=true&theme=3b82f6'
    },
    {
        serverId: 'vidfast_tv', name: 'Toon Player Auto', badge: 'Fast', type: 'tv',
        urlTemplate: 'https://vidfast.pro/tv/{id}/{s}/{e}?autoPlay=true&title=true&poster=true&theme=3b82f6&nextButton=true&autoNext=true'
    },
    {
        serverId: 'toon4k_anime', name: 'Toon4K Anime', badge: 'Premium 4K', type: 'anime',
        urlTemplate: 'https://vidlink.pro/embed/anime/{id}/{e}?primaryColor=3b82f6'
    },
    {
        serverId: 'vidsrc_anime', name: 'VidSrc Anime', badge: 'Anime', type: 'anime',
        urlTemplate: 'https://vidsrc.to/embed/anime/{id}/{e}'
    }
];

export async function GET(request: Request) {
    try {
        await connectToDatabase();

        let inserted = 0;
        for (const s of INITIAL_SERVERS) {
            const exists = await ServerModel.findOne({ serverId: s.serverId });
            if (!exists) {
                await ServerModel.create({ ...s, qualityScore: 50, failureCount: 0 });
                inserted++;
            }
        }

        return NextResponse.json({ success: true, message: `Seeded ${inserted} servers.` });
    } catch (error: any) {
        console.error('Seed error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
