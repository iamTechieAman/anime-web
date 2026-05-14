import mongoose, { Document, Model } from 'mongoose';

export interface IServer extends Document {
  serverId: string;
  name: string;
  badge: string;
  urlTemplate: string; // The URL string that will be evaluated
  type: 'movie' | 'tv' | 'anime';
  qualityScore: number;
  failureCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ServerSchema = new mongoose.Schema<IServer>({
  serverId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  badge: { type: String, required: true },
  urlTemplate: { type: String, required: true },
  type: { type: String, enum: ['movie', 'tv', 'anime'], required: true },
  qualityScore: { type: Number, default: 50 },
  failureCount: { type: Number, default: 0 },
}, {
  timestamps: true,
});

export const ServerModel: Model<IServer> = mongoose.models.Server || mongoose.model<IServer>('Server', ServerSchema);
