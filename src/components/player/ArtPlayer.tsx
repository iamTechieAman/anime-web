"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Artplayer from "artplayer";
import Hls from "hls.js";
// @ts-ignore
import artplayerPluginChromecast from 'artplayer-plugin-chromecast';

export type PlaybackStatus = 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'buffering' | 'error' | 'ended';

interface PlayerProps {
    option: {
        url: string;
        poster?: string;
        title?: string;
        type?: string;
        [key: string]: any;
    };
    className?: string;
    style?: React.CSSProperties;
    getInstance?: (art: Artplayer) => void;
    onEnded?: () => void;
    onNext?: () => void;
    hasNext?: boolean;
    onError?: (error: any) => void;
    onTimeUpdate?: (currentTime: number, duration: number) => void;
    initialTime?: number;
    autoPlay?: boolean;
    autoNext?: boolean;
    showSkipIntro?: boolean;
    skipIntroDuration?: number;
}

export default function Player({ 
    option, className, style, getInstance, onEnded, onNext, hasNext = false, onError, onTimeUpdate, 
    initialTime = 0, autoPlay = false, autoNext = false,
    showSkipIntro = true, skipIntroDuration = 85
}: PlayerProps) {
    const artRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<Artplayer | null>(null);
    const isDestroyed = useRef(false);
    const hasAutoSkipped = useRef(false);
    const hasAttemptedAutoplay = useRef(false);

    // Playback state and error feedback
    const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>('loading');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Autoplay & Audio Policy feedback states
    const [needsAudioUnlock, setNeedsAudioUnlock] = useState(false);
    const [needsPlayAction, setNeedsPlayAction] = useState(false);

    // Skip controls state
    const [showSkipButton, setShowSkipButton] = useState(false);
    const [showSkipCreditsButton, setShowSkipCreditsButton] = useState(false);
    const [playerTime, setPlayerTime] = useState(0);

    // Audio/Quality persistence refs
    const lastAudioTrackName = useRef<string | null>(typeof window !== 'undefined' ? localStorage.getItem('artplayer_audio_track') : null);
    const lastQualityHeight = useRef<string | null>(typeof window !== 'undefined' ? localStorage.getItem('artplayer_quality') : null);

    useEffect(() => {
        hasAutoSkipped.current = false;
        hasAttemptedAutoplay.current = false;
        setNeedsAudioUnlock(false);
        setNeedsPlayAction(false);
    }, [option.url]);

    // Skip intro & credits checking logic
    useEffect(() => {
        if (!playerRef.current) return;
        
        const duration = playerRef.current.duration || 0;
        
        // Skip intro check (between 5s and skipIntroDuration)
        if (showSkipIntro && duration > skipIntroDuration + 60) {
            setShowSkipButton(playerTime >= 5 && playerTime <= skipIntroDuration);
        } else {
            setShowSkipButton(false);
        }

        // Skip credits check (in the last 3 minutes of the video, duration - 180 to duration - 10)
        if (duration > 300) {
            setShowSkipCreditsButton(playerTime >= duration - 180 && playerTime <= duration - 10);
        } else {
            setShowSkipCreditsButton(false);
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

    const handleSkipCredits = useCallback(() => {
        if (playerRef.current && !isDestroyed.current) {
            const duration = playerRef.current.duration;
            const targetTime = Math.max(0, duration - 5);
            playerRef.current.currentTime = targetTime;
            setShowSkipCreditsButton(false);
            playerRef.current.notice.show = `Skipping Credits`;
            if (onNext) {
                onNext();
            } else if (onEnded) {
                onEnded();
            }
        }
    }, [onNext, onEnded]);

    // Autoplay execution respecting browser autoplay & audio restrictions
    const triggerAutoplay = useCallback((art: Artplayer) => {
        if (!autoPlay || isDestroyed.current || hasAttemptedAutoplay.current) return;
        hasAttemptedAutoplay.current = true;
        console.log('[ArtPlayer] Triggering autoplay sequence...');

        // First attempt: unmuted autoplay with normal sound
        art.muted = false;
        art.play()
            .then(() => {
                console.log('[ArtPlayer] Unmuted autoplay succeeded');
                setNeedsAudioUnlock(false);
                setNeedsPlayAction(false);
                setPlaybackStatus('playing');
            })
            .catch((unmutedErr: any) => {
                console.warn('[ArtPlayer] Unmuted autoplay prevented by browser policy:', unmutedErr?.name);
                // Second attempt: muted autoplay (guaranteed to pass standard browser autoplay policies)
                art.muted = true;
                art.play()
                    .then(() => {
                        console.log('[ArtPlayer] Muted autoplay succeeded; user audio interaction required');
                        setNeedsAudioUnlock(true);
                        setNeedsPlayAction(false);
                        setPlaybackStatus('playing');
                    })
                    .catch((mutedErr: any) => {
                        console.warn('[ArtPlayer] Muted autoplay also rejected:', mutedErr?.name);
                        // Strict policy / user interaction required: present clear Play button
                        setNeedsPlayAction(true);
                        setNeedsAudioUnlock(false);
                        setPlaybackStatus('ready');
                    });
            });
    }, [autoPlay]);

    // Handle user unmuting audio
    const handleAudioUnlock = useCallback(() => {
        if (!playerRef.current || isDestroyed.current) return;
        playerRef.current.muted = false;
        setNeedsAudioUnlock(false);
        playerRef.current.notice.show = 'Sound Enabled 🔊';
    }, []);

    // Handle manual play from overlay
    const handleManualPlay = useCallback(() => {
        if (!playerRef.current || isDestroyed.current) return;
        playerRef.current.muted = false;
        playerRef.current.play()
            .then(() => {
                setNeedsPlayAction(false);
                setNeedsAudioUnlock(false);
                setPlaybackStatus('playing');
            })
            .catch((err) => {
                console.warn('[ArtPlayer] Manual play attempt failed:', err);
            });
    }, []);

    // Robust stream attachment helper supporting HLS, Safari native HLS, and MP4
    const attachStreamSource = useCallback((art: Artplayer, streamUrl: string, typeOverride?: string) => {
        if (!art || !art.video || !streamUrl || isDestroyed.current) return;

        // 1. Destroy and detach any prior HLS instance safely
        if ((art as any).hls) {
            try {
                console.log('[ArtPlayer] Detaching existing HLS instance');
                (art as any).hls.detachMedia();
                (art as any).hls.destroy();
            } catch (err) {
                console.warn('[ArtPlayer] Error cleaning up previous HLS instance:', err);
            }
            (art as any).hls = null;
        }

        // 2. Clear previous dynamic quality/audio settings
        try {
            art.setting.remove('quality');
            art.setting.remove('audio');
        } catch (_) {}

        setPlaybackStatus('loading');
        setErrorMessage(null);
        setNeedsAudioUnlock(false);
        setNeedsPlayAction(false);
        hasAttemptedAutoplay.current = false;

        const isHls = Boolean(
            typeOverride === 'm3u8' || 
            typeOverride === 'hls' || 
            streamUrl.includes('.m3u8')
        );

        if (isHls && Hls.isSupported()) {
            console.log('[ArtPlayer] Initializing HLS.js engine for source:', streamUrl.split('?')[0]);

            // Buffer setting resolution
            let bufferSetting = "Standard";
            try {
                const s = localStorage.getItem("toonplayer_settings");
                if (s) {
                    const parsed = JSON.parse(s);
                    if (parsed.bufferSize) bufferSetting = parsed.bufferSize;
                }
            } catch {}

            let maxBufferLength = 30;
            let maxMaxBufferLength = 60;
            let maxBufferSize = 60 * 1000 * 1000;

            if (bufferSetting === "Small") {
                maxBufferLength = 10;
                maxMaxBufferLength = 20;
                maxBufferSize = 20 * 1000 * 1000;
            } else if (bufferSetting === "Large") {
                maxBufferLength = 60;
                maxMaxBufferLength = 120;
                maxBufferSize = 150 * 1000 * 1000;
            }

            const hls = new Hls({
                maxBufferLength,
                maxMaxBufferLength,
                maxBufferSize,
                renderTextTracksNatively: false,
                initialLiveManifestSize: 1,
                nudgeMaxRetry: 10,
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: 90,
                manifestLoadingTimeOut: 15000,
                levelLoadingTimeOut: 15000,
                fragLoadingTimeOut: 20000,
                startLevel: -1,
            });

            let fatalNetworkRetries = 0;
            let fatalMediaRetries = 0;
            const MAX_RETRIES = 3;

            hls.loadSource(streamUrl);
            hls.attachMedia(art.video);
            (art as any).hls = hls;

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                if (isDestroyed.current) return;
                console.log('[ArtPlayer] HLS manifest parsed successfully. Levels:', hls.levels.length);
                fatalNetworkRetries = 0;
                fatalMediaRetries = 0;

                // Add Quality Selector if multi-bitrate
                if (hls.levels.length > 1) {
                    if (lastQualityHeight.current && lastQualityHeight.current !== 'Auto') {
                        const levelIndex = hls.levels.findIndex(l => `${l.height}P` === lastQualityHeight.current);
                        if (levelIndex !== -1) hls.currentLevel = levelIndex;
                    }

                    art.setting.add({
                        name: 'quality',
                        width: 150,
                        html: 'Quality',
                        tooltip: hls.currentLevel === -1 ? 'Auto' : `${hls.levels[hls.currentLevel]?.height}P`,
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
                    });
                }

                // Add Audio Selector if multiple audio tracks
                if (hls.audioTracks.length > 1) {
                    if (lastAudioTrackName.current) {
                        const trackIndex = hls.audioTracks.findIndex(t => t.name === lastAudioTrackName.current);
                        if (trackIndex !== -1) hls.audioTrack = trackIndex;
                    }

                    art.setting.add({
                        name: 'audio',
                        width: 150,
                        html: 'Audio',
                        tooltip: hls.audioTracks[hls.audioTrack]?.name || 'Track 1',
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
                    });
                }

                // Trigger robust autoplay if enabled
                triggerAutoplay(art);
            });

            hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (_event, data) => {
                const track = hls.audioTracks[data.id];
                if (track) {
                    lastAudioTrackName.current = track.name;
                    localStorage.setItem('artplayer_audio_track', track.name);
                    art.setting.update({ name: 'audio', tooltip: track.name });
                }
            });

            hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
                const level = hls.levels[data.level];
                if (level) {
                    art.setting.update({
                        name: 'quality',
                        tooltip: hls.autoLevelEnabled ? 'Auto' : `${level.height}P`,
                    });
                }
            });

            hls.on(Hls.Events.ERROR, (_event, data) => {
                if (isDestroyed.current) return;
                console.warn('[ArtPlayer] HLS Event Error:', data.type, data.details, 'Fatal:', data.fatal);

                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            fatalNetworkRetries++;
                            if (fatalNetworkRetries <= MAX_RETRIES) {
                                console.log(`[ArtPlayer] Attempting network error recovery (${fatalNetworkRetries}/${MAX_RETRIES})...`);
                                hls.startLoad();
                                return;
                            }
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            fatalMediaRetries++;
                            if (fatalMediaRetries <= MAX_RETRIES) {
                                console.log(`[ArtPlayer] Attempting media error recovery (${fatalMediaRetries}/${MAX_RETRIES})...`);
                                hls.recoverMediaError();
                                return;
                            }
                            break;
                        default:
                            break;
                    }

                    // Max retries reached or unrecoverable error
                    console.error('[ArtPlayer] Unrecoverable HLS fatal error:', data.details);
                    try {
                        hls.destroy();
                    } catch (_) {}
                    (art as any).hls = null;

                    setPlaybackStatus('error');
                    setErrorMessage("Stream temporarily unavailable or format unsupported.");
                    if (onError) {
                        onError({ type: 'HLS_FATAL_ERROR', details: data.details, fatal: true });
                    }
                }
            });
        } else if (isHls && art.video.canPlayType('application/vnd.apple.mpegurl')) {
            // Safari native HLS engine
            console.log('[ArtPlayer] Playing HLS natively on browser media engine');
            art.video.src = streamUrl;
            triggerAutoplay(art);
        } else {
            // Direct MP4 / WebM stream
            console.log('[ArtPlayer] Direct video playback for URL');
            art.switchUrl(streamUrl);
            triggerAutoplay(art);
        }
    }, [onError, triggerAutoplay]);

    // Handle user clicking Retry in error overlay
    const handleRetry = useCallback(() => {
        if (!playerRef.current || isDestroyed.current) return;
        setPlaybackStatus('loading');
        setErrorMessage(null);
        attachStreamSource(playerRef.current, option.url, option.type);
    }, [attachStreamSource, option.url, option.type]);

    useEffect(() => {
        isDestroyed.current = false;
        if (!artRef.current) return;

        // Initialize ArtPlayer only once if it doesn't exist
        if (!playerRef.current) {
            try {
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
                    theme: '#a855f7',
                    lang: 'en',
                    plugins: [
                        artplayerPluginChromecast({
                            sdk: 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1'
                        }),
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
                            html: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg>',
                            tooltip: 'Next Episode',
                            click: function () {
                                if (onNext && !isDestroyed.current) {
                                    onNext();
                                } else if (onEnded && !isDestroyed.current) {
                                    onEnded();
                                }
                            },
                            style: {
                                display: hasNext ? 'flex' : 'none'
                            }
                        }
                    ],
                    type: option.type || (option.url?.includes('.m3u8') ? 'm3u8' : 'auto'),
                    customType: {
                        m3u8: function (video: HTMLVideoElement, url: string, artInstance: Artplayer) {
                            attachStreamSource(artInstance, url, 'm3u8');
                        },
                    },
                    ...option,
                });

                playerRef.current = art;

                if (getInstance && typeof getInstance === 'function') {
                    getInstance(art);
                }

                // Native Media Element & Lifecycle Events
                art.on('video:loadstart', () => {
                    if (!isDestroyed.current) {
                        setPlaybackStatus('loading');
                        setErrorMessage(null);
                    }
                });

                art.on('video:waiting', () => {
                    if (!isDestroyed.current) {
                        setPlaybackStatus('buffering');
                    }
                });

                art.on('video:canplay', () => {
                    if (!isDestroyed.current) {
                        setPlaybackStatus(art.playing ? 'playing' : 'ready');
                        setErrorMessage(null);
                    }
                });

                art.on('video:play', () => {
                    if (!isDestroyed.current) {
                        setPlaybackStatus('playing');
                        setNeedsPlayAction(false);
                        setErrorMessage(null);
                    }
                });

                art.on('video:playing', () => {
                    if (!isDestroyed.current) {
                        setPlaybackStatus('playing');
                        setNeedsPlayAction(false);
                        setErrorMessage(null);
                    }
                });

                art.on('video:pause', () => {
                    if (!isDestroyed.current) {
                        if (art.currentTime < (art.duration || 1) - 1) {
                            setPlaybackStatus('paused');
                        }
                    }
                });

                art.on('video:volumechange', () => {
                    if (!isDestroyed.current) {
                        if (!art.muted && art.volume > 0) {
                            setNeedsAudioUnlock(false);
                        }
                    }
                });

                art.on('video:ended', () => {
                    if (!isDestroyed.current) {
                        setPlaybackStatus('ended');
                        if (onEnded) onEnded();
                    }
                });

                // Native HTMLMediaElement Error Handling
                const handleVideoError = () => {
                    if (isDestroyed.current) return;
                    const vErr = art.video?.error;
                    console.error('[ArtPlayer] Native video element error:', vErr ? `code ${vErr.code}: ${vErr.message}` : 'unknown error');

                    let friendly = "Unable to play this stream. The media format may be unsupported or upstream server is unreachable.";
                    if (vErr) {
                        if (vErr.code === 1) friendly = "Playback was aborted.";
                        else if (vErr.code === 2) friendly = "Network error: Failed to download media stream.";
                        else if (vErr.code === 3) friendly = "Media decode error: Corrupt data or unsupported codec.";
                        else if (vErr.code === 4) friendly = "Stream format not supported or blocked by provider.";
                    }

                    setPlaybackStatus('error');
                    setErrorMessage(friendly);

                    if (onError) {
                        onError({
                            type: 'MEDIA_ELEMENT_ERROR',
                            code: vErr?.code || 0,
                            message: vErr?.message || friendly
                        });
                    }
                };

                art.on('video:error', handleVideoError);
                if (art.video) {
                    art.video.addEventListener('error', handleVideoError);
                }

                art.on('ready', () => {
                    if (initialTime > 10) {
                        art.currentTime = initialTime;
                        art.notice.show = `Resumed from ${Math.floor(initialTime / 60)}:${Math.floor(initialTime % 60).toString().padStart(2, '0')}`;
                    }

                    // Apply playback rate setting on ready
                    try {
                        const s = localStorage.getItem("toonplayer_settings");
                        if (s) {
                            const parsed = JSON.parse(s);
                            if (parsed.playbackSpeed) {
                                const rate = parseFloat(parsed.playbackSpeed);
                                if (!isNaN(rate) && rate > 0) {
                                    art.playbackRate = rate;
                                }
                            }
                        }
                    } catch {}
                });

                art.on('video:timeupdate', () => {
                    if (!isDestroyed.current) {
                        const curTime = art.currentTime;
                        setPlayerTime(curTime);
                        if (onTimeUpdate) onTimeUpdate(curTime, art.duration);

                        // Auto-skip intro logic
                        let autoSkipIntro = false;
                        try {
                            const s = localStorage.getItem("toonplayer_settings");
                            if (s) {
                                const parsed = JSON.parse(s);
                                if (parsed.autoSkip !== undefined) autoSkipIntro = parsed.autoSkip;
                            }
                        } catch {}

                        if (autoSkipIntro && showSkipIntro && curTime >= 5 && curTime <= skipIntroDuration && !hasAutoSkipped.current) {
                            hasAutoSkipped.current = true;
                            setTimeout(() => {
                                if (playerRef.current && !isDestroyed.current) {
                                    const dur = playerRef.current.duration;
                                    const targetTime = Math.min(skipIntroDuration, dur * 0.9);
                                    playerRef.current.currentTime = targetTime;
                                    playerRef.current.notice.show = `Auto-Skipped Intro to ${Math.floor(targetTime)}s`;
                                }
                            }, 50);
                        }
                    }
                });

            } catch (e) {
                console.error('[ArtPlayer] Initialization Error:', e);
                setPlaybackStatus('error');
                setErrorMessage("Failed to initialize video player engine.");
            }
        } else {
            // Existing player instance: cleanly switch source via attachStreamSource
            const art = playerRef.current;
            if (option.url && option.url !== art.option.url) {
                console.log('[ArtPlayer] Source URL changed, loading new stream cleanly');
                art.option.url = option.url;
                (art.option as any).title = option.title;
                if (option.poster) art.poster = option.poster;
                attachStreamSource(art, option.url, option.type);
            }
        }
    }, [option.url, option.title, option.poster, option.type, autoNext, autoPlay, onEnded, onNext, hasNext, getInstance, attachStreamSource, initialTime, onTimeUpdate, showSkipIntro, skipIntroDuration, onError]);

    // Update autoplay setting
    useEffect(() => {
        if (playerRef.current) {
            playerRef.current.option.autoplay = autoPlay;
        }
    }, [autoPlay]);

    // Complete cleanup on unmount
    useEffect(() => {
        return () => {
            isDestroyed.current = true;
            if (playerRef.current) {
                const art = playerRef.current;
                if ((art as any).hls) {
                    try {
                        (art as any).hls.detachMedia();
                        (art as any).hls.destroy();
                    } catch (_) {}
                    (art as any).hls = null;
                }
                art.destroy(false);
                playerRef.current = null;
            }
        };
    }, []);

    // Live update settings listener
    useEffect(() => {
        const updatePlayerFromSettings = () => {
            if (!playerRef.current || isDestroyed.current) return;
            try {
                const s = localStorage.getItem("toonplayer_settings");
                if (s) {
                    const parsed = JSON.parse(s);
                    if (parsed.playbackSpeed) {
                        const rate = parseFloat(parsed.playbackSpeed);
                        if (!isNaN(rate) && rate > 0) {
                            playerRef.current.playbackRate = rate;
                        }
                    }
                }
            } catch {}
        };
        window.addEventListener("profileUpdated", updatePlayerFromSettings);
        return () => window.removeEventListener("profileUpdated", updatePlayerFromSettings);
    }, []);

    // Bound keyboard events that reactive-update with states
    useEffect(() => {
        const handleKeyboard = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            if ((e.key === 's' || e.key === 'S') && showSkipButton) {
                handleSkipIntro();
            }
            if ((e.key === 'c' || e.key === 'C') && showSkipCreditsButton) {
                handleSkipCredits();
            }
            if ((e.key === 'm' || e.key === 'M') && needsAudioUnlock) {
                handleAudioUnlock();
            }
        };
        document.addEventListener('keydown', handleKeyboard);
        return () => document.removeEventListener('keydown', handleKeyboard);
    }, [showSkipButton, showSkipCreditsButton, handleSkipIntro, handleSkipCredits, needsAudioUnlock, handleAudioUnlock]);

    return (
        <div className="relative w-full overflow-hidden touch-pan-y bg-black rounded-xl group/player">
            <div
                ref={artRef}
                className={`${className || ''} touch-pan-y`}
                style={{
                    ...style,
                    width: '100%',
                    aspectRatio: '16/9',
                    touchAction: 'pan-y !important',
                    pointerEvents: 'auto'
                }}
            />

            {/* Audio Policy Unlocker: Appears when video is playing muted due to browser autoplay restriction */}
            {needsAudioUnlock && playbackStatus === 'playing' && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleAudioUnlock();
                    }}
                    className="absolute top-4 right-4 z-40 flex items-center gap-2 px-3.5 py-2 rounded-full bg-purple-600/90 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 backdrop-blur-md transition-all animate-bounce cursor-pointer active:scale-95"
                    title="Tap to enable audio (m)"
                    aria-label="Tap to enable audio"
                >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 0 1 0 7.07l-1.41-1.41a3 3 0 0 0 0-4.24l1.41-1.42z" />
                        <line x1="23" y1="1" x2="1" y2="23" stroke="currentColor" strokeWidth="2" />
                    </svg>
                    <span>Tap for Sound</span>
                </button>
            )}

            {/* Manual Play Overlay: Appears when browser policy blocks all autoplay */}
            {needsPlayAction && (
                <div
                    onClick={(e) => {
                        e.stopPropagation();
                        handleManualPlay();
                    }}
                    className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm cursor-pointer transition-all"
                >
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-purple-600 to-accent text-white flex items-center justify-center shadow-2xl shadow-purple-600/50 hover:scale-105 active:scale-95 transition-all">
                        <svg className="w-8 h-8 fill-current ml-1" viewBox="0 0 24 24">
                            <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                    </div>
                    <p className="mt-4 text-xs sm:text-sm font-semibold text-white tracking-wide drop-shadow">
                        Click anywhere to play
                    </p>
                </div>
            )}

            {/* Buffering Indicator */}
            {playbackStatus === 'buffering' && (
                <div className="absolute top-4 left-4 z-40 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur-md border border-purple-500/30 text-xs text-purple-200 font-medium pointer-events-none animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                    Buffering...
                </div>
            )}

            {/* Skip Intro Button */}
            {showSkipButton && (
                <button
                    onClick={(e) => { e.stopPropagation(); handleSkipIntro(); }}
                    className="skip-intro-btn z-[100] touch-auto"
                >
                    Skip Intro →
                </button>
            )}

            {/* Skip Credits Button */}
            {showSkipCreditsButton && (
                <button
                    onClick={(e) => { e.stopPropagation(); handleSkipCredits(); }}
                    className="skip-intro-btn z-[100] touch-auto"
                >
                    Skip Credits →
                </button>
            )}

            {/* Recoverable Failure / Error Overlay */}
            {playbackStatus === 'error' && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-6 text-center text-white">
                    <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4 text-red-400">
                        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Playback Stalled</h3>
                    <p className="text-xs sm:text-sm text-zinc-400 max-w-md mb-6 leading-relaxed">
                        {errorMessage || 'Unable to load media stream. The upstream source may be unreachable or format unsupported.'}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleRetry();
                            }}
                            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 font-medium text-xs sm:text-sm transition-all flex items-center gap-2 shadow-lg shadow-purple-600/30 active:scale-95"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                            </svg>
                            Retry Stream
                        </button>
                        {onError && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onError({ type: 'USER_FALLBACK_REQUESTED' });
                                }}
                                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 font-medium text-xs sm:text-sm transition-all active:scale-95"
                            >
                                Try Next Server
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
