import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(request: Request) {
    try {
        const { urls } = await request.json();
        
        if (!urls || !Array.isArray(urls)) {
            return NextResponse.json({ error: "Invalid URLs list" }, { status: 400 });
        }

        // Parallel check with timeout
        const results = await Promise.allSettled(
            urls.map(async (url) => {
                try {
                    // Use HEAD request for speed, fallback to GET with small range or high timeout
                    const response = await axios.head(url, { 
                        timeout: 3000, 
                        headers: { 'User-Agent': 'Mozilla/5.0' },
                        validateStatus: (status) => status < 400
                    });
                    return { url, alive: true, status: response.status };
                } catch (err: any) {
                    // Some servers block HEAD, try a light GET
                    try {
                        const response = await axios.get(url, { 
                            timeout: 3000, 
                            headers: { 'User-Agent': 'Mozilla/5.0', 'Range': 'bytes=0-0' },
                            validateStatus: (status) => status < 400
                        });
                        return { url, alive: true, status: response.status };
                    } catch (e: any) {
                        return { url, alive: false, error: e.message };
                    }
                }
            })
        );

        const healthCheckResults = results.map((res: any) => 
            res.status === 'fulfilled' ? res.value : { url: 'unknown', alive: false }
        );

        return NextResponse.json({ results: healthCheckResults });
    } catch (error: any) {
        return NextResponse.json({ error: "Health check failed" }, { status: 500 });
    }
}
