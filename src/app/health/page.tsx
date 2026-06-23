"use client";

import { useEffect, useState } from 'react';
import { 
    Activity, CheckCircle, AlertTriangle, XCircle, 
    RefreshCw, Clock, ArrowRight, ShieldAlert, 
    ChevronDown, ChevronUp, Zap, HelpCircle 
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ErrorLog {
    timestamp: string;
    message: string;
}

interface ProviderHealth {
    name: string;
    category: 'metadata' | 'stream';
    score: number;
    status: 'healthy' | 'slow' | 'offline';
    avgResponseMs: number;
    successCount: number;
    failureCount: number;
    lastChecked: number;
    isBlacklisted: boolean;
    uptimePercentage: number;
    errorLogs: ErrorLog[];
}

export default function HealthPage() {
    const [providers, setProviders] = useState<ProviderHealth[]>([]);
    const [summary, setSummary] = useState({ healthy: 0, slow: 0, offline: 0, total: 0 });
    const [updatedAt, setUpdatedAt] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [isPinging, setIsPinging] = useState(false);
    const [expandedProvider, setExpandedProvider] = useState<string | null>(null);

    const fetchHealth = async (isManual = false) => {
        try {
            if (isManual) setIsPinging(true);
            const res = await fetch('/api/provider/health');
            if (!res.ok) throw new Error('Failed to fetch provider health data');
            const data = await res.json();
            setProviders(data.providers || []);
            setSummary(data.summary || { healthy: 0, slow: 0, offline: 0, total: 0 });
            setUpdatedAt(data.updatedAt || new Date().toISOString());
        } catch (err: any) {
            toast.error(err.message || 'Error updating health status');
        } finally {
            setIsLoading(false);
            if (isManual) setIsPinging(false);
        }
    };

    const triggerPing = async () => {
        setIsPinging(true);
        const checkToast = toast.loading('Pinging all provider endpoints...');
        try {
            const res = await fetch('/api/provider/health', { method: 'POST' });
            if (!res.ok) throw new Error('Failover ping test failed');
            const data = await res.json();
            setProviders(data.providers || []);
            setSummary(data.summary || { healthy: 0, slow: 0, offline: 0, total: 0 });
            setUpdatedAt(data.updatedAt || new Date().toISOString());
            toast.success('All providers audited successfully!', { id: checkToast });
        } catch (err: any) {
            toast.error(err.message || 'Error performing health check', { id: checkToast });
        } finally {
            setIsPinging(false);
        }
    };

    useEffect(() => {
        fetchHealth();
        // Poll every 60 seconds
        const timer = setInterval(() => fetchHealth(), 60000);
        return () => clearInterval(timer);
    }, []);

    const getStatusColor = (status: ProviderHealth['status']) => {
        switch (status) {
            case 'healthy': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            case 'slow': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
            case 'offline': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
            default: return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
        }
    };

    const getStatusIcon = (status: ProviderHealth['status']) => {
        switch (status) {
            case 'healthy': return <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />;
            case 'slow': return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
            case 'offline': return <XCircle className="w-4 h-4 text-rose-400 shrink-0" />;
            default: return <HelpCircle className="w-4 h-4 text-zinc-400 shrink-0" />;
        }
    };

    const avgLatency = providers.length 
        ? Math.round(providers.reduce((acc, p) => acc + p.avgResponseMs, 0) / providers.length)
        : 0;

    const systemUptime = providers.length 
        ? Math.round(providers.reduce((acc, p) => acc + p.uptimePercentage, 0) / providers.length)
        : 100;

    return (
        <div className="w-full max-w-7xl mx-auto px-4 py-8 md:py-12 relative z-10 text-white">
            
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 border-b border-white/5 pb-8">
                <div>
                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent flex items-center gap-3">
                        <Activity className="w-8 h-8 text-[var(--accent)] animate-pulse" />
                        OTT System Health Dashboard
                    </h1>
                    <p className="text-zinc-400 text-xs md:text-sm mt-2 font-medium">
                        Real-time failover monitoring, provider metrics, and fallback routing configs.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 bg-white/[0.03] px-3 py-2 rounded-xl border border-white/5 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" />
                        Last Check: {updatedAt ? new Date(updatedAt).toLocaleTimeString() : 'Never'}
                    </span>
                    <button
                        onClick={triggerPing}
                        disabled={isPinging || isLoading}
                        className="flex items-center justify-center gap-2 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-secondary)] hover:opacity-90 active:scale-98 text-white font-black uppercase text-xs tracking-wider px-5 py-3 rounded-xl transition-all shadow-[0_8px_25px_var(--accent-glow)] border-0 disabled:opacity-50 cursor-pointer"
                    >
                        <RefreshCw className={`w-4 h-4 ${isPinging ? 'animate-spin' : ''}`} />
                        {isPinging ? 'Pinging Checkers...' : 'Trigger Live Ping'}
                    </button>
                </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-[#0c0d14]/75 border border-white/5 rounded-2xl p-5 backdrop-blur-md">
                    <p className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-1.5">Uptime Index</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl md:text-3xl font-extrabold text-white">{systemUptime}%</span>
                        <span className="text-[10px] text-emerald-400 font-extrabold uppercase">Stable</span>
                    </div>
                    <div className="w-full bg-white/5 h-1.5 rounded-full mt-3 overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full transition-all duration-[250ms]" style={{ width: `${systemUptime}%` }} />
                    </div>
                </div>

                <div className="bg-[#0c0d14]/75 border border-white/5 rounded-2xl p-5 backdrop-blur-md">
                    <p className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-1.5">Avg Latency</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl md:text-3xl font-extrabold text-white">{avgLatency}ms</span>
                        <span className={`text-[10px] font-extrabold uppercase ${avgLatency < 1000 ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {avgLatency < 1000 ? 'Fast' : 'Degraded'}
                        </span>
                    </div>
                    <div className="w-full bg-white/5 h-1.5 rounded-full mt-3 overflow-hidden">
                        <div 
                            className={`h-full rounded-full transition-all duration-[250ms] ${avgLatency < 1000 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                            style={{ width: `${Math.min(100, Math.max(10, 100 - (avgLatency / 30)))}%` }} 
                        />
                    </div>
                </div>

                <div className="bg-[#0c0d14]/75 border border-white/5 rounded-2xl p-5 backdrop-blur-md">
                    <p className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-1.5">Healthy Systems</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl md:text-3xl font-extrabold text-emerald-400">{summary.healthy}</span>
                        <span className="text-zinc-500 text-sm font-semibold">/ {summary.total}</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-3 font-semibold uppercase">Operational metadata & streams</p>
                </div>

                <div className="bg-[#0c0d14]/75 border border-white/5 rounded-2xl p-5 backdrop-blur-md">
                    <p className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-1.5">Offline / Degraded</p>
                    <div className="flex items-baseline gap-2">
                        <span className={`text-2xl md:text-3xl font-extrabold ${summary.offline > 0 ? 'text-rose-400' : 'text-zinc-400'}`}>
                            {summary.offline + summary.slow}
                        </span>
                        <span className="text-zinc-500 text-sm font-semibold">Flagged</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-3 font-semibold uppercase">
                        {summary.offline > 0 ? 'Requires failover redirection' : 'Zero dead links detected'}
                    </p>
                </div>
            </div>

            {/* Provider List and Routing Info */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Providers detail block */}
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-lg font-black uppercase tracking-wider text-zinc-300 flex items-center gap-2 mb-2">
                        <Zap className="w-5 h-5 text-[var(--accent)]" />
                        Active Streamers & Metadata Checkers
                    </h2>

                    {isLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="h-24 bg-white/5 border border-white/5 rounded-2xl animate-pulse" />
                            ))}
                        </div>
                    ) : providers.length === 0 ? (
                        <div className="bg-[#0c0d14]/50 border border-white/5 rounded-2xl p-10 text-center">
                            <ShieldAlert className="w-12 h-12 text-zinc-500 mx-auto mb-3 opacity-30" />
                            <p className="text-sm text-zinc-400">No health metrics collected yet.</p>
                            <button onClick={triggerPing} className="mt-4 text-xs font-black uppercase text-[var(--accent)]">Check Status Now</button>
                        </div>
                    ) : (
                        providers.map((p) => {
                            const isExpanded = expandedProvider === p.name;
                            return (
                                <div 
                                    key={p.name}
                                    className="bg-[#0c0d14]/60 border border-white/5 rounded-2xl hover:border-white/10 transition-all overflow-hidden"
                                >
                                    <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`px-2.5 py-1 rounded-full border text-[9px] uppercase font-black tracking-wider ${getStatusColor(p.status)}`}>
                                                {p.status}
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                                                    {getStatusIcon(p.status)}
                                                    {p.name}
                                                </h3>
                                                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                                                    Category: {p.category}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-6 sm:gap-8 text-left sm:text-right shrink-0">
                                            <div>
                                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Health</p>
                                                <p className={`text-sm font-black ${p.score >= 80 ? 'text-emerald-400' : p.score >= 40 ? 'text-amber-400' : 'text-rose-400'}`}>
                                                    {p.score}%
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Latency</p>
                                                <p className="text-sm font-black text-white">{p.avgResponseMs}ms</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Uptime</p>
                                                <p className="text-sm font-black text-white">{p.uptimePercentage}%</p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => setExpandedProvider(isExpanded ? null : p.name)}
                                            className="self-end sm:self-center text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-all cursor-pointer"
                                            aria-label="Inspect provider log details"
                                        >
                                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                        </button>
                                    </div>

                                    {/* Expanded Error Logs Section */}
                                    {isExpanded && (
                                        <div className="bg-black/40 border-t border-white/5 px-6 py-4">
                                            <div className="flex justify-between items-center mb-3">
                                                <h4 className="text-xs uppercase font-extrabold tracking-wider text-zinc-400">
                                                    Diagnostics & Failover Logs
                                                </h4>
                                                <span className="text-[10px] text-zinc-500 font-bold">
                                                    Successes: {p.successCount} | Failures: {p.failureCount}
                                                </span>
                                            </div>
                                            
                                            {p.errorLogs && p.errorLogs.length > 0 ? (
                                                <div className="space-y-2">
                                                    {p.errorLogs.map((log, idx) => (
                                                        <div key={idx} className="flex gap-3 text-xs bg-rose-500/5 border border-rose-500/10 rounded-xl p-3">
                                                            <span className="text-[10px] text-rose-400 font-mono shrink-0">
                                                                {new Date(log.timestamp).toLocaleTimeString()}
                                                            </span>
                                                            <span className="text-zinc-300 font-medium break-all">
                                                                {log.message}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                                                    <p className="text-xs text-emerald-400 font-bold">
                                                        ✓ 100% Operational Uptime. No exceptions logged.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Routing & Fallback sidebar configurations */}
                <div className="space-y-6">
                    <div className="bg-[#0c0d14]/75 border border-white/5 rounded-2xl p-6 backdrop-blur-md">
                        <h2 className="text-sm font-black uppercase tracking-wider text-zinc-300 flex items-center gap-2 mb-4">
                            <ShieldAlert className="w-4 h-4 text-[var(--accent)]" />
                            Automated Fallback Chain
                        </h2>
                        
                        <p className="text-xs text-zinc-400 leading-relaxed mb-6 font-medium">
                            If the active provider logs {`>=`} 3 consecutive timeouts or connection errors, the watch player initiates background failover down the fallback chain.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-3">Movie & TV Fallback Order</h3>
                                <div className="space-y-2">
                                    {[
                                        { step: '1', name: 'VidSrc TO', type: 'Primary Embed' },
                                        { step: '2', name: 'VidSrc ME', type: 'Secondary Embed' },
                                        { step: '3', name: 'SuperEmbed', type: 'Mirror Fallback' },
                                        { step: '4', name: 'AutoEmbed', type: 'Secondary Mirror' },
                                        { step: '5', name: 'Trailer', type: 'Local YouTube Trailer' },
                                    ].map((c, idx, arr) => (
                                        <div key={c.name}>
                                            <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-xl p-3">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="w-5 h-5 flex items-center justify-center rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-[10px] font-black">
                                                        {c.step}
                                                    </span>
                                                    <span className="text-xs font-bold text-white">{c.name}</span>
                                                </div>
                                                <span className="text-[9px] uppercase font-bold text-zinc-500">{c.type}</span>
                                            </div>
                                            {idx < arr.length - 1 && (
                                                <div className="flex justify-center my-1">
                                                    <ArrowRight className="w-3.5 h-3.5 text-zinc-600 rotate-90" />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="border-t border-white/5 pt-4 mt-4">
                                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-3">Anime Fallback Order</h3>
                                <div className="space-y-2">
                                    {[
                                        { step: '1', name: 'Anikai', type: 'Primary API Scraper' },
                                        { step: '2', name: 'Consumet', type: 'Alternative Parser' },
                                        { step: '3', name: 'Gogoanime', type: 'Fallback Stream' },
                                        { step: '4', name: 'HiAnime', type: 'Alternate Stream' },
                                        { step: '5', name: 'Error Screen', type: 'Trailer Fallback / Error Toast' },
                                    ].map((c, idx, arr) => (
                                        <div key={c.name}>
                                            <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-xl p-3">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="w-5 h-5 flex items-center justify-center rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-[10px] font-black">
                                                        {c.step}
                                                    </span>
                                                    <span className="text-xs font-bold text-white">{c.name}</span>
                                                </div>
                                                <span className="text-[9px] uppercase font-bold text-zinc-500">{c.type}</span>
                                            </div>
                                            {idx < arr.length - 1 && (
                                                <div className="flex justify-center my-1">
                                                    <ArrowRight className="w-3.5 h-3.5 text-zinc-600 rotate-90" />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
