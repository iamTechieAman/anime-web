import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// List of known automated tools and scrapers to block
const BLOCKED_UAS = [
    'curl', 'wget', 'python', 'scrapy', 'postman', 
    'bot', 'crawl', 'spider', 'slurp', 'nikto',
    'headlesschrome', 'puppeteer', 'playwright', 'cypress'
];

export function middleware(request: NextRequest) {
    const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';

    // Advanced Bot Protection: Block empty user agents or script bots
    if (!userAgent || BLOCKED_UAS.some(ua => userAgent.includes(ua))) {
        // Drop the connection for scrapers (403 Forbidden)
        return new NextResponse(
            JSON.stringify({ 
                error: 'Access denied.', 
                message: 'Your IP or User-Agent has been flagged for automated behavior.' 
            }),
            { 
                status: 403, 
                headers: { 'content-type': 'application/json' } 
            }
        );
    }

    const response = NextResponse.next();

    // Comprehensive Security Headers
    response.headers.set('X-Content-Type-Options', 'nosniff'); // Prevent MIME sniffing
    response.headers.set('X-Frame-Options', 'SAMEORIGIN'); // Prevent clickjacking
    response.headers.set('X-XSS-Protection', '1; mode=block'); // Cross-site scripting (XSS) filter
    response.headers.set('X-DNS-Prefetch-Control', 'on');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Strict Transport Security (HSTS) - enforce HTTPS
    if (process.env.NODE_ENV === 'production') {
        response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    return response;
}

// Optimize matcher to skip static files and images
export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|_vercel|images).*)',
    ],
}
