import React, { memo, useMemo } from 'react';
import { Server } from 'lucide-react';

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
}: ProviderBarProps) {
    const servers = useMemo(() => {
        const base = type === "anime"
            ? [...animeServers, ...serversList.filter((s: any) => !s.type || s.type === 'tv')]
            : serversList.filter((s: any) => !s.type || s.type === (type === 'cartoon' ? 'tv' : type) || s.type === 'movie' || s.type === 'tv');
        const seen = new Set<string>();
        return base.filter((s: any) => { if (seen.has(s.id)) return false; seen.add(s.id); return true; });
    }, [type, animeServers, serversList]);

    if (!activeServer) return null;

    return (
        <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-[#141419]/50 shadow-xl w-full">
            <div className="flex items-center gap-2 border-b border-white/[0.04] bg-[var(--accent)]/10 px-4 py-3">
                <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]" />
                <p className="truncate text-xs sm:text-sm font-semibold text-zinc-400">
                    Watching <span className="font-bold text-white">{title}</span>
                    {resolvedMediaType !== 'movie' && <span className="text-zinc-500"> · S{selectedSeason}E{selectedEpisode}</span>}
                </p>
                <span className="ml-auto flex shrink-0 items-center gap-1.5 text-[10px] sm:text-xs font-black uppercase tracking-widest text-[var(--accent)]">
                    <Server className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> {activeServer.name}
                </span>
            </div>
            <div className="overflow-x-auto scrollbar-none snap-x snap-mandatory px-3 py-3 w-full scroll-smooth">
                <div className="flex items-center gap-2 min-w-max">
                    {servers.map((server: any) => {
                        const isActive = activeServer.id === server.id;
                        const isFailed = failedServers.has(server.id);
                        return (
                            <button
                                key={server.id}
                                onClick={() => onSelectServer(server)}
                                disabled={isFailed && !isActive}
                                title={isFailed ? `${server.name} — unavailable` : server.name}
                                className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 sm:px-4 py-2 text-xs font-bold transition-all duration-200 snap-center whitespace-nowrap ${
                                    isActive
                                        ? 'border-[var(--accent)] bg-gradient-to-r from-[var(--accent)] to-[var(--accent-warm)] hover:-translate-y-[1px] hover:scale-[1.02] text-white shadow-[0_0_12px_var(--accent-glow)]'
                                        : isFailed
                                            ? 'cursor-not-allowed border-white/[0.05] bg-transparent text-zinc-600 opacity-40'
                                            : 'border-white/[0.07] bg-[#1E1B29] text-zinc-400 hover:border-white/[0.15] hover:bg-white/[0.08] hover:text-white'
                                }`}
                            >
                                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${isActive ? 'animate-pulse bg-white' : isFailed ? 'bg-red-500' : 'bg-zinc-600'}`} />
                                {server.name}
                                {server.badge && (
                                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest ${isActive ? 'bg-white/20 text-white' : 'bg-white/[0.05] text-zinc-500'}`}>
                                        {server.badge}
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
