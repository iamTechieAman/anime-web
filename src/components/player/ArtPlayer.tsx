"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Artplayer from "artplayer";
import Hls from "hls.js";
// @ts-ignore
import artplayerPluginChromecast from 'artplayer-plugin-chromecast';

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
    onError?: (error: any) => void;
    onTimeUpdate?: (currentTime: number, duration: number) => void;
    initialTime?: number;
    autoPlay?: boolean;
    autoNext?: boolean;
    showSkipIntro?: boolean;
    skipIntroDuration?: number; // Duration in seconds to skip to (default: 90)
}

export default function Player({ 
    option, className, style, getInstance, onEnded, onError, onTimeUpdate, 
    initialTime = 0, autoPlay = false, autoNext = false,
    showSkipIntro = true, skipIntroDuration = 90
}: PlayerProps) {
    const artRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<Artplayer | null>(null);
    const [showCountdown, setShowCountdown] = useState(false);
    const [countdown, setCountdown] = useState(5);
    const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const isDestroyed = useRef(false);
    const [showSkipButton, setShowSkipButton] = useState(false);
    const [playerTime, setPlayerTime] = useState(0);
    const [resumeTime, setResumeTime] = useState(0);
    const [showResumePrompt, setShowResumePrompt] = useState(false);

    // Skip intro logic — show between 5s and skipIntroDuration
    useEffect(() => {
        if (!showSkipIntro || !playerRef.current) return;
        
        if (playerTime >= 5 && playerTime <= skipIntroDuration) {
            setShowSkipButton(true);
        } else {
            setShowSkipButton(false);
        }
    }, [playerTime, showSkipIntro, skipIntroDuration]);

    // Resume playback — check if there's a saved position
    useEffect(() => {
        if (initialTime > 10) { // Only show resume if more than 10s
            setResumeTime(initialTime);
            setShowResumePrompt(true);
            // Auto-hide after 8 seconds
            const timer = setTimeout(() => setShowResumePrompt(false), 8000);
            return () => clearTimeout(timer);
        }
    }, [initialTime]);

    const handleSkipIntro = useCallback(() => {
        if (playerRef.current && !isDestroyed.current) {
            playerRef.current.currentTime = skipIntroDuration;
            setShowSkipButton(false);
        }
    }, [skipIntroDuration]);

    const handleResume = useCallback(() => {
        if (playerRef.current && !isDestroyed.current && resumeTime > 0) {
            playerRef.current.currentTime = resumeTime;
            setShowResumePrompt(false);
        }
    }, [resumeTime]);

    const handleStartFromBeginning = useCallback(() => {
        setShowResumePrompt(false);
    }, []);

    useEffect(() => {
        isDestroyed.current = false;
        if (!artRef.current) return;

        // Initialize ArtPlayer only if it doesn't exist
        if (!playerRef.current) {
            try {
                const art = new Artplayer({
                    container: artRef.current,
                    poster: option.poster || "",
                    title: option.title,
                    volume: 0.7,
                    isLive: false,
                    // On mobile, MUST start muted for browser autoplay policy compliance
                    muted: autoPlay ? true : false,
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
                    plugins: [
                        artplayerPluginChromecast({}),
                    ],
                    controls: [
                        // Next Episode Button
                        {
                            position: 'right',
                            html: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 4l10 8-10 8V4z"></path><line x1="19" y1="5" x2="19" y2="19"></line></svg>',
                            tooltip: 'Next Episode',
                            click: function () {
                                if (onEnded && !isDestroyed.current) onEnded();
                            },
                            style: {
                                display: autoNext ? 'flex' : 'none'
                            }
                        }
                    ],
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
                                    // Fast startup — minimal buffering before first frame
                                    maxBufferLength: 8,
                                    maxMaxBufferLength: 20,
                                    maxBufferSize: 8 * 1000 * 1000,

                                    // JS subtitle rendering
                                    renderTextTracksNatively: false,

                                    // Fast initial load
                                    initialLiveManifestSize: 1,
                                    nudgeMaxRetry: 10,

                                    // Workers + low latency
                                    enableWorker: true,
                                    lowLatencyMode: false, // Disable for VOD — causes buffering on low bandwidth
                                    backBufferLength: 10,

                                    // Aggressive timeouts — fast fallback
                                    manifestLoadingTimeOut: 5000,
                                    manifestLoadingMaxRetry: 3,
                                    levelLoadingTimeOut: 5000,
                                    levelLoadingMaxRetry: 3,
                                    fragLoadingTimeOut: 8000,
                                    fragLoadingMaxRetry: 4,
                                    startLevel: -1, // Auto-quality
                                });

                                hls.loadSource(url);
                                hls.attachMedia(video);
                                (art as any).hls = hls;

                                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                                    // Add Quality Selector to Settings
                                    if (hls.levels.length > 1) {
                                        const qualitySelector = {
                                            width: 150,
                                            html: 'Quality',
                                            tooltip: 'Auto',
                                            icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6 6 6z"/><circle cx="12" cy="12" r="3"/></svg>',
                                            selector: [
                                                { html: 'Auto', default: hls.autoLevelEnabled, level: -1 },
                                                ...hls.levels.map((level, index) => ({
                                                    html: `${level.height}P`,
                                                    level: index,
                                                    default: !hls.autoLevelEnabled && hls.currentLevel === index,
                                                })).reverse(),
                                            ],
                                            onSelect: function (item: any) {
                                                hls.currentLevel = item.level;
                                                art.notice.show = `Switched to ${item.html}`;
                                                return item.html;
                                            },
                                        };
                                        art.setting.add(qualitySelector);
                                    }

                                    // Auto-play: muted first, then unmute after short delay
                                    if (art.option.autoplay && !isDestroyed.current && art.video.isConnected) {
                                        art.play().then(() => {
                                            setTimeout(() => {
                                                if (!isDestroyed.current) art.muted = false;
                                            }, 800);
                                        }).catch(() => {
                                            art.muted = true;
                                            art.play().catch(() => {});
                                        });
                                    }
                                });

                                // Listen for level changes
                                hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
                                    const level = hls.levels[data.level];
                                    if (level && hls.autoLevelEnabled) {
                                        console.log('[ArtPlayer] Auto-quality switched to:', level.height);
                                    }
                                });

                                hls.on(Hls.Events.ERROR, function (event, data) {
                                    if (data.fatal) {
                                        console.error('[ArtPlayer] HLS Fatal Error:', data.type, data.details);
                                        if (onError) onError(data);
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

                // Resume playback from saved position
                art.on('ready', () => {
                    if (initialTime > 0 && !showResumePrompt) {
                        art.currentTime = initialTime;
                    }
                });

                // Time update tracking
                art.on('video:timeupdate', () => {
                    if (!isDestroyed.current) {
                        setPlayerTime(art.currentTime);
                        if (onTimeUpdate) {
                            onTimeUpdate(art.currentTime, art.duration);
                        }
                    }
                });

                art.on('video:ended', () => {
                    if (onEnded && !isDestroyed.current) onEnded();
                });

                // Keyboard shortcuts
                art.on('ready', () => {
                    // 'S' key for skip intro
                    const handleKeyboard = (e: KeyboardEvent) => {
                        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
                        if (e.key === 's' || e.key === 'S') {
                            if (showSkipButton) handleSkipIntro();
                        }
                    };
                    document.addEventListener('keydown', handleKeyboard);
                    art.on('destroy', () => document.removeEventListener('keydown', handleKeyboard));
                });
            } catch (e) {
                console.error('[ArtPlayer] Initialization Error:', e);
            }
        } else {
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
            art.off('video:timeupdate', handleTimeUpdateForNext);
            
            function handleTimeUpdateForNext() {
                // If within 1 second of the end, trigger auto-next
                if (art.video.duration > 0 && art.video.duration - art.video.currentTime < 1) {
                    if (autoNext && onEnded && !isDestroyed.current && !showCountdown) {
                        art.off('video:timeupdate', handleTimeUpdateForNext); // Prevent multiple triggers
                        setShowCountdown(true);
                        setCountdown(5);
                        countdownIntervalRef.current = setInterval(() => {
                            setCountdown(prev => {
                                if (prev <= 1) {
                                    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
                                    setShowCountdown(false);
                                    setTimeout(() => {
                                        if (onEnded && !isDestroyed.current) onEnded();
                                    }, 0);
                                    return 0;
                                }
                                return prev - 1;
                            });
                        }, 1000);
                    }
                }
            }
            
            art.on('video:timeupdate', handleTimeUpdateForNext);
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

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="relative w-full">
            <div
                ref={artRef}
                className={className}
                style={{
                    ...style,
                    width: '100%',
                    aspectRatio: '16/9',
                }}
            />

            {/* Skip Intro Button */}
            {showSkipButton && (
                <button
                    onClick={handleSkipIntro}
                    className="skip-intro-btn"
                >
                    Skip Intro →
                </button>
            )}

            {/* Resume Playback Prompt */}
            {showResumePrompt && resumeTime > 0 && (
                <div className="absolute bottom-20 left-4 z-50 animate-fadeSlideUp">
                    <div className="bg-black/90 backdrop-blur-md border border-white/15 rounded-xl px-4 py-3 flex items-center gap-3 shadow-2xl max-w-sm">
                        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white text-xs font-bold">Resume from {formatTime(resumeTime)}?</p>
                        </div>
                        <button
                            onClick={handleResume}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg transition-colors shrink-0"
                        >
                            Resume
                        </button>
                        <button
                            onClick={handleStartFromBeginning}
                            className="text-white/50 hover:text-white text-xs font-medium shrink-0"
                        >
                            Start Over
                        </button>
                    </div>
                </div>
            )}

            {/* Auto-Next Countdown — Non-blocking corner notification */}
            {showCountdown && (
                <div className="auto-next-corner">
                    {/* Countdown ring */}
                    <svg className="countdown-ring shrink-0" viewBox="0 0 100 100">
                        <circle className="ring-bg" cx="50" cy="50" r="45" />
                        <circle className="ring-progress" cx="50" cy="50" r="45" />
                    </svg>
                    <div className="flex flex-col min-w-0">
                        <p className="text-white text-xs font-bold">Next episode in {countdown}s</p>
                        <button
                            onClick={cancelAutoNext}
                            className="text-white/50 hover:text-white text-[10px] font-medium text-left mt-0.5"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
