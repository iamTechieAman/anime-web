// @ts-ignore
import type { MetadataRoute } from 'next';
import connectToDatabase from '@/lib/db';
import { CartoonCatalogModel } from '@/models/CartoonCatalog';

export const revalidate = 86400; // Cache sitemap for 24 hours to balance fresh catalog indexation with API rate limits

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.toonplayer.in';
  const now = new Date();

  // 1. Static Core Landing Pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'always',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/anime`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.95,
    },
    {
      url: `${baseUrl}/browse?type=anime`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/browse?type=tv&genre_id=16`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/movies`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/tv`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/trending`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/top-rated`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/genres`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
  ];

  // 2. High-intent Category & Genre Pages
  const genres = [
    "Action", "Adventure", "Animation", "Anime", "Cartoon", "Comedy", "Crime",
    "Documentary", "Drama", "Family", "Fantasy", "History", "Horror",
    "Music", "Mystery", "Romance", "Science Fiction", "Thriller", "War", "Western"
  ];

  const genrePages: MetadataRoute.Sitemap = genres.map(genre => ({
    url: `${baseUrl}/search?genre=${encodeURIComponent(genre)}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // 3. A-Z Catalog Index Pages
  const azLetters = ['all', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), '0-9'];
  const azPages: MetadataRoute.Sitemap = azLetters.map(letter => ({
    url: `${baseUrl}/az-list/${letter.toLowerCase()}`,
    lastModified: now,
    changeFrequency: 'daily' as const,
    priority: 0.65,
  }));

  // 4. Dynamic Scraped Cartoons from MongoDB Catalog
  let cartoonPages: MetadataRoute.Sitemap = [];
  try {
    await connectToDatabase();
    const cartoons = await CartoonCatalogModel.find({}, 'externalId slug title seasons updatedAt')
      .sort({ updatedAt: -1 })
      .limit(100)
      .lean();

    if (cartoons && cartoons.length > 0) {
      for (const cartoon of cartoons) {
        const lastMod = cartoon.updatedAt ? new Date(cartoon.updatedAt) : now;
        
        // Show landing URLs
        cartoonPages.push({
          url: `${baseUrl}/cartoon/${cartoon.externalId}`,
          lastModified: lastMod,
          changeFrequency: 'daily' as const,
          priority: 0.85,
        });
        cartoonPages.push({
          url: `${baseUrl}/watch/cartoon/${cartoon.externalId}`,
          lastModified: lastMod,
          changeFrequency: 'daily' as const,
          priority: 0.85,
        });

        // Episode-level URLs for high-ranking search queries ("Watch {title} Episode {ep}")
        if (cartoon.seasons && cartoon.seasons.length > 0) {
          const season1 = cartoon.seasons.find((s: any) => s.seasonNumber === 1) || cartoon.seasons[0];
          if (season1 && season1.episodes) {
            // Index the first 10 episodes of each cartoon
            for (const ep of season1.episodes.slice(0, 10)) {
              cartoonPages.push({
                url: `${baseUrl}/watch/cartoon/${cartoon.externalId}?s=${season1.seasonNumber || 1}&e=${ep.episodeNumber}`,
                lastModified: lastMod,
                changeFrequency: 'weekly' as const,
                priority: 0.8,
              });
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn('[Sitemap] MongoDB cartoon catalog query skipped:', e);
  }

  // 5. Dynamic Movies, Anime & TV from TMDB API
  let dynamicMediaPages: MetadataRoute.Sitemap = [];
  try {
    const TMDB_KEY = process.env.TMDB_API_KEY || '522103f166160100778c1995804369a4';

    const [trendingRes, popAnimeRes, popMoviesRes, popTvRes] = await Promise.all([
      // Trending weekly media
      fetch(`https://api.themoviedb.org/3/trending/all/week?api_key=${TMDB_KEY}`, { next: { revalidate: 3600 } })
        .then(r => r.ok ? r.json() : null)
        .catch(() => null),

      // Top Animation/Anime shows (Genre 16)
      fetch(`https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_KEY}&with_genres=16&sort_by=popularity.desc&page=1`, { next: { revalidate: 3600 } })
        .then(r => r.ok ? r.json() : null)
        .catch(() => null),

      // Popular Movies
      fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_KEY}&page=1`, { next: { revalidate: 3600 } })
        .then(r => r.ok ? r.json() : null)
        .catch(() => null),

      // Popular TV
      fetch(`https://api.themoviedb.org/3/tv/popular?api_key=${TMDB_KEY}&page=1`, { next: { revalidate: 3600 } })
        .then(r => r.ok ? r.json() : null)
        .catch(() => null),
    ]);

    // Trending titles
    if (trendingRes?.results) {
      for (const item of trendingRes.results.slice(0, 40)) {
        if (item.media_type === 'person') continue;
        const mediaType = item.media_type === 'tv' ? 'tv' : 'movie';
        
        dynamicMediaPages.push({
          url: `${baseUrl}/watch/${mediaType}/${item.id}`,
          lastModified: now,
          changeFrequency: 'daily' as const,
          priority: 0.9,
        });

        // Add episode deep links for top trending TV series
        if (mediaType === 'tv') {
          for (let ep = 1; ep <= 3; ep++) {
            dynamicMediaPages.push({
              url: `${baseUrl}/watch/tv/${item.id}?s=1&e=${ep}`,
              lastModified: now,
              changeFrequency: 'weekly' as const,
              priority: 0.8,
            });
          }
        }
      }
    }

    // Popular Anime & Animation
    if (popAnimeRes?.results) {
      for (const anime of popAnimeRes.results.slice(0, 30)) {
        dynamicMediaPages.push({
          url: `${baseUrl}/watch/anime/${anime.id}`,
          lastModified: now,
          changeFrequency: 'daily' as const,
          priority: 0.9,
        });

        // Index first 5 episodes for search keywords
        for (let ep = 1; ep <= 5; ep++) {
          dynamicMediaPages.push({
            url: `${baseUrl}/watch/anime/${anime.id}?ep=${ep}`,
            lastModified: now,
            changeFrequency: 'weekly' as const,
            priority: 0.82,
          });
        }
      }
    }

    // Popular Movies
    if (popMoviesRes?.results) {
      for (const item of popMoviesRes.results.slice(0, 25)) {
        dynamicMediaPages.push({
          url: `${baseUrl}/watch/movie/${item.id}`,
          lastModified: now,
          changeFrequency: 'weekly' as const,
          priority: 0.85,
        });
      }
    }

    // Popular TV shows
    if (popTvRes?.results) {
      for (const item of popTvRes.results.slice(0, 25)) {
        dynamicMediaPages.push({
          url: `${baseUrl}/watch/tv/${item.id}`,
          lastModified: now,
          changeFrequency: 'weekly' as const,
          priority: 0.85,
        });
      }
    }
  } catch (e) {
    console.error('[Sitemap] Failed to fetch dynamic TMDB catalog:', e);
  }

  // 6. Deduplicate by URL to ensure clean, valid sitemap.xml
  const allPages = [
    ...staticPages,
    ...genrePages,
    ...azPages,
    ...cartoonPages,
    ...dynamicMediaPages,
  ];

  const seen = new Set<string>();
  const dedupedSitemap = allPages.filter(page => {
    if (!page.url || seen.has(page.url)) return false;
    seen.add(page.url);
    return true;
  });

  return dedupedSitemap;
}
