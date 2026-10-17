import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { ServerModel } from '@/models/Server';

export const INITIAL_SERVERS = [
    // 1. Toon Player Link (VidLink) - Highest Reliability
    {
        serverId: 'vidlink_movie', name: 'Toon Player Link', badge: 'VidLink', type: 'movie',
        urlTemplate: 'https://vidlink.pro/movie/{id}?primaryColor=7C3AED&title=false&autoplay=true', qualityScore: 105
    },
    {
        serverId: 'vidlink_tv', name: 'Toon Player Link', badge: 'VidLink', type: 'tv',
        urlTemplate: 'https://vidlink.pro/tv/{id}/{s}/{e}?primaryColor=7C3AED&title=false&autoplay=true', qualityScore: 105
    },
    // 2. Toon Player Nest (VidNest) - High Reliability
    {
        serverId: 'vidnest_movie', name: 'Toon Player Nest', badge: 'Ultra', type: 'movie',
        urlTemplate: 'https://vidnest.fun/movie/{id}', qualityScore: 104
    },
    {
        serverId: 'vidnest_tv', name: 'Toon Player Nest', badge: 'Ultra', type: 'tv',
        urlTemplate: 'https://vidnest.fun/tv/{id}/{s}/{e}', qualityScore: 104
    },
    // 3. Toon Player Core (VidCore) - Updated to vidcore.io
    {
        serverId: 'vidcore_movie', name: 'Toon Player Core', badge: 'Core HD', type: 'movie',
        urlTemplate: 'https://vidcore.io/movie/{id}', qualityScore: 103
    },
    {
        serverId: 'vidcore_tv', name: 'Toon Player Core', badge: 'Core HD', type: 'tv',
        urlTemplate: 'https://vidcore.io/tv/{id}/{s}/{e}', qualityScore: 103
    },
    // 4. Toon Player Master (EmbedMaster)
    {
        serverId: 'embedmaster_movie', name: 'Toon Player Master', badge: 'Master', type: 'movie',
        urlTemplate: 'https://embedmaster.link/movie/{id}', qualityScore: 102
    },
    {
        serverId: 'embedmaster_tv', name: 'Toon Player Master', badge: 'Master', type: 'tv',
        urlTemplate: 'https://embedmaster.link/tv/{id}/{s}/{e}', qualityScore: 102
    },
    // 5. Toon Player Fast (VidFast) - Updated to vidfast.vc
    {
        serverId: 'vidfast_movie', name: 'Toon Player Fast', badge: 'Auto-Next', type: 'movie',
        urlTemplate: 'https://vidfast.vc/movie/{id}?autoPlay=true&title=true&poster=true', qualityScore: 101
    },
    {
        serverId: 'vidfast_tv', name: 'Toon Player Fast', badge: 'Auto-Next', type: 'tv',
        urlTemplate: 'https://vidfast.vc/tv/{id}/{s}/{e}?autoPlay=true&title=true&poster=true&nextButton=true', qualityScore: 101
    },
    // 6. Toon Player Rock (VidRock)
    {
        serverId: 'vidrock_movie', name: 'Toon Player Rock', badge: 'Stable', type: 'movie',
        urlTemplate: 'https://vidrock.net/movie/{id}', qualityScore: 99
    },
    {
        serverId: 'vidrock_tv', name: 'Toon Player Rock', badge: 'Stable', type: 'tv',
        urlTemplate: 'https://vidrock.net/tv/{id}/{s}/{e}', qualityScore: 99
    },
    // 7. Toon Player King (VidKing)
    {
        serverId: 'vidking_movie', name: 'Toon Player King', badge: 'Cinema', type: 'movie',
        urlTemplate: 'https://www.vidking.net/embed/movie/{id}', qualityScore: 98
    },
    {
        serverId: 'vidking_tv', name: 'Toon Player King', badge: 'Cinema', type: 'tv',
        urlTemplate: 'https://www.vidking.net/embed/tv/{id}/{s}/{e}', qualityScore: 98
    },
    // 8. Toon Player Vix (VixSrc)
    {
        serverId: 'vixsrc_movie', name: 'Toon Player Vix', badge: 'HD', type: 'movie',
        urlTemplate: 'https://vixsrc.to/movie/{id}', qualityScore: 97
    },
    {
        serverId: 'vixsrc_tv', name: 'Toon Player Vix', badge: 'HD', type: 'tv',
        urlTemplate: 'https://vixsrc.to/tv/{id}/{s}/{e}', qualityScore: 97
    },
    // 9. Toon Player VIP (Peachify - Mirror Fallback)
    {
        serverId: 'peachify_movie', name: 'Toon Player VIP', badge: 'Multi-Audio', type: 'movie',
        urlTemplate: 'https://peachify.top/?type=movie&id={id}&autoplay=1', qualityScore: 60
    },
    {
        serverId: 'peachify_tv', name: 'Toon Player VIP', badge: 'Multi-Audio', type: 'tv',
        urlTemplate: 'https://peachify.top/?type=tv&id={id}&s={s}&e={e}&autoplay=1', qualityScore: 60
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
