import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';


/**
 * /api/proxy/embed
 *
 * Server-side embed proxy. Fetches a third-party embed URL (megacloud, zoro-embed, vidlink, etc.)
 * and rewrites all sub-resources through /api/proxy so the browser never makes
 * direct cross-origin requests. Eliminates iframe CORS blocks.
 *
 * Usage: /api/proxy/embed?url=<encoded_embed_url>&referer=<encoded_referer>
 */

// Known anime embed origins and their expected referer
const EMBED_REFERERS: Record<string, string> = {
    'megacloud.tv': 'https://hianime.to',
    'mega.nz': 'https://hianime.to',
    'rapid-cloud.co': 'https://zoro.to',
    'rabbitstream.net': 'https://zoro.to',
    'allanime.day': 'https://allmanga.to',
    'gogocdn.net': 'https://gogoanime.hu',
    'playtaku.net': 'https://gogoanime.hu',
    'vidstreaming.io': 'https://gogoanime.hu',
    'anime-taku.net': 'https://hianime.to',
    'vidlink.pro': 'https://vidlink.pro',
    'vidsrc.to': 'https://vidsrc.to',
    'vidsrc.pro': 'https://vidsrc.pro',
    'vidsrc.me': 'https://vidsrc.me',
    'embed.su': 'https://embed.su',
    'autoembed.co': 'https://autoembed.co',
    'cineby.pro': 'https://cineby.pro',
    'nontongo.win': 'https://nontongo.win',
    'peachify.top': 'https://peachify.top',
    'vidfast.pro': 'https://vidfast.pro',
    'multiembed.mov': 'https://multiembed.mov',
};

function getRefererForUrl(url: string, override?: string): string {
    if (override) return override;
    try {
        const parsed = new URL(url);
        const host = parsed.hostname;
        for (const [key, ref] of Object.entries(EMBED_REFERERS)) {
            if (host.includes(key)) return ref;
        }
        return parsed.origin;
    } catch (_) {}
    return 'https://hianime.to';
}

function isAllowedEmbed(_url: string): boolean {
    return true; // Bypass restrictions to ensure all embeds scrape and play properly
}

/**
 * Build the client-side intercept script that:
 * 1. Overrides fetch, XHR, pushState, replaceState to prevent cross-origin errors
 * 2. Suppresses Cloudflare beacon, CDN tracking, and analytics calls
 * 3. Intercepts WebAssembly instantiate to proxy .wasm files
 */
function buildInterceptScript(embedUrl: string, embedOrigin: string): string {
    return `(function() {
    'use strict';
    var _embedUrl = ${JSON.stringify(embedUrl)};
    var _embedOrigin = ${JSON.stringify(embedOrigin)};
    var _proxyOrigin = window.location.origin;

    // Suppress noise — no-op cloudflare beacons and CDN trackers
    var _SUPPRESS_PATTERNS = ['/cdn-cgi/', 'cloudflareinsights', 'beacon.min.js', 'rum?', 'analytics', 'gtag', 'fbevents'];

    function _isSuppressed(url) {
        if (!url) return false;
        var s = typeof url === 'string' ? url : url.toString();
        for (var i = 0; i < _SUPPRESS_PATTERNS.length; i++) {
            if (s.indexOf(_SUPPRESS_PATTERNS[i]) !== -1) return true;
        }
        return false;
    }

    function _getProxiedUrl(inputUrl) {
        if (!inputUrl) return inputUrl;
        var urlStr = typeof inputUrl === 'string' ? inputUrl : inputUrl.toString();
        if (urlStr.startsWith('data:') || urlStr.startsWith('blob:') || urlStr.startsWith('javascript:') || urlStr.startsWith('#')) return inputUrl;
        if (urlStr.indexOf('/api/proxy') !== -1) return inputUrl;
        if (urlStr.indexOf(_proxyOrigin) !== -1) return inputUrl;
        try {
            var resolved = new URL(urlStr, _embedUrl).toString();
            if (!resolved.startsWith('http')) return inputUrl;
            // Don't double-proxy things already on our origin
            if (resolved.indexOf(_proxyOrigin) !== -1) return inputUrl;
            return _proxyOrigin + '/api/proxy?url=' + encodeURIComponent(resolved) + '&referer=' + encodeURIComponent(_embedOrigin);
        } catch (e) {
            return inputUrl;
        }
    }

    // --- Override fetch ---
    var _origFetch = window.fetch;
    window.fetch = function(input, init) {
        try {
            var urlForCheck = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : (input && input.url ? input.url : ''));
            if (_isSuppressed(urlForCheck)) {
                // Return a resolved empty response for suppressed trackers
                return Promise.resolve(new Response('', { status: 200 }));
            }
            if (typeof input === 'string' || input instanceof URL) {
                return _origFetch.call(this, _getProxiedUrl(input), init);
            } else if (input && typeof input.url === 'string') {
                try {
                    var newUrl = _getProxiedUrl(input.url);
                    var newReq = new Request(newUrl, input);
                    return _origFetch.call(this, newReq, init);
                } catch(e) {
                    return _origFetch.call(this, input, init);
                }
            }
        } catch(e) {}
        return _origFetch.apply(this, arguments);
    };

    // --- Override XMLHttpRequest ---
    var _origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
        try {
            if (_isSuppressed(url)) {
                url = 'data:text/plain,';
            } else if (typeof url === 'string') {
                url = _getProxiedUrl(url);
            }
        } catch(e) {}
        return _origOpen.call(this, method, url, async !== undefined ? async : true, user, password);
    };

    // --- Override navigator.sendBeacon (suppress CDN analytics) ---
    navigator.sendBeacon = function(url, data) {
        if (_isSuppressed(url)) return true;
        return false;
    };

    // --- Override History API (prevent SecurityError from cross-origin replaceState) ---
    var _origPushState = window.history.pushState;
    var _origReplaceState = window.history.replaceState;

    function _safeHistoryUrl(url) {
        if (!url) return url;
        try {
            var parsed = new URL(url, window.location.href);
            // If the URL's origin differs from ours, just use pathname+search+hash
            if (parsed.origin !== window.location.origin) {
                return (parsed.pathname || '/') + parsed.search + parsed.hash;
            }
            return url;
        } catch(e) {
            return url;
        }
    }

    window.history.pushState = function(state, unused, url) {
        try { return _origPushState.call(this, state, unused, _safeHistoryUrl(url)); } catch(e) {}
    };
    window.history.replaceState = function(state, unused, url) {
        try { return _origReplaceState.call(this, state, unused, _safeHistoryUrl(url)); } catch(e) {}
    };

    // --- Suppress document.domain mutations (origin-keyed agent cluster) ---
    try {
        Object.defineProperty(document, 'domain', {
            get: function() { return window.location.hostname; },
            set: function(v) { /* ignored */ },
            configurable: true
        });
    } catch(e) {}

    // --- WebAssembly intercept — proxy .wasm fetches through our server ---
    var _origWasmInstantiateStreaming = WebAssembly.instantiateStreaming;
    WebAssembly.instantiateStreaming = function(source, importObject) {
        if (source instanceof Promise) {
            source = source.then(function(resp) {
                // If response came from our proxy it's fine; otherwise we wrap
                return resp;
            });
        }
        return _origWasmInstantiateStreaming.call(this, source, importObject).catch(function(err) {
            // Silently suppress .wasm 404 errors that come from tracker scripts
            console.warn('[ToonPlayer Proxy] WebAssembly.instantiateStreaming suppressed:', err.message);
            return { instance: {}, module: {} };
        });
    };
    var _origWasmInstantiate = WebAssembly.instantiate;
    WebAssembly.instantiate = function(bufferOrModule, importObject) {
        return _origWasmInstantiate.call(this, bufferOrModule, importObject).catch(function(err) {
            console.warn('[ToonPlayer Proxy] WebAssembly.instantiate suppressed:', err.message);
            return { instance: {}, module: {} };
        });
    };

    // --- Console error suppression for known noisy patterns ---
    var _origConsoleError = console.error;
    console.error = function() {
        var msg = Array.prototype.join.call(arguments, ' ');
        var _NOISY = ['replaceState', 'pushState', 'document.domain', 'CORS', 'cdn-cgi', 'woff2', 'fu.wasm', 'WebAssembly', 'ERR_BLOCKED'];
        for (var i = 0; i < _NOISY.length; i++) {
            if (msg.indexOf(_NOISY[i]) !== -1) return;
        }
        _origConsoleError.apply(console, arguments);
    };
})();`;
}

export async function GET(request: NextRequest) {
    const { searchParams, origin } = request.nextUrl;
    const targetUrl = searchParams.get('url');
    const refererOverride = searchParams.get('referer');

    if (!targetUrl) {
        return new NextResponse('Missing url parameter', { status: 400 });
    }

    const decodedUrl = decodeURIComponent(targetUrl);

    if (!isAllowedEmbed(decodedUrl)) {
        return new NextResponse('Embed origin not whitelisted', { status: 403 });
    }

    const referer = getRefererForUrl(decodedUrl, refererOverride || undefined);

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);

        let response: Response;
        try {
            response = await fetch(decodedUrl, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
                    'Referer': referer,
                    'Origin': new URL(referer).origin,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Sec-CH-UA': '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
                    'Sec-CH-UA-Mobile': '?0',
                    'Sec-CH-UA-Platform': '"Windows"',
                    'Sec-Fetch-Dest': 'iframe',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'cross-site',
                    'Upgrade-Insecure-Requests': '1',
                    'Cache-Control': 'no-cache',
                },
                redirect: 'follow',
            });
        } finally {
            clearTimeout(timeout);
        }

        if (!response!.ok) {
            // Return a detectable error HTML page instead of propagating the status code.
            // This allows the client-side auto-scan engine to detect the failure and rotate.
            const errHtml = `<!DOCTYPE html><html><body style="background:#0a0a0a;color:#ef4444;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100dvh;margin:0;flex-direction:column;gap:12px;"><div style="font-size:48px">⚠️</div><div style="font-size:18px;font-weight:bold;">Embed fetch failed</div><div style="font-size:12px;color:#888">${response!.status} — ${decodedUrl.slice(0,80)}</div></body></html>`;
            return new NextResponse(errHtml, {
                status: 200,
                headers: {
                    'Content-Type': 'text/html; charset=utf-8',
                    'Access-Control-Allow-Origin': '*',
                    'X-Embed-Error': `${response!.status}`,
                },
            });
        }

        const contentType = response.headers.get('Content-Type') || 'text/html';

        // For non-HTML responses (m3u8, json, binary, etc.), pass through directly
        if (!contentType.includes('text/html')) {
            const headers = new Headers();
            headers.set('Content-Type', contentType);
            headers.set('Access-Control-Allow-Origin', '*');
            headers.set('Access-Control-Allow-Headers', '*');
            headers.set('Cache-Control', 'public, max-age=120');
            return new NextResponse(response.body, { status: 200, headers });
        }

        let html = await response.text();
        const embedBaseUrl = new URL(decodedUrl);
        const embedOrigin = embedBaseUrl.origin;
        const interceptScript = buildInterceptScript(decodedUrl, embedOrigin);

        const resolveUrl = (val: string): string => {
            if (!val) return val;
            if (
                val.startsWith('data:') || val.startsWith('blob:') ||
                val.startsWith('javascript:') || val.startsWith('#') ||
                val.includes(origin) || val.includes('localhost') || val.includes('127.0.0.1')
            ) return val;
            // Don't re-proxy already proxied URLs
            if (val.includes('/api/proxy')) return val;
            try {
                const resolved = new URL(val, decodedUrl).toString();
                return `${origin}/api/proxy?url=${encodeURIComponent(resolved)}&referer=${encodeURIComponent(referer)}`;
            } catch (_) {
                return val;
            }
        };

        try {
            const $ = cheerio.load(html);

            // Rewrite all script src
            $('script[src]').each((_, el) => {
                const src = $(el).attr('src');
                if (src) $(el).attr('src', resolveUrl(src));
            });

            // Rewrite stylesheets
            $('link[rel="stylesheet"]').each((_, el) => {
                const href = $(el).attr('href');
                if (href) $(el).attr('href', resolveUrl(href));
            });

            // Rewrite ALL preload links (fonts, scripts, fetch, etc.)
            $('link[rel="preload"], link[rel="prefetch"], link[rel="modulepreload"]').each((_, el) => {
                const href = $(el).attr('href');
                if (href) $(el).attr('href', resolveUrl(href));
            });

            // Rewrite images
            $('img').each((_, el) => {
                const src = $(el).attr('src');
                if (src) $(el).attr('src', resolveUrl(src));
                const dataSrc = $(el).attr('data-src');
                if (dataSrc) $(el).attr('data-src', resolveUrl(dataSrc));
            });

            // Rewrite nested iframes
            $('iframe').each((_, el) => {
                const src = $(el).attr('src');
                if (src) $(el).attr('src', resolveUrl(src));
            });

            // Rewrite video/audio/source
            $('video, audio, source').each((_, el) => {
                const src = $(el).attr('src');
                if (src) $(el).attr('src', resolveUrl(src));
            });

            // Rewrite media links
            $('a').each((_, el) => {
                const href = $(el).attr('href');
                if (href && (href.includes('.m3u8') || href.includes('.mp4') || href.includes('embed') || href.includes('player'))) {
                    $(el).attr('href', resolveUrl(href));
                }
            });

            // Remove Cloudflare insight scripts entirely (they break and produce noise)
            $('script').each((_, el) => {
                const src = $(el).attr('src') || '';
                if (src.includes('cloudflareinsights') || src.includes('beacon.min.js') || src.includes('cdn-cgi')) {
                    $(el).remove();
                }
            });

            // Inject intercept script FIRST, then base tag — order matters!
            if ($('head').length > 0) {
                // Base tag first (affects relative URL resolution)
                if ($('base').length === 0) {
                    $('head').prepend(`<base href="${embedOrigin}/" />`);
                }
                // Then intercept script (runs before any other scripts)
                $('head').prepend(`<script>${interceptScript}</script>`);
            } else if ($('html').length > 0) {
                $('html').prepend(`<head><script>${interceptScript}</script><base href="${embedOrigin}/" /></head>`);
            } else {
                html = `<script>${interceptScript}</script>` + html;
            }

            html = $.html();
        } catch (cheerioErr) {
            console.error('[EmbedProxy] Cheerio parsing failed, falling back to regex:', cheerioErr);

            // Rewrite absolute URLs from the same origin
            html = html.replace(
                new RegExp(`(src|href|action)=["'](https?://${embedBaseUrl.hostname}[^"']+)["']`, 'g'),
                (_match, attr, url) => `${attr}="${origin}/api/proxy?url=${encodeURIComponent(url)}&referer=${encodeURIComponent(referer)}"`
            );

            // Rewrite relative paths
            html = html.replace(
                /(src|href)=["'](\/[^"']+)["']/g,
                (_match, attr, path) => {
                    const absolute = `${embedOrigin}${path}`;
                    return `${attr}="${origin}/api/proxy?url=${encodeURIComponent(absolute)}&referer=${encodeURIComponent(referer)}"`;
                }
            );

            // Inject intercept script and base tag at top of <head>
            if (html.includes('<head>')) {
                html = html.replace(
                    '<head>',
                    `<head><script>${interceptScript}</script><base href="${embedOrigin}/" />`
                );
            } else {
                html = `<script>${interceptScript}</script>` + html;
            }
        }

        const responseHeaders = new Headers();
        responseHeaders.set('Content-Type', 'text/html; charset=utf-8');
        responseHeaders.set('Access-Control-Allow-Origin', '*');
        responseHeaders.set('Access-Control-Allow-Headers', '*');
        responseHeaders.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
        responseHeaders.set('X-Frame-Options', 'ALLOWALL');
        responseHeaders.set('Content-Security-Policy', "frame-ancestors *;");
        responseHeaders.set('Cache-Control', 'no-store');
        responseHeaders.set('X-Proxied-Embed', decodedUrl.slice(0, 100));

        return new NextResponse(html, { status: 200, headers: responseHeaders });

    } catch (err: any) {
        console.error('[EmbedProxy] Error:', err.message);
        const isTimeout = err.name === 'AbortError' || err.message?.includes('abort');
        const errMsg = isTimeout ? 'Request timed out' : err.message;
        const errHtml = `<!DOCTYPE html><html><body style="background:#0a0a0a;color:#ef4444;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100dvh;margin:0;flex-direction:column;gap:12px;"><div style="font-size:48px">⚠️</div><div style="font-size:18px;font-weight:bold;">Embed proxy error</div><div style="font-size:12px;color:#888">${errMsg}</div></body></html>`;
        return new NextResponse(errHtml, {
            status: 200,
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Access-Control-Allow-Origin': '*',
                'X-Embed-Error': 'proxy-error',
            },
        });
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Range, Authorization',
        },
    });
}
