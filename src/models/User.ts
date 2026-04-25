import mongoose, { Document, Model } from 'mongoose';

export interface IPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface IWatchHistoryItem {
  id: string;
  showId: string;
  type: 'anime' | 'movie' | 'tv';
  title: string;
  poster: string;
  episodeId?: string;
  episodeNumber?: number;
  currentTime: number;
  duration: number;
  updatedAt: number;
}

export interface IWatchlistItem {
  id: string;
  showId: string;
  type: 'anime' | 'movie' | 'tv';
  title: string;
  poster: string;
  addedAt: number;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  avatar?: string;
  role: string;
  history: IWatchHistoryItem[];
  watchlist: IWatchlistItem[];
  pushSubscriptions: IPushSubscription[];
  createdAt: Date;
  updatedAt: Date;
}

const WatchHistorySchema = new mongoose.Schema<IWatchHistoryItem>({
  id: { type: String, required: true },
  showId: { type: String, required: true },
  type: { type: String, enum: ['anime', 'movie', 'tv'], required: true },
  title: { type: String, required: true },
  poster: { type: String, required: true },
  episodeId: { type: String },
  episodeNumber: { type: Number },
  currentTime: { type: Number, required: true, default: 0 },
  duration: { type: Number, required: true, default: 0 },
  updatedAt: { type: Number, required: true, default: Date.now },
});

const WatchlistSchema = new mongoose.Schema<IWatchlistItem>({
  id: { type: String, required: true },
  showId: { type: String, required: true },
  type: { type: String, enum: ['anime', 'movie', 'tv'], required: true },
  title: { type: String, required: true },
  poster: { type: String, required: true },
  addedAt: { type: Number, required: true, default: Date.now },
});

const PushSubscriptionSchema = new mongoose.Schema<IPushSubscription>({
  endpoint: { type: String, required: true },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
  }
});

const UserSchema = new mongoose.Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String },
  avatar: { type: String },
  role: { type: String, default: 'user' },
  history: [WatchHistorySchema],
  watchlist: [WatchlistSchema],
  pushSubscriptions: [PushSubscriptionSchema],
}, { timestamps: true });

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
