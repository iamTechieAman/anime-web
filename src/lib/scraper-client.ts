import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import axios from "axios";

const execPromise = promisify(exec);
const SCRAPER_API_URL = process.env.SCRAPER_API_URL;

export async function fetchFromScraper(params: {
    query?: string;
    cartoon_query?: string;
    cartoon_category?: string;
    wa_info?: string;
    wa_source?: string;
    aniwatch_page?: string;
    ja_query?: string;
    ja_info?: string;
    ja_source?: string;
    ax_query?: string;
    ax_info?: string;
    ax_source?: string;
    slug?: string;
    universal_site?: string;
    universal_item?: string;
    universal_ep?: string;
    wa_az_letter?: string;
    wa_az_page?: string;
    of_info?: string;
    of_type?: string;
    of_source?: string;
    anw_query?: string;
    anw_info?: string;
    anw_source?: string;
    anw_home?: boolean;
    anw_az?: string;
    anw_page?: string | number;
}) {
    if (SCRAPER_API_URL) {
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
            }

            if (endpoint) {
                const response = await axios.get(`${baseUrl}${endpoint}`, { params: queryParams });
                
                // Wrap the response to match the CLI JSON output format
                const result: any = {};
                if (params.query) result.onoflix = response.data;
                if (params.cartoon_query) result.watchanimeworld = response.data;
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
                
                return result;
            }
        } catch (error: any) {
            console.error("[Scraper Client] Remote API failed, falling back to local:", error.message);
        }
    }

    // Fallback to Local Execution
    const scriptPath = path.join(process.cwd(), "src/lib/python/scrapling_sync.py");
    let command = `python3 "${scriptPath}"`;
    
    if (params.query) command += ` --query "${params.query.replace(/"/g, '\\"')}"`;
    if (params.aniwatch_page) command += ` --aniwatch_page ${params.aniwatch_page}`;
    if (params.cartoon_query) command += ` --cartoon_query "${params.cartoon_query.replace(/"/g, '\\"')}"`;
    if (params.cartoon_category) command += ` --cartoon_category "${params.cartoon_category.replace(/"/g, '\\"')}"`;
    if (params.wa_info) command += ` --wa_info "${params.wa_info.replace(/"/g, '\\"')}"`;
    if (params.wa_source) command += ` --wa_source "${params.wa_source.replace(/"/g, '\\"')}"`;
    if (params.ja_query) command += ` --ja_query "${params.ja_query.replace(/"/g, '\\"')}"`;
    if (params.ja_info) command += ` --ja_info "${params.ja_info.replace(/"/g, '\\"')}" --slug "${params.slug?.replace(/"/g, '\\"')}"`;
    if (params.ja_source) command += ` --ja_source "${params.ja_source.replace(/"/g, '\\"')}"`;
    if (params.ax_query) command += ` --ax_query "${params.ax_query.replace(/"/g, '\\"')}"`;
    if (params.ax_info) command += ` --ax_info "${params.ax_info.replace(/"/g, '\\"')}" --slug "${params.slug?.replace(/"/g, '\\"')}"`;
    if (params.ax_source) command += ` --ax_source "${params.ax_source.replace(/"/g, '\\"')}"`;
    if (params.universal_site) command += ` --universal_site "${params.universal_site.replace(/"/g, '\\"')}"`;
    if (params.universal_item) command += ` --universal_item "${params.universal_item.replace(/"/g, '\\"')}"`;
    if (params.universal_ep) command += ` --universal_ep "${params.universal_ep.replace(/"/g, '\\"')}"`;
    if (params.wa_az_letter) command += ` --wa_az_letter "${params.wa_az_letter.replace(/"/g, '\\"')}" --wa_az_page "${params.wa_az_page || 1}"`;
    if (params.of_info) command += ` --of_info "${params.of_info.replace(/"/g, '\\"')}" --of_type "${params.of_type || 'series'}"`;
    if (params.of_source) command += ` --of_source "${params.of_source.replace(/"/g, '\\"')}" --of_type "${params.of_type || 'series'}"`;
    if (params.slug) command += ` --slug "${params.slug.replace(/"/g, '\\"')}"`;
    if (params.anw_query) command += ` --anw_query "${params.anw_query.replace(/"/g, '\\"')}"`;
    if (params.anw_info) command += ` --anw_info "${params.anw_info.replace(/"/g, '\\"')}"`;
    if (params.anw_source) command += ` --anw_source "${params.anw_source.replace(/"/g, '\\"')}"`;
    if (params.anw_home) command += ` --anw_home`;
    if (params.anw_az) command += ` --anw_az "${params.anw_az}" --anw_page "${params.anw_page || 1}"`;

    console.log("[Scraper Client] Executing local command:", command);
    try {
        const { stdout, stderr } = await execPromise(command);

        if (stderr && !stdout) {
            console.error("[Scraper Client] Local command failed (stderr):", stderr);
            throw new Error(stderr);
        }

        if (!stdout) {
            console.warn("[Scraper Client] No stdout from local command");
            return {}; // Empty but valid
        }

        try {
            return JSON.parse(stdout);
        } catch (parseError) {
            console.error("[Scraper Client] JSON Parse Error!");
            console.error("[Scraper Client] Raw stdout:", stdout.substring(0, 500) + (stdout.length > 500 ? "..." : ""));
            throw parseError;
        }
    } catch (err: any) {
        console.error("[Scraper Client] Local command exception:", err.message);
        throw err;
    }
}
