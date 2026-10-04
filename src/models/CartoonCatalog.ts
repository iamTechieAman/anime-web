import mongoose, { Document, Model, Schema } from 'mongoose';

/**
 * Server embed/playback option schema
 */
export interface ICartoonServer {
  name: string;          // e.g. "Server 1 (Direct HLS)", "Server 2 (Embed)", "VIP Player"
  serverType: 'hls' | 'embed' | 'direct';
  url: string;           // Direct .m3u8 or raw iframe embed target
  quality: string;       // e.g. "1080p", "720p", "auto"
  isM3U8: boolean;
  priority: number;      // Higher priority tried first by video player
  isWorking: boolean;
}

const CartoonServerSchema = new Schema<ICartoonServer>(
  {
    name: { type: String, required: true },
    serverType: { type: String, enum: ['hls', 'embed', 'direct'], default: 'embed' },
    url: { type: String, required: true },
    quality: { type: String, default: 'auto' },
    isM3U8: { type: Boolean, default: false },
    priority: { type: Number, default: 1 },
    isWorking: { type: Boolean, default: true },
  },
  { _id: false }
);

/**
 * Episode schema
 */
export interface ICartoonEpisode {
  episodeId: string;     // Unique Kartoons episode ID (e.g. "68222dfe280f728bd7f0f380")
  episodeNumber: number;
  title: string;
  duration?: string;
  thumbnail?: string;
  detailUrl: string;
  servers: ICartoonServer[];
  lastResolvedAt?: Date;
}

const CartoonEpisodeSchema = new Schema<ICartoonEpisode>(
  {
    episodeId: { type: String, required: true },
    episodeNumber: { type: Number, required: true },
    title: { type: String, required: true },
    duration: { type: String },
    thumbnail: { type: String },
    detailUrl: { type: String, required: true },
    servers: { type: [CartoonServerSchema], default: [] },
    lastResolvedAt: { type: Date },
  },
  { _id: false }
);

/**
 * Season schema
 */
export interface ICartoonSeason {
  seasonId: string;
  seasonNumber: number;
  title: string;
  episodes: ICartoonEpisode[];
}

const CartoonSeasonSchema = new Schema<ICartoonSeason>(
  {
    seasonId: { type: String, required: true },
    seasonNumber: { type: Number, required: true },
    title: { type: String, required: true },
    episodes: { type: [CartoonEpisodeSchema], default: [] },
  },
  { _id: false }
);

/**
 * Cartoon Catalog Document schema
 */
export interface ICartoonCatalog extends Document {
  externalId: string;    // Kartoons show ID
  slug: string;
  title: string;
  description: string;
  poster: string;
  banner: string;
  rating?: number;
  year?: number;
  status: 'Ongoing' | 'Completed' | 'Upcoming';
  type: 'show' | 'movie';
  genres: string[];
  totalSeasons: number;
  totalEpisodes: number;
  seasons: ICartoonSeason[];
  sourceUrl: string;
  changeHash?: string;
  lastScrapedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CartoonCatalogSchema = new Schema<ICartoonCatalog>(
  {
    externalId: { type: String, required: true, unique: true, index: true },
    slug: { type: String, required: true, index: true },
    title: { type: String, required: true, index: true },
    description: { type: String, default: '' },
    poster: { type: String, default: '' },
    banner: { type: String, default: '' },
    rating: { type: Number },
    year: { type: Number },
    status: { type: String, enum: ['Ongoing', 'Completed', 'Upcoming'], default: 'Completed' },
    type: { type: String, enum: ['show', 'movie'], default: 'show' },
    genres: { type: [String], default: [], index: true },
    totalSeasons: { type: Number, default: 1 },
    totalEpisodes: { type: Number, default: 0 },
    seasons: { type: [CartoonSeasonSchema], default: [] },
    sourceUrl: { type: String, required: true },
    changeHash: { type: String },
    lastScrapedAt: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: true,
  }
);

// Compound text index for title & genres for rapid full-text search
CartoonCatalogSchema.index({ title: 'text', description: 'text', genres: 'text' });

export const CartoonCatalogModel: Model<ICartoonCatalog> =
  mongoose.models.CartoonCatalog ||
  mongoose.model<ICartoonCatalog>('CartoonCatalog', CartoonCatalogSchema);
