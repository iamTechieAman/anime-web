// @ts-ignore
import { Router, Request, Response } from 'express';
import {
  getHomeCartoons,
  searchCartoons,
  getCartoonEpisodes,
  getStreamSource,
} from './kartoons';

/**
 * ============================================================================
 * Kartoons Express.js Router
 * ============================================================================
 * Usage:
 *   import express from 'express';
 *   import kartoonsRouter from './kartoons-express';
 *
 *   const app = express();
 *   app.use('/api/kartoons', kartoonsRouter);
 * ============================================================================
 */

export const kartoonsExpressRouter = Router();

// GET /api/kartoons/home
kartoonsExpressRouter.get('/home', async (_req: Request, res: Response): Promise<void> => {
  try {
    const data = await getHomeCartoons();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/kartoons/search?q=query
kartoonsExpressRouter.get('/search', async (req: Request, res: Response): Promise<void> => {
  try {
    const query = (req.query.q as string) || (req.query.query as string);
    if (!query) {
      res.status(400).json({ success: false, error: 'Query parameter "q" is required.' });
      return;
    }
    const data = await searchCartoons(query);
    res.json({ success: true, count: data.length, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/kartoons/episodes?id=showId
kartoonsExpressRouter.get('/episodes', async (req: Request, res: Response): Promise<void> => {
  try {
    const idOrUrl = (req.query.id as string) || (req.query.url as string);
    if (!idOrUrl) {
      res.status(400).json({ success: false, error: 'Parameter "id" or "url" is required.' });
      return;
    }
    const data = await getCartoonEpisodes(idOrUrl);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/kartoons/stream?episodeId=epId
kartoonsExpressRouter.get('/stream', async (req: Request, res: Response): Promise<void> => {
  try {
    const episodeId = (req.query.episodeId as string) || (req.query.id as string);
    if (!episodeId) {
      res.status(400).json({ success: false, error: 'Parameter "episodeId" is required.' });
      return;
    }
    const showId = req.query.showId as string | undefined;
    const seasonNumber = req.query.season ? Number(req.query.season) : undefined;
    const episodeNumber = req.query.ep ? Number(req.query.ep) : undefined;

    const data = await getStreamSource(episodeId, {
      showId,
      seasonNumber,
      episodeNumber,
    });
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default kartoonsExpressRouter;
