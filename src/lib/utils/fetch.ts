/**
 * Safely races a promise against a timeout.
 * 
 * Used primarily for Next.js API Routes and Server Components to gracefully
 * handle external API hangs (e.g. TMDB or AniList being blocked by ISPs).
 * Prevents Vercel Serverless Functions from timing out completely (500 Error).
 * 
 * @param promise The fetch promise to race
 * @param ms Timeout in milliseconds (default 3000ms)
 * @returns The resolved fetch Response
 */
export async function fetchWithTimeout(promise: Promise<Response>, ms: number = 3000): Promise<Response> {
    return Promise.race([
        promise,
        new Promise<Response>((_, reject) => 
            setTimeout(() => reject(new Error(`Fetch timed out after ${ms}ms. External API might be blocked.`)), ms)
        )
    ]);
}
