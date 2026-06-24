/**
 * fetchWithTimeout
 * A wrapper around the global fetch API that aborts the request using AbortController
 * after a specified timeout duration.
 */
export async function fetchWithTimeout(
    url: string,
    init?: RequestInit,
    timeoutMs: number = 3000
): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            ...init,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (error: any) {
        clearTimeout(id);
        throw error;
    }
}
