"use client";

import { useEffect, useRef, useState } from "react";
import Artplayer from "artplayer";
import Hls from "hls.js";

interface PlayerProps {
    option: {
        url: string;
        poster?: string;
        title?: string;
        [key: string]: any;
    };
    className?: string;
    style?: React.CSSProperties;
    getInstance?: (art: Artplayer) => void;
    onEnded?: () => void;
    autoPlay?: boolean;
    autoNext?: boolean;
}

export default function Player({ option, className, style, getInstance, onEnded, autoPlay = false, autoNext = false }: PlayerProps) {
    const artRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<Artplayer | null>(null);
    const [showCountdown, setShowCountdown] = useState(false);
    const [countdown, setCountdown] = useState(5);
    const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const isDestroyed = useRef(false);

    useEffect(() => {
        isDestroyed.current = false;
        if (!artRef.current) return;

        // Initialize ArtPlayer only if it doesn't exist
        if (!playerRef.current) {
            try {
                const art = new Artplayer({
                    container: artRef.current,
                    // url: option.url, // REMOVED to avoid duplication with ...option
                    poster: option.poster || "",
                    title: option.title,
                    volume: 0.5,
                    isLive: false,
                    muted: false,
                    autoplay: autoPlay,
                    pip: false,
                    autoSize: true,
                    autoMini: false,
                    screenshot: true,
                    setting: true,
                    loop: false,
                    flip: true,
                    playbackRate: true,
                    aspectRatio: true,
                    fullscreen: true,
                    fullscreenWeb: true,
                    subtitleOffset: true,
                    miniProgressBar: true,
                    mutex: true,
                    backdrop: true,
                    playsInline: true,
                    autoPlayback: true,
                    airplay: true,
                    theme: '#a855f7',
                    lang: 'en',
                    moreVideoAttr: {
                        crossOrigin: 'anonymous',
                        playsInline: true,
                        'webkit-playsinline': 'true',
                        'x5-playsinline': 'true',
                    } as any,
                    type: option.type || (option.url.includes('.m3u8') ? 'm3u8' : 'auto'),
                    customType: {
                        m3u8: function (video: HTMLVideoElement, url: string, art: Artplayer) {
                            console.log('[ArtPlayer] Initializing HLS for URL:', url);
                            if (Hls.isSupported()) {
                                if ((art as any).hls) (art as any).hls.destroy();
                                const hls = new Hls({
                                    // Aggressive buffering for near-instant startup
                                    maxBufferLength: 15,
                                    maxMaxBufferLength: 30,
                                    maxBufferSize: 15 * 1000 * 1000,

                                    // Faster initial load
                                    initialLiveManifestSize: 1,
                                    nudgeMaxRetry: 10,

                                    // Stability and workers
                                    enableWorker: true,
                                    lowLatencyMode: true,
                                    backBufferLength: 5,

                                    // Fast timeouts for quick fallback
                                    manifestLoadingTimeOut: 5000,  // 5s manifest timeout
                                    manifestLoadingMaxRetry: 2,
                                    levelLoadingTimeOut: 5000,
                                    levelLoadingMaxRetry: 2,
                                    fragLoadingTimeOut: 10000,
                                    fragLoadingMaxRetry: 3,
                                    startLevel: -1,  // Auto-quality 
                                });

                                hls.loadSource(url);
                                hls.attachMedia(video);
                                (art as any).hls = hls;

                                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                                    if (art.option.autoplay && !isDestroyed.current && art.video.isConnected) {
                                        art.play().catch((e) => {
                                            console.warn('[ArtPlayer] Auto-play prevented:', e);
                                        });
                                    }
                                });

                                hls.on(Hls.Events.ERROR, function (event, data) {
                                    if (data.fatal) {
                                        console.error('[ArtPlayer] HLS Fatal Error:', data.type, data.details);
                                        switch (data.type) {
                                            case Hls.ErrorTypes.NETWORK_ERROR:
                                                console.log('[ArtPlayer] Attempting to recover from network error...');
                                                hls.startLoad();
                                                break;
                                            case Hls.ErrorTypes.MEDIA_ERROR:
                                                console.log('[ArtPlayer] Attempting to recover from media error...');
                                                hls.recoverMediaError();
                                                break;
                                            default:
                                                console.error('[ArtPlayer] Unrecoverable error, destroying HLS instance.');
                                                hls.destroy();
                                                break;
                                        }
                                    }
                                });

                                art.on('destroy', () => {
                                    console.log('[ArtPlayer] Destroying HLS instance via ArtPlayer destroy event');
                                    hls.detachMedia();
                                    hls.destroy();
                                });
                            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                                video.src = url;
                            } else {
                                art.notice.show = 'Unsupported playback format: m3u8';
                            }
                        },
                    },
                    ...option, // Override defaults
                });

                playerRef.current = art;

                if (getInstance && typeof getInstance === 'function') {
                    getInstance(art);
                }

                art.on('video:ended', () => {
                    if (onEnded && !isDestroyed.current) onEnded();
                });
            } catch (e) {
                console.error('[ArtPlayer] Initialization Error:', e);
            }
        } else {
            // This block is less critical now as we force remount, 
            // but keeping simple switch logic just in case.
            const art = playerRef.current;
            if (option.url && option.url !== art.option.url) {
                console.log('[ArtPlayer] Switching URL:', option.url);
                art.switchUrl(option.url);
                (art.option as any).title = option.title;
            }
        }

        // Handle Auto-Next Logic dynamically
        if (playerRef.current) {
            const art = playerRef.current;
            art.off('video:ended');
            art.on('video:ended', () => {
                // STRICT CHECK: Only proceed if autoNext is explicitly TRUE
                if (autoNext && onEnded && !isDestroyed.current) {
                    setShowCountdown(true);
                    setCountdown(5);
                    countdownIntervalRef.current = setInterval(() => {
                        setCountdown(prev => {
                            if (prev <= 1) {
                                if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
                                setShowCountdown(false);
                                // Use setTimeout to avoid setState during render
                                setTimeout(() => {
                                    if (onEnded && !isDestroyed.current) onEnded();
                                }, 0);
                                return 0;
                            }
                            return prev - 1;
                        });
                    }, 1000);
                }
                // If autoNext is FALSE, do NOTHING. 
                // The user must manually click to next episode.
            });
        }

        return () => {
            if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
            }
        };
    }, [option.url, autoNext, autoPlay, onEnded, getInstance, option.title, option.poster, option.type]);

    useEffect(() => {
        if (playerRef.current) {
            playerRef.current.option.autoplay = autoPlay;
        }
    }, [autoPlay]);

    useEffect(() => {
        return () => {
            isDestroyed.current = true;
            if (playerRef.current) {
                console.log('[ArtPlayer] Unmounting and destroying player instance');
                playerRef.current.destroy(false);
                playerRef.current = null;
            }
        };
    }, []);

    const cancelAutoNext = () => {
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
        }
        setShowCountdown(false);
        setCountdown(5);
    };

    return (
        <div className="relative w-full">
            <div
                ref={artRef}
                className={className}
                style={{
                    ...style,
                    width: '100%',
                    aspectRatio: '16/9', // Enforce aspect ratio
                }}
            />

            {/* Auto-Next Countdown Overlay */}
            {showCountdown && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-[#0a0a0a] border border-purple-500/30 rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl">
                        <div className="mb-4">
                            <div className="w-20 h-20 mx-auto rounded-full border-4 border-purple-500 flex items-center justify-center text-3xl font-bold text-white mb-4">
                                {countdown}
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Next Episode Starting Soon</h3>
                            <p className="text-sm text-zinc-400">Playing next episode in {countdown} seconds...</p>
                        </div>
                        <button
                            onClick={cancelAutoNext}
                            className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg font-medium transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
