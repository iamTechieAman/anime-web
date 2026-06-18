import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { ServerModel } from '@/models/Server';

const INITIAL_SERVERS = [
    // 1. Toon Player Ultimate
    {
        serverId: 'toon_ultimate_movie', name: 'Toon Player Ultimate', badge: 'Ultimate', type: 'movie',
        urlTemplate: 'https://vidsrc.pro/embed/movie/{id}?autoplay=1', qualityScore: 100
    },
    {
        serverId: 'toon_ultimate_tv', name: 'Toon Player Ultimate', badge: 'Ultimate', type: 'tv',
        urlTemplate: 'https://vidsrc.pro/embed/tv/{id}/{s}/{e}?autoplay=1', qualityScore: 100
    },
    // 2. Cinevo
    {
        serverId: 'cinevo_movie', name: 'Cinevo', badge: 'HD', type: 'movie',
        urlTemplate: 'https://cineby.pro/movie/{id}', qualityScore: 99
    },
    {
        serverId: 'cinevo_tv', name: 'Cinevo', badge: 'HD', type: 'tv',
        urlTemplate: 'https://cineby.pro/tv/{id}/{s}/{e}', qualityScore: 99
    },
    // 3. Toon Player Classic (Nortan)
    {
        serverId: 'nortan_movie', name: 'Toon Player Classic', badge: 'Classic', type: 'movie',
        urlTemplate: 'https://www.nontongo.win/embed/movie/{id}', qualityScore: 98
    },
    {
        serverId: 'nortan_tv', name: 'Toon Player Classic', badge: 'Classic', type: 'tv',
        urlTemplate: 'https://www.nontongo.win/embed/tv/{id}/{s}/{e}', qualityScore: 98
    },
    // 4. Toon Player VIP (Peachify)
    {
        serverId: 'peachify_movie', name: 'Toon Player VIP', badge: 'Multi-Audio', type: 'movie',
        urlTemplate: 'https://peachify.top/?type=movie&id={id}&autoplay=1', qualityScore: 97
    },
    {
        serverId: 'peachify_tv', name: 'Toon Player VIP', badge: 'Multi-Audio', type: 'tv',
        urlTemplate: 'https://peachify.top/?type=tv&id={id}&s={s}&e={e}&autoplay=1', qualityScore: 97
    },
    // 5. Toon Player Pro (vidsrcto)
    {
        serverId: 'vidsrcto_movie', name: 'Toon Player Pro', badge: 'Pro', type: 'movie',
        urlTemplate: 'https://vidsrc.to/embed/movie/{id}', qualityScore: 96
    },
    {
        serverId: 'vidsrcto_tv', name: 'Toon Player Pro', badge: 'Pro', type: 'tv',
        urlTemplate: 'https://vidsrc.to/embed/tv/{id}/{s}/{e}', qualityScore: 96
    },
    // 6. Toon Player Stream (autoembed)
    {
        serverId: 'autoembed_movie', name: 'Toon Player Stream', badge: 'Stream', type: 'movie',
        urlTemplate: 'https://autoembed.co/movie/tmdb/{id}', qualityScore: 95
    },
    {
        serverId: 'autoembed_tv', name: 'Toon Player Stream', badge: 'Stream', type: 'tv',
        urlTemplate: 'https://autoembed.co/tv/tmdb/{id}-{s}-{e}', qualityScore: 95
    },
    // 7. Toon Player Auto (vidfast)
    {
        serverId: 'vidfast_movie', name: 'Toon Player Auto', badge: 'Fast', type: 'movie',
        urlTemplate: 'https://vidfast.pro/movie/{id}?autoPlay=true&theme=3b82f6', qualityScore: 94
    },
    {
        serverId: 'vidfast_tv', name: 'Toon Player Auto', badge: 'Fast', type: 'tv',
        urlTemplate: 'https://vidfast.pro/tv/{id}/{s}/{e}?autoPlay=true&title=true&poster=true&theme=3b82f6&nextButton=true&autoNext=true', qualityScore: 94
    },
    // 8. Toon Player Backup (multiembed)
    {
        serverId: 'multiembed_movie', name: 'Toon Player Backup', badge: 'Backup', type: 'movie',
        urlTemplate: 'https://multiembed.mov/directstream.php?video_id={id}&tmdb=1', qualityScore: 93
    },
    {
        serverId: 'multiembed_tv', name: 'Toon Player Backup', badge: 'Backup', type: 'tv',
        urlTemplate: 'https://multiembed.mov/directstream.php?video_id={id}&tmdb=1&s={s}&e={e}', qualityScore: 93
    },
    // ANIME SERVERS
    // 1. Toon4K Anime
    {
        serverId: 'toon4k_anime', name: 'Toon4K Anime', badge: 'Premium 4K', type: 'anime',
        urlTemplate: 'https://vidlink.pro/embed/anime/{id}/{e}?primaryColor=3b82f6', qualityScore: 100
    },
    // 2. VidSrc Anime
    {
        serverId: 'vidsrc_anime', name: 'VidSrc Anime', badge: 'Anime', type: 'anime',
        urlTemplate: 'https://vidsrc.to/embed/anime/{id}/{e}', qualityScore: 99
    },
    // 3. VidSrc Me
    {
        serverId: 'vidsrc_me_anime', name: 'VidSrc Me', badge: 'Backup', type: 'anime',
        urlTemplate: 'https://vidsrc.me/embed/anime?anilist={id}&episode={e}', qualityScore: 98
    }
];

export async function GET(request: Request) {
    try {
        await connectToDatabase();

        // Clear existing servers first to get a clean slate of correct up-to-date servers
        await ServerModel.deleteMany({});

        let inserted = 0;
        for (const s of INITIAL_SERVERS) {
            await ServerModel.create({
                serverId: s.serverId,
                name: s.name,
                badge: s.badge,
                urlTemplate: s.urlTemplate,
                type: s.type,
                qualityScore: s.qualityScore,
                failureCount: 0
            });
            inserted++;
        }

        return NextResponse.json({ success: true, message: `Cleared database and seeded ${inserted} servers.` });
    } catch (error: any) {
        console.error('Seed error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
