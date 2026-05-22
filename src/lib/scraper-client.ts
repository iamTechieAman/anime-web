import axios from "axios";
import crypto from "crypto";
import { animeCache, TTL } from "./anime-cache";

const SCRAPER_API_URL = process.env.SCRAPER_API_URL;

export async function fetchFromScraper(params: any) {
    const paramsString = JSON.stringify(params);
    const cacheKey = `scraper_${crypto.createHash('md5').update(paramsString).digest('hex')}`;
    const cached = animeCache.get<any>(cacheKey);
    if (cached) {
        return cached;
    }

    if (!SCRAPER_API_URL) {
        throw new Error("[Scraper Client] Python/local execution is disabled. SCRAPER_API_URL is required.");
    }

    // Use remote API
    try {
        const baseUrl = SCRAPER_API_URL.replace(/\/$/, "");
        let endpoint = "";
        let queryParams: any = {};

        // ... mapping logic remains but heavily stripped down for brevity
        if (params.query) {
            endpoint = "/search/onoflix";
            queryParams.q = params.query;
        } else if (params.slug) {
            endpoint = "/info/animex";
            queryParams.slug = params.slug;
        }

        if (endpoint) {
            const response = await axios.get(`${baseUrl}${endpoint}`, { params: queryParams });
            const result: any = { data: response.data };
            animeCache.set(cacheKey, result, TTL.EPISODE_LIST);
            return result;
        }
    } catch (error: any) {
        console.error("[Scraper Client] Remote API failed:", error.message);
        throw new Error("Scraper API Failed");
    }

    throw new Error("Invalid scraper params");
}
