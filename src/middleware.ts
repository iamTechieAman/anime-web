import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Allowlisted search engine bots — NEVER block these
const ALLOWED_BOTS = [
    'googlebot', 'bingbot', 'yandexbot', 'duckduckbot', 'baiduspider',
    'slurp', 'facebot', 'facebookexternalhit', 'twitterbot', 'linkedinbot',
    'whatsapp', 'telegrambot', 'applebot', 'pinterestbot', 'redditbot',
    'google-extended', 'gptbot', 'chatgpt-user', 'perplexitybot',
    'anthropic-ai', 'claude-web', 'ccbot',
    'lighthouse', 'pagespeed', 'chrome-lighthouse',
    'uptimerobot', 'pingdom', 'google-inspectiontool', 'googleOther', 'storebot-google'
];

// Only block clearly malicious automated tools and scrapers
const BLOCKED_UAS = [
    'scrapy', 'nikto', 'masscan', 'nmap', 'sqlmap',
    'httrack', 'offline explorer', 'webcopier',
    'harvest', 'emailcollector', 'linkextractor',
];

export function middleware(request: NextRequest) {
    const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';

    // Allow requests with empty user agents from internal Next.js prefetching
    if (!userAgent && request.headers.get('x-nextjs-data')) {
        return NextResponse.next();
    }

    // Always allow known search engine bots
    const isAllowedBot = ALLOWED_BOTS.some(bot => userAgent.includes(bot));
    
    // Only block if NOT an allowed bot AND matches a malicious pattern
    if (!isAllowedBot && userAgent && BLOCKED_UAS.some(ua => userAgent.includes(ua))) {
        return new NextResponse(
            JSON.stringify({ 
                error: 'Access denied.', 
                message: 'Automated scraping is not permitted.' 
            }),
            { 
                status: 403, 
                headers: { 'content-type': 'application/json' } 
            }
        );
    }

    const response = NextResponse.next();

    // Comprehensive Security Headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'SAMEORIGIN');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('X-DNS-Prefetch-Control', 'on');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    
    // Strict Transport Security (HSTS) - enforce HTTPS
    if (process.env.NODE_ENV === 'production') {
        response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    return response;
}

// Optimize matcher to skip static files and images
export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|_vercel|images|logo|icon|manifest|robots|sitemap|ads.txt|google).*)',
    ],
}
