"use client";

import React from "react";
import { 
    Play, 
    RefreshCw, 
    AlertCircle, 
    ShieldAlert, 
    Clock, 
    X, 
    Server,
    ExternalLink,
    ChevronRight,
    ArrowLeft
} from "lucide-react";

export type PlayerPlaybackState =
    | 'resolving'
    | 'source_ready'
    | 'player_loaded'
    | 'playback_confirmed'
    | 'unavailable'
    | 'unsupported'
    | 'blocked_by_policy'
    | 'timed_out';

export interface AlternativeServer {
    id: string;
    name: string;
    badge?: string;
    qualityScore?: number;
}

export interface PlayerStatusOverlayProps {
    state: PlayerPlaybackState;
    serverName?: string;
    loadingStatus?: string;
    customErrorMessage?: string;
    availableAlternatives?: AlternativeServer[];
    onSelectAlternative?: (server: AlternativeServer) => void;
    onRetry?: () => void;
    onRetryAll?: () => void;
    isCrossOriginEmbed?: boolean;
    isUpcoming?: boolean;
    onBack?: () => void;
}

export const PlayerStatusOverlay: React.FC<PlayerStatusOverlayProps> = ({
    state,
    serverName = "Provider",
    loadingStatus = "Connecting to server...",
    customErrorMessage,
    availableAlternatives = [],
    onSelectAlternative,
    onRetry,
    onRetryAll,
    isUpcoming = false,
    onBack,
}) => {
    // If playback is confirmed or player loaded without error, don't block the screen
    if (state === 'playback_confirmed' || state === 'player_loaded') {
        return null;
    }

    // 1. RESOLVING OR SOURCE_READY (Loading State)
    if (state === 'resolving' || state === 'source_ready') {
        return (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/95 backdrop-blur-sm p-4 text-center select-none">
                <div className="relative flex items-center justify-center mb-5">
                    <div className="absolute w-20 h-20 rounded-full border border-accent/20 animate-ping" />
                    <div className="w-14 h-14 rounded-full border-[3px] border-accent/20 border-t-accent animate-spin" />
                    <Play className="absolute w-5 h-5 text-accent" />
                </div>
                <div className="max-w-xs space-y-1">
                    <p className="text-white text-xs font-black uppercase tracking-[0.2em] animate-pulse">
                        {state === 'source_ready' ? 'Mounting Player...' : loadingStatus}
                    </p>
                    <p className="text-zinc-500 text-[11px] font-medium uppercase tracking-wider flex items-center justify-center gap-1.5">
                        <Server className="w-3 h-3 text-accent" />
                        {serverName}
                    </p>
                </div>
                {isUpcoming && (
                    <span className="mt-4 px-3.5 py-1 bg-accent/20 text-accent border border-accent/30 rounded-full text-[10px] font-black uppercase tracking-widest">
                        Upcoming Release
                    </span>
                )}
            </div>
        );
    }

    // Determine error state details
    let icon = <X className="w-8 h-8 text-rose-400" />;
    let iconBg = "bg-rose-500/10 border-rose-500/20";
    let title = "Stream Unavailable";
    let description = customErrorMessage || `The stream could not be loaded on ${serverName}.`;

    switch (state) {
        case 'unsupported':
            icon = <AlertCircle className="w-8 h-8 text-amber-400" />;
            iconBg = "bg-amber-500/10 border-amber-500/20";
            title = "Content Not Supported on this Server";
            description = customErrorMessage || `${serverName} does not index this title or episode. Please select an alternate provider below.`;
            break;

        case 'blocked_by_policy':
            icon = <ShieldAlert className="w-8 h-8 text-rose-400" />;
            iconBg = "bg-rose-500/10 border-rose-500/20";
            title = "Embedding Restricted by Provider";
            description = customErrorMessage || `${serverName} security policy prevents playback inside external embeds (X-Frame-Options). Please switch to an authorized alternative.`;
            break;

        case 'timed_out':
            icon = <Clock className="w-8 h-8 text-amber-400" />;
            iconBg = "bg-amber-500/10 border-amber-500/20";
            title = "Provider Connection Timed Out";
            description = customErrorMessage || `${serverName} took too long to deliver stream data. The upstream host may be congested.`;
            break;

        case 'unavailable':
        default:
            icon = <X className="w-8 h-8 text-rose-400" />;
            iconBg = "bg-rose-500/10 border-rose-500/20";
            title = "Provider Unavailable";
            description = customErrorMessage || `All streaming attempts on ${serverName} failed. Try resetting or selecting a backup server below.`;
            break;
    }

    return (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-6 text-center overflow-y-auto">
            <div className={`w-14 h-14 sm:w-16 sm:h-16 ${iconBg} rounded-2xl flex items-center justify-center mb-4 border shadow-lg`}>
                {icon}
            </div>

            <h3 className="text-base sm:text-lg font-bold mb-1.5 text-white tracking-tight">
                {title}
            </h3>

            <p className="text-zinc-400 text-xs sm:text-sm mb-6 max-w-md leading-relaxed px-2">
                {description}
            </p>

            {/* Quick-switch alternative servers if available */}
            {availableAlternatives && availableAlternatives.length > 0 && onSelectAlternative && (
                <div className="w-full max-w-md mb-6">
                    <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2.5">
                        Available Alternative Providers
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                        {availableAlternatives.slice(0, 4).map((alt) => (
                            <button
                                key={alt.id}
                                type="button"
                                onClick={() => onSelectAlternative(alt)}
                                className="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-accent/40 rounded-xl text-xs font-semibold text-white transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-sm"
                            >
                                <Play className="w-3 h-3 text-accent fill-current" />
                                <span>{alt.name.replace(/Toon Player\s*/i, '')}</span>
                                {alt.badge && (
                                    <span className="text-[9px] uppercase px-1.5 py-0.2 bg-white/10 rounded font-bold text-zinc-300">
                                        {alt.badge}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Recovery actions */}
            <div className="flex flex-wrap items-center justify-center gap-3">
                {onRetry && (
                    <button
                        type="button"
                        onClick={onRetry}
                        className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Retry {serverName.replace(/Toon Player\s*/i, '')}
                    </button>
                )}

                {onRetryAll && (
                    <button
                        type="button"
                        onClick={onRetryAll}
                        className="px-5 py-2.5 bg-gradient-to-r from-accent to-accent-warm hover:-translate-y-[1px] hover:scale-[1.02] text-white rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-accent/25 active:scale-95"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Retry All Servers
                    </button>
                )}

                {onBack && (
                    <button
                        type="button"
                        onClick={onBack}
                        className="px-4 py-2.5 bg-transparent hover:bg-white/5 border border-white/10 text-zinc-400 hover:text-white rounded-xl font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Go Back
                    </button>
                )}
            </div>
        </div>
    );
};

export default PlayerStatusOverlay;
