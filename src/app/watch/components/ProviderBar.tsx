import React, { memo, useMemo } from 'react';
import {
    Server,
    Sparkles,
    CheckCircle2,
    AlertCircle,
    MonitorPlay,
    Eye,
    RotateCcw,
    Zap,
    Check,
} from 'lucide-react';

interface ProviderBarProps {
    title: string;
    type: string;
    resolvedMediaType: string;
    selectedSeason: number;
    selectedEpisode: number;
    activeServer: any;
    failedServers: Set<string>;
    serversList: any[];
    animeServers: any[];
    onSelectServer: (server: any) => void;
    isTheatreMode?: boolean;
    onToggleTheatre?: () => void;
    isFocusMode?: boolean;
    onToggleFocus?: () => void;
    autoPlayNext?: boolean;
    onToggleAutoPlayNext?: (val: boolean) => void;
    onReloadPlayer?: () => void;
}

const ProviderBar = memo(function ProviderBar({
    title,
    type,
    resolvedMediaType,
    selectedSeason,
    selectedEpisode,
    activeServer,
    failedServers,
    serversList,
    animeServers,
    onSelectServer,
    isTheatreMode = false,
    onToggleTheatre,
    isFocusMode = false,
    onToggleFocus,
    autoPlayNext = true,
    onToggleAutoPlayNext,
    onReloadPlayer,
}: ProviderBarProps) {
    const servers = useMemo(() => {
        const base = type === "anime"
            ? [...animeServers, ...serversList.filter((s: any) => !s.type || s.type === 'tv')]
            : serversList.filter((s: any) => !s.type || s.type === (type === 'cartoon' ? 'tv' : type) || s.type === 'movie' || s.type === 'tv');
        const seen = new Set<string>();
        return base.filter((s: any) => {
            if (seen.has(s.id)) return false;
            seen.add(s.id);
            return true;
        });
    }, [type, animeServers, serversList]);

    if (!activeServer) return null;

    return (
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl shadow-2xl w-full transition-all">
            {/* Top Bar: Stream Info & Active Status + Quick Player Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/[0.02] px-5 py-3.5">
                <div className="flex items-center gap-2.5 min-w-0">
                    <span className="relative flex h-2.5 w-2.5 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                    </span>
                    <p className="truncate text-xs sm:text-sm font-medium text-white/80 tracking-tight">
                        <span className="text-white/40 font-normal hidden sm:inline">Streaming: </span>
                        <span className="font-semibold text-white">{title}</span>
                        {resolvedMediaType !== 'movie' && (
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-white/90 border border-white/10">
                                S{selectedSeason} · E{selectedEpisode}
                            </span>
                        )}
                    </p>
                </div>

                {/* Video Experience Controls: Theater Mode, Focus Mode, Auto-Play Switch */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {/* Auto-Play Next Episode Switch */}
                    {resolvedMediaType !== 'movie' && onToggleAutoPlayNext && (
                        <button
                            type="button"
                            onClick={() => onToggleAutoPlayNext(!autoPlayNext)}
                            title={autoPlayNext ? "Auto-Play Next Episode is ON" : "Auto-Play Next Episode is OFF"}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ease-out border cursor-pointer select-none active:scale-95 ${
                                autoPlayNext
                                    ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                                    : "bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10"
                            }`}
                        >
                            <Zap className={`w-3.5 h-3.5 ${autoPlayNext ? "fill-current text-emerald-400" : ""}`} />
                            <span className="hidden md:inline">Auto-Next</span>
                            <div className={`w-6 h-3.5 rounded-full transition-colors relative flex items-center px-0.5 ${autoPlayNext ? "bg-emerald-500" : "bg-white/20"}`}>
                                <div className={`w-2.5 h-2.5 rounded-full bg-white transition-transform ${autoPlayNext ? "translate-x-2.5" : "translate-x-0"}`} />
                            </div>
                        </button>
                    )}

                    {/* Cinema Theater Mode Toggle */}
                    {onToggleTheatre && (
                        <button
                            type="button"
                            onClick={onToggleTheatre}
                            title={isTheatreMode ? "Exit Theater Mode" : "Cinema Theater Mode"}
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ease-out border cursor-pointer select-none active:scale-95 ${
                                isTheatreMode
                                    ? "bg-white text-black border-white shadow-lg shadow-white/10 scale-[1.02]"
                                    : "bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10"
                            }`}
                        >
                            <MonitorPlay className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{isTheatreMode ? "Normal View" : "Theater Mode"}</span>
                        </button>
                    )}

                    {/* Focus Mode Toggle */}
                    {onToggleFocus && (
                        <button
                            type="button"
                            onClick={onToggleFocus}
                            title="Distraction-Free Focus Mode"
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ease-out border cursor-pointer select-none active:scale-95 ${
                                isFocusMode
                                    ? "bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                                    : "bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10"
                            }`}
                        >
                            <Eye className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Focus</span>
                        </button>
                    )}

                    {/* Reload Player Button */}
                    {onReloadPlayer && (
                        <button
                            type="button"
                            onClick={onReloadPlayer}
                            title="Reload Stream / Refresh Player"
                            className="p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all duration-300 ease-out active:scale-95 cursor-pointer"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                    )}

                    {/* Active Server Badge */}
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white shadow-sm">
                        <Server className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white/80" />
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                            {activeServer.name.replace(/Toon Player\s*/i, '')}
                        </span>
                        {activeServer.badge && (
                            <span className="text-[9px] font-bold uppercase tracking-widest bg-white text-black px-1.5 py-0.2 rounded-full">
                                {activeServer.badge}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Server Selector Tabs (iOS Segmented Control Pills) */}
            <div
                className="overflow-x-auto scrollbar-none snap-x snap-mandatory w-full max-w-full touch-pan-x scroll-smooth"
                style={{
                    WebkitOverflowScrolling: 'touch',
                }}
            >
                <div className="flex items-center gap-2 sm:gap-2.5 min-w-max px-4 py-3">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-white/40 mr-1 hidden sm:inline-flex items-center gap-1 select-none">
                        <Sparkles className="w-3 h-3 text-white/70" /> Servers:
                    </span>
                    {servers.map((server: any, idx: number) => {
                        const isActive = activeServer.id === server.id;
                        const isFailed = failedServers.has(server.id);
                        return (
                            <button
                                key={server.id}
                                onClick={() => onSelectServer(server)}
                                disabled={isFailed && !isActive}
                                title={isFailed ? `${server.name} — unavailable` : `Switch to ${server.name}`}
                                className={`group relative flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-all duration-300 ease-out snap-center cursor-pointer select-none active:scale-95 ${
                                    isActive
                                        ? 'bg-white text-black border-white shadow-lg shadow-white/10 scale-[1.02]'
                                        : isFailed
                                            ? 'cursor-not-allowed border-rose-500/20 bg-rose-500/10 text-rose-300/40 line-through'
                                            : 'border-white/10 bg-white/[0.04] text-white/70 hover:border-white/20 hover:bg-white/10 hover:text-white'
                                }`}
                            >
                                <span className="flex items-center">
                                    {isActive ? (
                                        <CheckCircle2 className="h-3.5 w-3.5 text-black" />
                                    ) : isFailed ? (
                                        <AlertCircle className="h-3.5 w-3.5 text-rose-400" />
                                    ) : (
                                        <span className="h-1.5 w-1.5 rounded-full bg-white/40 group-hover:bg-white/80 transition-colors" />
                                    )}
                                </span>
                                
                                <span className="tracking-tight">
                                    {server.name.replace(/Toon Player\s*/i, '') || server.name}
                                </span>

                                {server.badge && (
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                                            isActive
                                                ? 'bg-black/10 text-black border border-black/20'
                                                : isFailed
                                                    ? 'bg-transparent text-rose-400/40'
                                                    : 'bg-white/10 text-white/60 border border-white/10 group-hover:text-white'
                                        }`}
                                    >
                                        {server.badge}
                                    </span>
                                )}

                                {idx === 0 && !server.badge && (
                                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${isActive ? 'bg-black/10 text-black' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                                        Primary
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
});

export default ProviderBar;
