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
}) {
    if (SCRAPER_API_URL) {
        // Use remote API
        try {
            const baseUrl = SCRAPER_API_URL.replace(/\/$/, "");
            let endpoint = "";
            let queryParams: any = {};

            if (params.cartoon_query) {
                endpoint = "/search/watchanimeworld";
                queryParams.q = params.cartoon_query;
            } else if (params.cartoon_category) {
                // Mapping category for remote API if needed, or using search
                endpoint = "/search/watchanimeworld";
                queryParams.q = params.cartoon_category;
            } else if (params.wa_info) {
                endpoint = "/info/watchanimeworld";
                queryParams.id = params.wa_info;
            } else if (params.wa_source) {
                endpoint = "/source/watchanimeworld";
                queryParams.id = params.wa_source;
            } else if (params.query) {
                endpoint = "/search/onoflix";
                queryParams.q = params.query;
            }

            if (endpoint) {
                const response = await axios.get(`${baseUrl}${endpoint}`, { params: queryParams });
                return response.data;
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

    const { stdout, stderr } = await execPromise(command);

    if (stderr && !stdout) {
        throw new Error(stderr);
    }

    return JSON.parse(stdout);
}
