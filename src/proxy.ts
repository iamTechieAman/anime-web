import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
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

// Explicit public routes that must NEVER trigger auth redirects or 401 challenges
const isPublicRoute = createRouteMatcher([
    '/',
    '/search(.*)',
    '/watch(.*)',
    '/anime(.*)',
    '/cartoon(.*)',
    '/movies(.*)',
    '/tv(.*)',
    '/trending(.*)',
    '/top-rated(.*)',
    '/genres(.*)',
    '/az-list(.*)',
    '/discover(.*)',
    '/login(.*)',
    '/register(.*)',
    '/sign-in(.*)',
    '/sign-up(.*)',
    '/about(.*)',
    '/privacy(.*)',
    '/terms(.*)',
    '/contact(.*)',
    '/manifest(.*)',
    '/robots.txt',
    '/sitemap.xml',
    // Public APIs — search, content catalogs, scrapers, proxies, etc.
    '/api/search(.*)',
    '/api/prime(.*)',
    '/api/anime(.*)',
    '/api/cartoon(.*)',
    '/api/proxy(.*)',
    '/api/discover(.*)',
    '/api/trending(.*)',
    '/api/random(.*)',
    '/api/health(.*)',
    '/api/download(.*)',
    '/api/auth(.*)',
]);

export default clerkMiddleware(async (auth, request: any) => {
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

    // Route Guard Audit:
    // If the route is public, strictly bypass route guards (never redirect or 401)
    if (!isPublicRoute(request)) {
        // Protected API routes: return JSON 401 instead of redirecting to login page
        if (request.nextUrl.pathname.startsWith('/api/')) {
            const { userId } = await auth();
            if (!userId) {
                return new NextResponse(
                    JSON.stringify({ error: 'Unauthorized', message: 'Authentication required' }),
                    { status: 401, headers: { 'content-type': 'application/json' } }
                );
            }
        } else {
            // Protected Web Pages: apply Clerk auth protection
            await auth.protect();
        }
    }

    const response = NextResponse.next();

    // Comprehensive Security Headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'SAMEORIGIN');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('X-DNS-Prefetch-Control', 'on');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(self), geolocation=()');
    
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
