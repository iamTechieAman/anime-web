"use client";

import React, { useState, useEffect } from "react";
import { Info, X } from "lucide-react";

export interface CrossOriginEmbedNoticeProps {
    serverName: string;
    visible?: boolean;
}

export const CrossOriginEmbedNotice: React.FC<CrossOriginEmbedNoticeProps> = ({
    serverName,
    visible = true
}) => {
    const [dismissed, setDismissed] = useState(false);

    // Reset dismissal when server changes
    useEffect(() => {
        setDismissed(false);
    }, [serverName]);

    if (!visible || dismissed) return null;

    return (
        <div 
            className="absolute top-3 left-3 z-20 pointer-events-auto transition-all duration-300"
            role="status"
            aria-live="polite"
        >
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/80 backdrop-blur-md border border-white/10 text-white shadow-lg text-[11px] font-medium max-w-[90vw]">
                <Info className="w-3.5 h-3.5 text-accent shrink-0" />
                <span className="truncate">
                    Stream hosted by <strong className="font-semibold text-white">{serverName.replace(/Toon Player\s*/i, '')}</strong> — provider manages playback
                </span>
                <button
                    type="button"
                    onClick={() => setDismissed(true)}
                    className="p-0.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors ml-1 cursor-pointer"
                    aria-label="Dismiss notice"
                >
                    <X className="w-3 h-3" />
                </button>
            </div>
        </div>
    );
};

export default CrossOriginEmbedNotice;
