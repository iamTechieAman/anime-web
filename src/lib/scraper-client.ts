import axios from "axios";
import crypto from "crypto";
import { animeCache, TTL } from "./anime-cache";

// Set fallback Render scraper API url if not specified in environment
const SCRAPER_API_URL = process.env.SCRAPER_API_URL || "https://toonplayer-scraper-api.onrender.com";

export async function fetchFromScraper(params: any) {
    const paramsString = JSON.stringify(params);
    const cacheKey = `scraper_${crypto.createHash('md5').update(paramsString).digest('hex')}`;
    const cached = animeCache.get<any>(cacheKey);
    if (cached) {
        return cached;
    }

    // Use remote API
    try {
        const baseUrl = SCRAPER_API_URL.replace(/\/$/, "");
        let endpoint = "";
        let queryParams: any = {};

        if (params.universal_site) {
            if (params.universal_item) {
                endpoint = "/info/universal";
                queryParams.id = params.universal_item;
                queryParams.site = params.universal_site;
            } else if (params.universal_ep) {
                endpoint = "/source/universal";
                queryParams.id = params.universal_ep;
                queryParams.site = params.universal_site;
            } else {
                endpoint = "/search/universal";
                queryParams.q = params.query;
                queryParams.site = params.universal_site;
            }
        } else if (params.cartoon_query) {
            endpoint = "/search/watchanimeworld";
            queryParams.q = params.cartoon_query;
        } else if (params.cartoon_category) {
            endpoint = "/search/watchanimeworld";
            queryParams.q = params.cartoon_category;
        } else if (params.wa_az_letter) {
            endpoint = "/search/watchanimeworld_az";
            queryParams.letter = params.wa_az_letter;
            queryParams.page = params.wa_az_page || "1";
        } else if (params.wa_info) {
            endpoint = "/info/watchanimeworld";
            queryParams.id = params.wa_info;
        } else if (params.wa_source) {
            endpoint = "/source/watchanimeworld";
            queryParams.id = params.wa_source;
        } else if (params.query) {
            endpoint = "/search/onoflix";
            queryParams.q = params.query;
        } else if (params.ja_query) {
            endpoint = "/search/justanime";
            queryParams.q = params.ja_query;
        } else if (params.ja_info) {
            endpoint = "/info/justanime";
            queryParams.id = params.ja_info;
            queryParams.slug = params.slug;
        } else if (params.ja_source) {
            endpoint = "/source/justanime";
            queryParams.id = params.ja_source;
        } else if (params.ax_query) {
            endpoint = "/search/animex";
            queryParams.q = params.ax_query;
        } else if (params.ax_info) {
            endpoint = "/info/animex";
            queryParams.id = params.ax_info;
            queryParams.slug = params.slug;
        } else if (params.ax_source) {
            endpoint = "/source/animex";
            queryParams.id = params.ax_source;
        } else if (params.of_info) {
            endpoint = "/info/onoflix";
            queryParams.id = params.of_info;
            queryParams.type = params.of_type || "series";
        } else if (params.of_source) {
            endpoint = "/source/onoflix";
            queryParams.id = params.of_source;
            queryParams.type = params.of_type || "series";
        } else if (params.anw_query) {
            endpoint = "/search/aniwaves";
            queryParams.q = params.anw_query;
        } else if (params.anw_info) {
            endpoint = "/info/aniwaves";
            queryParams.id = params.anw_info;
        } else if (params.anw_source) {
            endpoint = "/source/aniwaves";
            queryParams.id = params.anw_source;
        } else if (params.slug) {
            endpoint = "/info/animex";
            queryParams.slug = params.slug;
        }

        if (endpoint) {
            let response;
            let attempts = 0;
            const maxAttempts = 3;
            const timeout = 10000; // 10s timeout

            while (attempts < maxAttempts) {
                try {
                    response = await axios.get(`${baseUrl}${endpoint}`, { 
                        params: queryParams,
                        timeout: timeout
                    });
                    break;
                } catch (err: any) {
                    attempts++;
                    console.warn(`[Scraper Client] Attempt ${attempts} failed for ${endpoint}: ${err.message}`);
                    if (attempts >= maxAttempts) {
                        throw err;
                    }
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            if (!response || !response.data) {
                throw new Error("No data received from scraper API");
            }
            
            // Wrap the response to match what the api routers expect
            const result: any = {};
            if (params.query) result.onoflix = response.data;
            if (params.cartoon_query || params.cartoon_category) result.watchanimeworld = response.data;
            if (params.wa_info) result.wa_info = response.data;
            if (params.wa_source) result.wa_source = response.data;
            if (params.ja_query) result.justanime = response.data;
            if (params.ja_info) result.ja_info = response.data;
            if (params.ja_source) result.ja_source = response.data;
            if (params.ax_query) result.animex = response.data;
            if (params.ax_info) result.ax_info = response.data;
            if (params.ax_source) result.ax_source = response.data;
            if (params.wa_az_letter) result.watchanimeworld = response.data;
            if (params.of_info) result.of_info = response.data;
            if (params.of_source) result.of_source = response.data;
            if (params.universal_site) {
                if (params.universal_item) result.universal_info = response.data;
                else if (params.universal_ep) result.universal_source = response.data;
                else result.universal_search = response.data;
            }
            if (params.anw_query) result.aniwaves = response.data;
            if (params.anw_info) result.anw_info = response.data;
            if (params.anw_source) result.anw_source = response.data;
            
            // Fallback for simple slug query
            if (params.slug && Object.keys(result).length === 0) {
                result.data = response.data;
            }

            // Set appropriate TTL
            const ttl = params.query || params.cartoon_query 
                ? TTL.ANILIST_META 
                : (params.wa_source || params.ja_source || params.of_source || params.universal_ep ? TTL.SOURCES : TTL.EPISODE_LIST);

            animeCache.set(cacheKey, result, ttl);
            return result;
        }
    } catch (error: any) {
        console.error("[Scraper Client] Remote API failed:", error.message);
        // Return safe fallback instead of throwing to prevent page/API crashes
        const fallback: any = {};
        if (params.query) fallback.onoflix = [];
        if (params.cartoon_query || params.cartoon_category) fallback.watchanimeworld = [];
        if (params.wa_info) fallback.wa_info = null;
        if (params.wa_source) fallback.wa_source = null;
        if (params.ja_query) fallback.justanime = [];
        if (params.ja_info) fallback.ja_info = null;
        if (params.ja_source) fallback.ja_source = null;
        if (params.ax_query) fallback.animex = [];
        if (params.ax_info) fallback.ax_info = null;
        if (params.ax_source) fallback.ax_source = null;
        if (params.wa_az_letter) fallback.watchanimeworld = [];
        if (params.of_info) fallback.of_info = null;
        if (params.of_source) fallback.of_source = null;
        if (params.anw_query) fallback.aniwaves = [];
        if (params.anw_info) fallback.anw_info = null;
        if (params.anw_source) fallback.anw_source = null;
        return fallback;
    }

    throw new Error("Invalid scraper params");
}
