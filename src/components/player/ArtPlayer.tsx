"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Artplayer from "artplayer";
import Hls from "hls.js";
// @ts-ignore
import artplayerPluginChromecast from 'artplayer-plugin-chromecast';
import { useTVNavigation } from "@/context/TVNavigationContext";
import PlayerHUDOverlay from "./PlayerHUDOverlay";

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

// Dynamic loader for dash.js to prevent bloat
const loadDash = (callback: () => void) => {
    if (typeof window === "undefined") return;
    if ((window as any).dashjs) {
        callback();
        return;
    }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/dashjs/4.7.1/dash.all.min.js";
    script.async = true;
    script.onload = () => callback();
    document.body.appendChild(script);
};

export default function Player({ 
    option, className, style, getInstance, onEnded, onError, onTimeUpdate, 
    initialTime = 0, autoPlay = false, autoNext = false,
    showSkipIntro = true, skipIntroDuration = 85
}: PlayerProps) {
    const artRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<Artplayer | null>(null);
    const [artInstance, setArtInstance] = useState<Artplayer | null>(null);
    const [showCountdown, setShowCountdown] = useState(false);
    const [countdown, setCountdown] = useState(5);
    const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const isDestroyed = useRef(false);
    const [showSkipButton, setShowSkipButton] = useState(false);
    const [playerTime, setPlayerTime] = useState(0);
    const [resumeTime, setResumeTime] = useState(0);

    const { deviceMode } = useTVNavigation();

    // Audio/Quality persistence refs
    const lastAudioTrackName = useRef<string | null>(typeof window !== 'undefined' ? localStorage.getItem('artplayer_audio_track') : null);
    const lastQualityHeight = useRef<string | null>(typeof window !== 'undefined' ? localStorage.getItem('artplayer_quality') : null);

    // Skip intro logic — show between 5s and skipIntroDuration
    useEffect(() => {
        if (!showSkipIntro || !playerRef.current) return;
        
        const duration = playerRef.current.duration || 0;
        if (duration > 0 && duration < skipIntroDuration + 60) return;

        if (playerTime >= 5 && playerTime <= skipIntroDuration) {
            setShowSkipButton(true);
        } else {
            setShowSkipButton(false);
        }
    }, [playerTime, showSkipIntro, skipIntroDuration]);

    const handleSkipIntro = useCallback(() => {
        if (playerRef.current && !isDestroyed.current) {
            const duration = playerRef.current.duration;
            const targetTime = Math.min(skipIntroDuration, duration * 0.9);
            
            playerRef.current.currentTime = targetTime;
            setShowSkipButton(false);
            playerRef.current.notice.show = `Skipped to ${Math.floor(targetTime)}s`;
        }
    }, [skipIntroDuration]);

    useEffect(() => {
        isDestroyed.current = false;
        if (!artRef.current) return;

        // Initialize ArtPlayer only if it doesn't exist
        if (!playerRef.current) {
            try {
                const isMpd = option.url.includes('.mpd') || option.type === 'mpd';
                
                const art = new Artplayer({
                    container: artRef.current,
                    poster: option.poster || "",
                    title: option.title,
                    volume: 0.7,
                    isLive: false,
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
                    theme: '#f97316', // Matches ToonPlayer secondary orange
                    lang: 'en',
                    plugins: [
                        artplayerPluginChromecast({}),
                    ],
                    moreVideoAttr: {
                        crossOrigin: 'anonymous',
                        playsInline: true,
                        'webkit-playsinline': 'true',
                        'x5-playsinline': 'true',
                        style: {
                            touchAction: 'pan-y !important'
                        }
                    } as any,
                    controls: [
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
                    type: option.type || (isMpd ? 'mpd' : option.url.includes('.m3u8') ? 'm3u8' : 'auto'),
                    customType: {
                        mpd: function (video: HTMLVideoElement, url: string, art: Artplayer) {
                            console.log('[ArtPlayer] Loading DASH source:', url);
                            loadDash(() => {
                                const dashjs = (window as any).dashjs;
                                if (!dashjs) {
                                    console.error("[ArtPlayer] dash.js failed to load.");
                                    return;
                                }
                                
                                if ((art as any).dash) (art as any).dash.destroy();
                                const player = dashjs.MediaPlayer().create();
                                player.initialize(video, url, art.option.autoplay);
                                
                                // Auto buffer tweaks for rapid OTT loading
                                player.updateSettings({
                                    streaming: {
                                        buffer: {
                                            stableBufferTime: 12,
                                            bufferTimeAtTopQuality: 20,
                                        },
                                        fastSwitchEnabled: true,
                                    }
                                });

                                (art as any).dash = player;

                                player.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, () => {
                                    try {
                                        art.setting.remove('quality');
                                    } catch (e) {}

                                    const bitrates = player.getBitrateInfoListFor("video");
                                    if (bitrates.length > 1) {
                                        const qualitySelector = {
                                            name: 'quality',
                                            width: 150,
                                            html: 'Quality',
                                            tooltip: 'Auto',
                                            icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6 6 6z"/><circle cx="12" cy="12" r="3"/></svg>',
                                            selector: [
                                                { html: 'Auto', default: true, level: -1 },
                                                ...bitrates.map((b: any, index: number) => ({
                                                    html: `${b.height}P`,
                                                    level: index,
                                                    default: false,
                                                })).reverse(),
                                            ],
                                            onSelect: function (item: any) {
                                                if (item.level === -1) {
                                                    player.updateSettings({ streaming: { abr: { autoSwitchBitrate: { video: true } } } });
                                                } else {
                                                    player.updateSettings({ streaming: { abr: { autoSwitchBitrate: { video: false } } } });
                                                    player.setQualityFor("video", item.level);
                                                }
                                                art.notice.show = `Switched to ${item.html}`;
                                                return item.html;
                                            },
                                        };
                                        art.setting.add(qualitySelector);
                                    }
                                });

                                art.on('destroy', () => {
                                    player.destroy();
                                });
                            });
                        },
                        m3u8: function (video: HTMLVideoElement, url: string, art: Artplayer) {
                            console.log('[ArtPlayer] Initializing HLS for URL:', url);
                            if (Hls.isSupported()) {
                                if ((art as any).hls) (art as any).hls.destroy();
                                const hls = new Hls({
                                    maxBufferLength: 20, // Lowered buffer threshold for instant startup
                                    maxMaxBufferLength: 45,
                                    maxBufferSize: 45 * 1000 * 1000,
                                    renderTextTracksNatively: false,
                                    initialLiveManifestSize: 1,
                                    nudgeMaxRetry: 8,
                                    enableWorker: true,
                                    lowLatencyMode: true,
                                    backBufferLength: 60,
                                    manifestLoadingTimeOut: 8000,
                                    levelLoadingTimeOut: 8000,
                                    fragLoadingTimeOut: 12000,
                                    startLevel: -1,
                                });

                                hls.loadSource(url);
                                hls.attachMedia(video);
                                (art as any).hls = hls;

                                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                                    try {
                                        art.setting.remove('quality');
                                        art.setting.remove('audio');
                                    } catch (e) {}

                                    // Add Quality Selector
                                    if (hls.levels.length > 1) {
                                        if (lastQualityHeight.current && lastQualityHeight.current !== 'Auto') {
                                            const levelIndex = hls.levels.findIndex(l => `${l.height}P` === lastQualityHeight.current);
                                            if (levelIndex !== -1) hls.currentLevel = levelIndex;
                                        }

                                        const qualitySelector = {
                                            name: 'quality',
                                            width: 150,
                                            html: 'Quality',
                                            tooltip: hls.currentLevel === -1 ? 'Auto' : `${hls.levels[hls.currentLevel].height}P`,
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
                                                lastQualityHeight.current = item.html;
                                                localStorage.setItem('artplayer_quality', item.html);
                                                art.notice.show = `Switched to ${item.html}`;
                                                return item.html;
                                            },
                                        };
                                        art.setting.add(qualitySelector);
                                    }
                                    
                                    // Add Audio Selector
                                    if (hls.audioTracks.length > 1) {
                                        if (lastAudioTrackName.current) {
                                            const trackIndex = hls.audioTracks.findIndex(t => t.name === lastAudioTrackName.current);
                                            if (trackIndex !== -1) hls.audioTrack = trackIndex;
                                        }

                                        const audioSelector = {
                                            name: 'audio',
                                            width: 150,
                                            html: 'Audio',
                                            tooltip: hls.audioTracks[hls.audioTrack].name || 'Track 1',
                                            icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>',
                                            selector: hls.audioTracks.map((track, index) => ({
                                                html: track.name || `Track ${index + 1}`,
                                                index: index,
                                                default: hls.audioTrack === index,
                                            })),
                                            onSelect: function (item: any) {
                                                hls.audioTrack = item.index;
                                                lastAudioTrackName.current = item.html;
                                                localStorage.setItem('artplayer_audio_track', item.html);
                                                art.notice.show = `Audio switched to ${item.html}`;
                                                return item.html;
                                            },
                                        };
                                        art.setting.add(audioSelector);
                                    }

                                    if (art.option.autoplay && !isDestroyed.current && art.video.isConnected) {
                                        art.play().then(() => {
                                            setTimeout(() => { if (!isDestroyed.current) art.muted = false; }, 800);
                                        }).catch(() => {
                                            art.muted = true;
                                            art.play().catch(() => {});
                                        });
                                    }
                                });

                                // Sync UI with track changes
                                hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (event, data) => {
                                    const track = hls.audioTracks[data.id];
                                    if (track) {
                                        lastAudioTrackName.current = track.name;
                                        localStorage.setItem('artplayer_audio_track', track.name);
                                        art.setting.update({ name: 'audio', tooltip: track.name });
                                    }
                                });

                                hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
                                    const level = hls.levels[data.level];
                                    if (level) {
                                        art.setting.update({
                                            name: 'quality',
                                            tooltip: hls.autoLevelEnabled ? 'Auto' : `${level.height}P`,
                                        });
                                    }
                                });

                                hls.on(Hls.Events.ERROR, function (event, data) {
                                    if (data.fatal) {
                                        console.error('[ArtPlayer] HLS Fatal Error:', data.type, data.details);
                                        if (onError) onError(data);
                                        switch (data.type) {
                                            case Hls.ErrorTypes.NETWORK_ERROR:
                                                hls.startLoad();
                                                break;
                                            case Hls.ErrorTypes.MEDIA_ERROR:
                                                hls.recoverMediaError();
                                                break;
                                            default:
                                                hls.destroy();
                                                break;
                                        }
                                    }
                                });

                                art.on('destroy', () => {
                                    hls.detachMedia();
                                    hls.destroy();
                                });
                            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                                video.src = url;
                            }
                        },
                    },
                    ...option,
                });

                playerRef.current = art;
                setArtInstance(art);

                if (getInstance && typeof getInstance === 'function') {
                    getInstance(art);
                }

                art.on('ready', () => {
                    if (initialTime > 10) {
                        art.currentTime = initialTime;
                        art.notice.show = `Resumed from ${Math.floor(initialTime / 60)}:${Math.floor(initialTime % 60).toString().padStart(2, '0')}`;
                    }
                });

                art.on('video:timeupdate', () => {
                    if (!isDestroyed.current) {
                        setPlayerTime(art.currentTime);
                        if (onTimeUpdate) onTimeUpdate(art.currentTime, art.duration);
                    }
                });

                art.on('video:ended', () => {
                    if (onEnded && !isDestroyed.current) onEnded();
                });

                art.on('ready', () => {
                    const handleKeyboard = (e: KeyboardEvent) => {
                        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
                        if ((e.key === 's' || e.key === 'S') && showSkipButton) handleSkipIntro();
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

        return () => {
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        };
    }, [option.url, autoNext, autoPlay, onEnded, getInstance, option.title, option.poster, option.type]);

    useEffect(() => {
        if (playerRef.current) playerRef.current.option.autoplay = autoPlay;
    }, [autoPlay]);

    useEffect(() => {
        return () => {
            isDestroyed.current = true;
            if (playerRef.current) {
                playerRef.current.destroy(false);
                playerRef.current = null;
                setArtInstance(null);
            }
        };
    }, []);

    return (
        <div className="relative w-full overflow-visible touch-pan-y video-player-container">
            <div
                ref={artRef}
                className={`${className} touch-pan-y`}
                style={{
                    ...style,
                    width: '100%',
                    aspectRatio: '16/9',
                    touchAction: 'pan-y !important',
                    pointerEvents: 'auto'
                }}
            />

            {showSkipButton && (
                <button
                    onClick={(e) => { e.stopPropagation(); handleSkipIntro(); }}
                    className="skip-intro-btn z-[100] touch-auto"
                >
                    Skip Intro →
                </button>
            )}

            {/* Smart TV Overlay Controls */}
            {artInstance && deviceMode === "tv" && (
                <PlayerHUDOverlay
                    art={artInstance}
                    onNextEpisode={autoNext && onEnded ? onEnded : undefined}
                />
            )}
        </div>
    );
}
