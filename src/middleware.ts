import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

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

// Simple in-memory rate limiting map for edge runtime
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();

function isRateLimited(ip: string, limit = 40, windowMs = 60000): boolean {
    const now = Date.now();
    const current = rateLimitMap.get(ip) || { count: 0, lastReset: now };
    
    if (now - current.lastReset > windowMs) {
        current.count = 1;
        current.lastReset = now;
        rateLimitMap.set(ip, current);
        return false;
    }
    
    current.count++;
    rateLimitMap.set(ip, current);
    
    return current.count > limit;
}

export default clerkMiddleware(async (auth, request) => {
    const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';
    const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for') || 'anonymous';

    // 1. Rate Limiting for API routes
    if (request.nextUrl.pathname.startsWith('/api')) {
        const limit = request.nextUrl.pathname.includes('/search') ? 20 : 40; // Strict limit on search
        if (isRateLimited(ip, limit, 60000)) {
            return new NextResponse(
                JSON.stringify({ 
                    error: 'Rate limit exceeded.', 
                    message: 'Too many requests. Please try again later.' 
                }),
                { 
                    status: 429, 
                    headers: { 'content-type': 'application/json' } 
                }
            );
        }
    }

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

    // Comprehensive Security & CSP Headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'SAMEORIGIN');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('X-DNS-Prefetch-Control', 'on');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    
    // Content-Security-Policy (CSP) restricting frame embedding origins
    response.headers.set(
        'Content-Security-Policy',
        "frame-src 'self' https://*.tmdb.org https://*.vidsrc.me https://*.vidsrc.to https://*.vidsrc.xyz https://*.embed.su https://*.vidlink.pro https://*.peachify.top; frame-ancestors 'self' https://toonplayer.in;"
    );

    // Strict Transport Security (HSTS) - enforce HTTPS
    if (process.env.NODE_ENV === 'production') {
        response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    return response;
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
    // Always run for Clerk-specific frontend API routes
    '/__clerk/(.*)',
  ],
};
