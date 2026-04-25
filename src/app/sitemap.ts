import { MetadataRoute } from 'next'
 
export const revalidate = 86400; // Cache for 24 hours to prevent 429 timeouts to TMDB

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://toonplayer.in';
  const now = new Date();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/discover`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/az-list/all`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/genres`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/randomize`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/history`,
      lastModified: now,
      changeFrequency: 'daily',
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

  // Genre pages
  const genres = [
    "Action", "Adventure", "Animation", "Comedy", "Crime", "Documentary",
    "Drama", "Family", "Fantasy", "History", "Horror", "Music",
    "Mystery", "Romance", "Science Fiction", "Thriller", "War", "Western"
  ];

  const genrePages: MetadataRoute.Sitemap = genres.map(genre => ({
    url: `${baseUrl}/search?genre=${encodeURIComponent(genre)}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // A-Z List pages
  const azLetters = ['all', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), '0-9'];
  const azPages: MetadataRoute.Sitemap = azLetters.map(letter => ({
    url: `${baseUrl}/az-list/${letter.toLowerCase()}`,
    lastModified: now,
    changeFrequency: 'daily' as const,
    priority: 0.6,
  }));

  // Dynamic trending content — fetch top movies/shows for indexing
  let dynamicPages: MetadataRoute.Sitemap = [];
  try {
    const TMDB_KEY = process.env.TMDB_API_KEY || '522103f166160100778c1995804369a4';
    
    // Fetch trending all (Movies + TV)
    const trendingRes = await fetch(
      `https://api.themoviedb.org/3/trending/all/week?api_key=${TMDB_KEY}`,
      { next: { revalidate: 3600 } }
    );
    const trendingData = await trendingRes.json();

    if (trendingData?.results) {
      dynamicPages = trendingData.results
        .slice(0, 50) // Scale to top 50
        .filter((item: any) => item.media_type !== 'person')
        .map((item: any) => ({
          url: `${baseUrl}/watch/${item.media_type}/${item.id}`,
          lastModified: now,
          changeFrequency: 'daily' as const,
          priority: 0.8,
        }));
    }

    // Additional popular buckets
    const [popMovies, popTv] = await Promise.all([
      fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_KEY}&page=1`, { next: { revalidate: 3600 } }).then(r => r.json()),
      fetch(`https://api.themoviedb.org/3/tv/popular?api_key=${TMDB_KEY}&page=1`, { next: { revalidate: 3600 } }).then(r => r.json()),
    ]);

    if (popMovies?.results) {
      const pPages = popMovies.results.slice(0, 30).map((item: any) => ({
        url: `${baseUrl}/watch/movie/${item.id}`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));
      dynamicPages = [...dynamicPages, ...pPages];
    }

    if (popTv?.results) {
      const tPages = popTv.results.slice(0, 30).map((item: any) => ({
        url: `${baseUrl}/watch/tv/${item.id}`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));
      dynamicPages = [...dynamicPages, ...tPages];
    }
  } catch (e) {
    console.error('[Sitemap] Failed to fetch dynamic content:', e);
  }

  // Deduplicate by URL
  const allPages = [...staticPages, ...genrePages, ...azPages, ...dynamicPages];
  const seen = new Set<string>();
  const deduped = allPages.filter(page => {
    if (seen.has(page.url)) return false;
    seen.add(page.url);
    return true;
  });

  return deduped;
}
