"use client";

import { motion } from "framer-motion";
import { Download, ExternalLink, X } from "lucide-react";

export const getProxiedEmbedUrl = (rawUrl: string) => {
    if (!rawUrl) return "";
    if (rawUrl.startsWith('/') || rawUrl.includes('localhost') || rawUrl.includes('127.0.0.1')) {
        return rawUrl;
    }
    try {
        const parsed = new URL(rawUrl);
        const host = parsed.hostname;
        const needsProxy =
            host.includes('megacloud') ||
            host.includes('rapid-cloud') ||
            host.includes('rabbitstream') ||
            host.includes('gogocdn') ||
            host.includes('playtaku') ||
            host.includes('vidstreaming') ||
            host.includes('allanime') ||
            host.includes('anime-taku') ||
            host.includes('filemoon');
        if (needsProxy) {
            return `/api/proxy/embed?url=${encodeURIComponent(rawUrl)}&referer=${encodeURIComponent(parsed.origin)}`;
        }
    } catch (_) {}
    return rawUrl;
};

interface DownloadModalProps {
    type: string;
    id: string;
    selectedSeason?: number;
    selectedEpisode?: number;
    title: string;
    onClose: () => void;
    rawVideoSource?: string | null;
}

export default function DownloadModal({ type, id, selectedSeason, selectedEpisode, title, onClose, rawVideoSource }: DownloadModalProps) {
    const isAnime = type === 'anime';
    const directDownloadUrl = rawVideoSource
        ? `/api/download/video?url=${encodeURIComponent(rawVideoSource)}&filename=${encodeURIComponent(title.replace(/[^a-zA-Z0-9._\-\s]/g, '') + ' - Episode ' + (selectedEpisode || 1) + '.mp4')}`
        : null;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-xl flex flex-col" onClick={onClose}>
            <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-emerald-500/20 rounded-lg flex items-center justify-center"><Download className="w-5 h-5 text-emerald-400" /></div>
                    <div>
                        <h3 className="font-bold text-sm text-white">Download — {title}</h3>
                        <p className="text-[11px] text-zinc-500">{isAnime ? `Episode ${selectedEpisode}` : (type === 'tv' ? `Season ${selectedSeason}, Episode ${selectedEpisode}` : 'Full Movie')}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {!isAnime && (
                        <a href={type === 'tv' ? `https://dl.vidsrc.vip/tv/${id}/${selectedSeason}/${selectedEpisode}` : `https://dl.vidsrc.vip/movie/${id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-all"><ExternalLink className="w-3.5 h-3.5" /> Open in New Tab</a>
                    )}
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><X className="w-5 h-5 text-zinc-400" /></button>
                </div>
            </div>
            <div className="flex-1 relative flex flex-col items-center justify-center p-6 text-center" onClick={(e) => e.stopPropagation()}>
                {isAnime ? (
                    <div className="max-w-md w-full bg-zinc-900 border border-white/10 rounded-2xl p-6 space-y-6 shadow-2xl">
                        <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto border border-blue-500/20 text-blue-400 animate-bounce">
                            <Download className="w-8 h-8" />
                        </div>
                        <div>
                            <h4 className="text-lg font-bold text-white mb-2">Anime Stream Downloader</h4>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                {rawVideoSource 
                                    ? "We successfully captured the raw media stream for this episode! Click the button below to start your high-speed direct download."
                                    : "Extracting stream from source server... Play the video for a few seconds to let our stream capturer grab the direct download link."}
                            </p>
                        </div>
                        {rawVideoSource ? (
                            <div className="space-y-3">
                                <a 
                                    href={directDownloadUrl!} 
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-sm hover:scale-105 active:scale-95 transition-all shadow-lg shadow-blue-500/20 cursor-pointer"
                                >
                                    <Download className="w-4 h-4" /> Start Direct Download
                                </a>
                                <div className="text-[10px] text-zinc-500 leading-tight">
                                    Format: MP4/HLS Direct Stream Proxy · High Speed · Guest Friendly
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center gap-2 text-zinc-500 text-xs font-bold py-4 animate-pulse">
                                <div className="w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
                                Waiting for video to play...
                            </div>
                        )}
                    </div>
                ) : (
                    <iframe src={getProxiedEmbedUrl(type === 'tv' ? `https://dl.vidsrc.vip/tv/${id}/${selectedSeason}/${selectedEpisode}` : `https://dl.vidsrc.vip/movie/${id}`)} className="w-full h-full border-0" allow="fullscreen; autoplay; encrypted-media; picture-in-picture" referrerPolicy="no-referrer" />
                )}
            </div>
            {!isAnime && (
                <div className="shrink-0 p-3 border-t border-white/10 bg-black/80 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest shrink-0">Alt:</span>
                        <a href={type === 'tv' ? `https://dl.vidsrc.vip/tv/${id}/${selectedSeason}/${selectedEpisode}` : `https://dl.vidsrc.vip/movie/${id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 rounded-lg text-[11px] font-bold shrink-0 hover:bg-emerald-600/30 transition-colors"><Download className="w-3 h-3" /> VidSrc DL</a>
                        <a href={type === 'tv' ? `https://vidfast.pro/tv/${id}/${selectedSeason}/${selectedEpisode}?autoPlay=true` : `https://vidfast.pro/movie/${id}?autoPlay=true`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-lg text-[11px] font-bold shrink-0 hover:bg-blue-600/30 transition-colors"><Download className="w-3 h-3" /> VidFast Pro</a>
                        <a href={type === 'tv' ? `https://www.2embed.cc/embedtv/${id}&s=${selectedSeason}&e=${selectedEpisode}` : `https://www.2embed.cc/embed/${id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/20 border border-accent/30 text-accent rounded-lg text-[11px] font-bold shrink-0 hover:bg-accent/30 transition-colors"><Download className="w-3 h-3" /> 2Embed</a>
                    </div>
                </div>
            )}
        </motion.div>
    );
}
