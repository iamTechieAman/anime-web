import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0'
];

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const targetUrl = url.searchParams.get('url');

        if (!targetUrl) {
            return new NextResponse('Missing url parameter', { status: 400 });
        }

        // Validate URL
        try {
            new URL(targetUrl);
        } catch {
            return new NextResponse('Invalid URL', { status: 400 });
        }

        // Try to fetch the page to extract raw streams
        let html = '';
        try {
            const response = await axios.get(targetUrl, {
                headers: {
                    'User-Agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
                    'Referer': new URL(targetUrl).origin,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                },
                timeout: 8000,
            });
            html = response.data;
        } catch (error) {
            console.warn(`[VideoProxy] Failed to fetch target URL: ${targetUrl}. Falling back to sandboxed iframe.`);
            return serveFallbackIframe(targetUrl);
        }

        // Try to extract .m3u8 or .mp4 links using Regex
        const m3u8Match = html.match(/(https?:\/\/[^\s"'<>]+?\.m3u8[^\s"'<>]*)/i);
        const mp4Match = html.match(/(https?:\/\/[^\s"'<>]+?\.mp4[^\s"'<>]*)/i);
        
        const rawVideoUrl = m3u8Match ? m3u8Match[1] : (mp4Match ? mp4Match[1] : null);

        if (rawVideoUrl && !rawVideoUrl.includes('blob:')) {
            console.log(`[VideoProxy] Successfully extracted raw stream: ${rawVideoUrl}`);
            return serveCleanPlayer(rawVideoUrl);
        }

        console.log(`[VideoProxy] No direct stream found in HTML. Falling back to sandboxed iframe.`);
        return serveFallbackIframe(targetUrl);

    } catch (error) {
        console.error('[VideoProxy] Fatal Error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

// Serves a clean, native video player without any ads or popups
function serveCleanPlayer(videoUrl: string) {
    const isM3u8 = videoUrl.includes('.m3u8');
    
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Video Player</title>
        <style>
            body { margin: 0; padding: 0; background: #000; overflow: hidden; width: 100vw; height: 100vh; }
            video { width: 100%; height: 100%; object-fit: contain; }
            #error-overlay { display: none; position: absolute; inset: 0; background: rgba(0,0,0,0.8); color: white; flex-direction: column; align-items: center; justify-content: center; font-family: sans-serif; }
            #play-fallback { display: none; position: absolute; inset: 0; background: rgba(0,0,0,0.4); z-index: 50; flex-direction: column; align-items: center; justify-content: center; }
            #play-btn { width: 80px; height: 80px; background: rgba(59, 130, 246, 0.9); border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; color: white; font-size: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); border: none; padding-left: 8px; }
        </style>
        ${isM3u8 ? '<script src="https://cdn.jsdelivr.net/npm/hls.js@1"></script>' : ''}
    </head>
    <body>
        <video id="player" controls autoplay muted playsinline></video>
        <div id="play-fallback">
            <button id="play-btn">▶</button>
        </div>
        <div id="error-overlay">
            <h3>Playback Error</h3>
            <p>The stream may be blocked by CORS or is no longer available.</p>
        </div>

        <script>
            // Hard block window.open
            window.open = function() { console.warn("Blocked popup attempt"); return null; };
            
            const video = document.getElementById('player');
            const source = "${videoUrl.replace(/"/g, '\\"')}";
            
            // Notify parent of the direct video source for Casting
            window.parent.postMessage({ type: 'VIDEO_SOURCE_FOUND', source: source }, '*');
            
            // Listen for postMessage to trigger unmute/play
            window.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'PLAY_WITH_SOUND') {
                    attemptAutoplay();
                }
            });

            // Notify parent when video finishes (for auto-next episode)
            video.addEventListener('ended', () => {
                window.parent.postMessage({ type: 'VIDEO_ENDED' }, '*');
            });

            function attemptAutoplay() {
                video.play().then(() => {
                    video.muted = false; // Unmute after play promise resolves
                    document.getElementById('play-fallback').style.display = 'none';
                }).catch((err) => {
                    console.warn("Autoplay with sound rejected", err);
                    document.getElementById('play-fallback').style.display = 'flex';
                });
            }

            document.getElementById('play-btn').addEventListener('click', () => {
                video.muted = false;
                video.play();
                document.getElementById('play-fallback').style.display = 'none';
            });

            if (${isM3u8}) {
                if (Hls.isSupported()) {
                    const hls = new Hls({ maxMaxBufferLength: 60 });
                    hls.loadSource(source);
                    hls.attachMedia(video);
                    hls.on(Hls.Events.ERROR, function (event, data) {
                        if (data.fatal) {
                            document.getElementById('error-overlay').style.display = 'flex';
                        }
                    });
                } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                    video.src = source;
                }
            } else {
                video.src = source;
                video.onerror = function() {
                    document.getElementById('error-overlay').style.display = 'flex';
                };
            }
        </script>
    </body>
    </html>
    `;

    return new NextResponse(html, {
        headers: {
            'Content-Type': 'text/html',
            'Content-Security-Policy': "frame-ancestors *",
            'X-Frame-Options': 'SAMEORIGIN'
        }
    });
}

// Serves the original URL but completely locked down using strict iframe sandbox
function serveFallbackIframe(targetUrl: string) {
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Secure Player</title>
        <style>
            body { margin: 0; padding: 0; background: #000; overflow: hidden; width: 100vw; height: 100vh; }
            iframe { width: 100%; height: 100%; border: none; }
            #cover { position: absolute; inset: 0; z-index: 100; pointer-events: auto; background: transparent; display: flex; align-items: center; justify-content: center; }
            #click-to-play { padding: 12px 24px; background: rgba(59, 130, 246, 0.9); color: white; font-family: sans-serif; font-weight: bold; border-radius: 8px; cursor: pointer; backdrop-filter: blur(4px); box-shadow: 0 4px 12px rgba(0,0,0,0.5); }
        </style>
    </head>
    <body>
        <div id="cover">
            <div id="click-to-play">Click to Play Ad-Free</div>
        </div>
        <!-- Removed strict sandbox to fix provider playback issues -->
        <iframe 
            src="${targetUrl.replace(/"/g, '&quot;')}" 
            allow="fullscreen; autoplay; encrypted-media; picture-in-picture"
            referrerpolicy="no-referrer"
        ></iframe>

        <script>
            // Hard block window.open in the proxy context
            window.open = function() { console.warn("Blocked popup attempt"); return null; };
            
            // Require user interaction to bypass initial ad-overlays safely
            const cover = document.getElementById('cover');
            cover.addEventListener('click', () => {
                cover.style.display = 'none';
            });
        </script>
    </body>
    </html>
    `;

    return new NextResponse(html, {
        headers: {
            'Content-Type': 'text/html',
            'Content-Security-Policy': "frame-ancestors *",
            'X-Frame-Options': 'SAMEORIGIN'
        }
    });
}
