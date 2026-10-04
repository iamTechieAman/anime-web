/**
 * Enterprise Schema.org JSON-LD Structured Data Builder
 * Implements Google Search Central specifications for VideoObject, Movie, TVSeries, TVEpisode, and BreadcrumbList.
 */

export interface MovieSchemaParams {
  title: string;
  description: string;
  image?: string;
  backdrop?: string;
  datePublished?: string;
  durationMinutes?: number;
  rating?: number;
  ratingCount?: number;
  genres?: string[];
  director?: string;
  actors?: string[];
  canonicalUrl: string;
  embedUrl?: string;
}

export interface TVSeriesSchemaParams {
  title: string;
  description: string;
  image?: string;
  backdrop?: string;
  startDate?: string;
  endDate?: string;
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
  rating?: number;
  ratingCount?: number;
  genres?: string[];
  canonicalUrl: string;
}

export interface TVEpisodeSchemaParams {
  seriesTitle: string;
  episodeTitle?: string;
  episodeNumber: number;
  seasonNumber: number;
  description?: string;
  image?: string;
  datePublished?: string;
  durationMinutes?: number;
  canonicalUrl: string;
  embedUrl?: string;
}

export interface VideoObjectSchemaParams {
  title: string;
  description: string;
  thumbnailUrl: string[];
  uploadDate?: string;
  durationMinutes?: number;
  contentUrl: string;
  embedUrl: string;
  isFamilyFriendly?: boolean;
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

/**
 * Converts runtime in minutes to ISO 8601 duration format (e.g. 125 -> "PT2H5M", 24 -> "PT24M")
 */
export function formatIsoDuration(minutes?: number): string | undefined {
  if (!minutes || minutes <= 0) return undefined;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (hours > 0) {
    return remainingMins > 0 ? `PT${hours}H${remainingMins}M` : `PT${hours}H`;
  }
  return `PT${remainingMins}M`;
}

/**
 * Builds Schema.org Movie JSON-LD
 */
export function buildMovieSchema(params: MovieSchemaParams) {
  const images = [params.backdrop, params.image].filter(Boolean) as string[];
  const durationIso = formatIsoDuration(params.durationMinutes);

  return {
    '@context': 'https://schema.org',
    '@type': 'Movie',
    name: params.title,
    description: params.description,
    image: images.length > 0 ? images : ['https://www.toonplayer.in/icon.png'],
    url: params.canonicalUrl,
    datePublished: params.datePublished || new Date().toISOString().split('T')[0],
    ...(durationIso && { duration: durationIso }),
    ...(params.genres && params.genres.length > 0 && { genre: params.genres }),
    ...(params.director && {
      director: {
        '@type': 'Person',
        name: params.director,
      },
    }),
    ...(params.actors && params.actors.length > 0 && {
      actor: params.actors.slice(0, 10).map((actorName) => ({
        '@type': 'Person',
        name: actorName,
      })),
    }),
    ...(params.rating && params.rating > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: params.rating.toFixed(1),
        bestRating: '10',
        worstRating: '1',
        ratingCount: params.ratingCount || 100,
      },
    }),
    potentialAction: {
      '@type': 'WatchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: params.canonicalUrl,
        actionPlatform: [
          'http://schema.org/DesktopWebPlatform',
          'http://schema.org/MobileWebPlatform',
          'http://schema.org/AndroidPlatform',
          'http://schema.org/IOSPlatform',
        ],
      },
    },
    publisher: {
      '@type': 'Organization',
      name: 'ToonPlayer',
      url: 'https://www.toonplayer.in',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.toonplayer.in/icon.png',
      },
    },
  };
}

/**
 * Builds Schema.org TVSeries JSON-LD
 */
export function buildTVSeriesSchema(params: TVSeriesSchemaParams) {
  const images = [params.backdrop, params.image].filter(Boolean) as string[];

  return {
    '@context': 'https://schema.org',
    '@type': 'TVSeries',
    name: params.title,
    description: params.description,
    image: images.length > 0 ? images : ['https://www.toonplayer.in/icon.png'],
    url: params.canonicalUrl,
    ...(params.startDate && { startDate: params.startDate }),
    ...(params.endDate && { endDate: params.endDate }),
    ...(params.numberOfSeasons && { numberOfSeasons: params.numberOfSeasons }),
    ...(params.numberOfEpisodes && { numberOfEpisodes: params.numberOfEpisodes }),
    ...(params.genres && params.genres.length > 0 && { genre: params.genres }),
    ...(params.rating && params.rating > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: params.rating.toFixed(1),
        bestRating: '10',
        worstRating: '1',
        ratingCount: params.ratingCount || 150,
      },
    }),
    potentialAction: {
      '@type': 'WatchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: params.canonicalUrl,
        actionPlatform: [
          'http://schema.org/DesktopWebPlatform',
          'http://schema.org/MobileWebPlatform',
        ],
      },
    },
    publisher: {
      '@type': 'Organization',
      name: 'ToonPlayer',
      url: 'https://www.toonplayer.in',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.toonplayer.in/icon.png',
      },
    },
  };
}

/**
 * Builds Schema.org TVEpisode JSON-LD
 */
export function buildTVEpisodeSchema(params: TVEpisodeSchemaParams) {
  const durationIso = formatIsoDuration(params.durationMinutes);

  return {
    '@context': 'https://schema.org',
    '@type': 'TVEpisode',
    name: params.episodeTitle || `${params.seriesTitle} - Season ${params.seasonNumber}, Episode ${params.episodeNumber}`,
    episodeNumber: params.episodeNumber,
    description: params.description || `Watch ${params.seriesTitle} Season ${params.seasonNumber} Episode ${params.episodeNumber} in HD online for free with Sub & Dub on ToonPlayer.`,
    ...(params.image && { image: params.image }),
    url: params.canonicalUrl,
    partOfSeason: {
      '@type': 'TVSeason',
      seasonNumber: params.seasonNumber,
    },
    partOfSeries: {
      '@type': 'TVSeries',
      name: params.seriesTitle,
    },
    ...(params.datePublished && { datePublished: params.datePublished }),
    ...(durationIso && { timeRequired: durationIso }),
    potentialAction: {
      '@type': 'WatchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: params.canonicalUrl,
      },
    },
    publisher: {
      '@type': 'Organization',
      name: 'ToonPlayer',
      url: 'https://www.toonplayer.in',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.toonplayer.in/icon.png',
      },
    },
  };
}

/**
 * Builds Schema.org VideoObject JSON-LD
 */
export function buildVideoObjectSchema(params: VideoObjectSchemaParams) {
  const durationIso = formatIsoDuration(params.durationMinutes);

  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: params.title,
    description: params.description.slice(0, 250),
    thumbnailUrl: params.thumbnailUrl.length > 0 ? params.thumbnailUrl : ['https://www.toonplayer.in/icon.png'],
    uploadDate: params.uploadDate || new Date().toISOString(),
    contentUrl: params.contentUrl,
    embedUrl: params.embedUrl,
    ...(durationIso && { duration: durationIso }),
    isFamilyFriendly: params.isFamilyFriendly ?? true,
    publisher: {
      '@type': 'Organization',
      name: 'ToonPlayer',
      url: 'https://www.toonplayer.in',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.toonplayer.in/icon.png',
      },
    },
  };
}

/**
 * Builds Schema.org BreadcrumbList JSON-LD
 */
export function buildBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
