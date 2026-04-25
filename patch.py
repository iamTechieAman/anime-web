import re

with open('src/app/watch/[type]/[id]/WatchClient.tsx', 'r') as f:
    content = f.read()

# 1. Add imports
content = content.replace(
    'import { useState, useEffect, useCallback, useRef } from "react";\nimport axios from "axios";',
    'import { useState, useEffect, useCallback, useRef } from "react";\nimport React from "react";\nimport Script from "next/script";\nimport axios from "axios";'
)

# 2. Add states
content = content.replace(
    'const autoSwitchAttempts = useRef(0); // Cap auto-switch to prevent infinite loop',
    'const autoSwitchAttempts = useRef(0); // Cap auto-switch to prevent infinite loop\n\n    // Cast & Auto-Next state\n    const [rawVideoSource, setRawVideoSource] = useState<string | null>(null);\n    const [castAvailable, setCastAvailable] = useState(false);'
)

# 3. Add handleVideoEnded, message listener, cast init
insert_logic = """
    // TV Auto-Next logic
    const handleVideoEnded = () => {
        if (type !== 'tv' || episodes.length === 0) return;
        
        const currentIndex = episodes.findIndex((e: any) => e.episode_number === selectedEpisode);
        
        if (currentIndex !== -1 && currentIndex + 1 < episodes.length) {
            if (showNextOverlay) return;
            
            setShowNextOverlay(true);
            setNextCountdown(5);
            
            if (nextIntervalRef.current) clearInterval(nextIntervalRef.current);
            
            nextIntervalRef.current = setInterval(() => {
                setNextCountdown(prev => {
                    if (prev <= 1) {
                        if (nextIntervalRef.current) clearInterval(nextIntervalRef.current);
                        setShowNextOverlay(false);
                        
                        const nextEp = episodes[currentIndex + 1].episode_number;
                        setSelectedEpisode(nextEp);
                        toast.success(`Now playing Episode ${nextEp}`, { icon: '▶️' });
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            toast("You have reached the latest available episode.", { icon: "✅" });
        }
    };

    const handleVideoEndedRef = useRef<Function>();
    useEffect(() => {
        handleVideoEndedRef.current = handleVideoEnded;
    });

    // Listen for events from proxy iframe
    useEffect(() => {
        const handleMessage = (e: MessageEvent) => {
            if (e.data?.type === 'VIDEO_ENDED') {
                if (handleVideoEndedRef.current) handleVideoEndedRef.current();
            } else if (e.data?.type === 'VIDEO_SOURCE_FOUND' && e.data.source) {
                setRawVideoSource(e.data.source);
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // Cast initialization
    useEffect(() => {
        (window as any).__onGCastApiAvailable = function (isAvailable: boolean) {
            if (isAvailable) {
                try {
                    const castContext = (window as any).cast.framework.CastContext.getInstance();
                    castContext.setOptions({
                        receiverApplicationId: (window as any).chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
                        autoJoinPolicy: (window as any).chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
                    });
                    setCastAvailable(true);
                } catch (e) {
                    console.error("Cast initialization failed", e);
                }
            }
        };
    }, []);

    // Cast session listener
    useEffect(() => {
        if (!castAvailable || !rawVideoSource) return;
        const castContext = (window as any).cast.framework.CastContext.getInstance();
        
        const handleSessionStateChanged = (event: any) => {
            if (event.sessionState === (window as any).cast.framework.SessionState.SESSION_STARTED) {
                const castSession = castContext.getCurrentSession();
                const mediaInfo = new (window as any).chrome.cast.media.MediaInfo(rawVideoSource, rawVideoSource.includes('.m3u8') ? 'application/x-mpegurl' : 'video/mp4');
                const request = new (window as any).chrome.cast.media.LoadRequest(mediaInfo);
                
                castSession.loadMedia(request).then(
                    () => toast.success("Casting started!"),
                    (e: any) => toast.error("Casting failed.")
                );
            }
        };

        castContext.addEventListener(
            (window as any).cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
            handleSessionStateChanged
        );

        return () => {
            castContext.removeEventListener(
                (window as any).cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
                handleSessionStateChanged
            );
        };
    }, [castAvailable, rawVideoSource]);

    const toggleWatchlist"""

content = content.replace('    const toggleWatchlist', insert_logic)

# 4. Add Cast Button
cast_button = """                                        <button
                                            onClick={() => {
                                                failedServersRef.current.clear();
                                                setSourceError(false);
                                                const firstNative = serversList.find(s => !s.isMovieServer);
                                                setActiveServer(firstNative || serversList[0] || null);
                                                autoCheckServers();
                                            }}
                                            className="px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] rounded-lg font-semibold transition-all text-sm hover:border-purple-500/50 flex items-center gap-1.5"
                                        >
                                            <RefreshCw className="w-3.5 h-3.5" /> Retry All
                                        </button>
                                        
                                        {castAvailable && (
                                            <div className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] rounded-lg font-semibold transition-all text-sm hover:border-blue-500/50">
                                                {React.createElement('google-cast-launcher', { style: { width: '20px', height: '20px', cursor: 'pointer', display: 'block' } })}
                                            </div>
                                        )}"""

content = re.sub(r'                                        <button[^>]+>[\s]*<RefreshCw[^>]+/> Retry All[\s]*</button>', cast_button, content, count=1)

# 5. Fix TV UI "Next Episode" button
content = content.replace(
    'let nextEp = selectedEpisode + 1;\n                                                        let nextSeason = selectedSeason;',
    'const currentIndex = episodes.findIndex((e: any) => e.episode_number === selectedEpisode);\n                                                        if (currentIndex !== -1 && currentIndex + 1 < episodes.length) {\n                                                            let nextEp = episodes[currentIndex + 1].episode_number;\n                                                            setSelectedEpisode(nextEp);\n                                                        }\n                                                        let nextSeason = selectedSeason;'
)

# 6. Add Script and Fragment wrap
content = content.replace('    return (\n        <main', '    return (\n        <>\n        <main')
content = content.replace('            </main>\n        </>', '            </main>\n            <Script src="https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1" strategy="afterInteractive" />\n        </>')
content = content.replace('            </main>\n        </div>\n    );', '            </main>\n            <Script src="https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1" strategy="afterInteractive" />\n        </>\n    );')
if '<Script' not in content:
    content = content.replace('            </main>\n    );', '            </main>\n            <Script src="https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1" strategy="afterInteractive" />\n        </>\n    );')

with open('src/app/watch/[type]/[id]/WatchClient.tsx', 'w') as f:
    f.write(content)

