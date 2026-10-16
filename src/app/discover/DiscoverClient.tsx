"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
    Sparkles, Loader2, Search, ArrowLeft, Send, X, 
    History, Mic, AlertTriangle, RefreshCw, Compass, Check
} from "lucide-react";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { MovieGrid } from "@/components/MovieCard";
import toast from "react-hot-toast";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    results?: any[];
    loading?: boolean;
    loadingProgressText?: string;
    error?: boolean;
    failedPrompt?: string;
}

const SUGGESTIONS = [
    { text: "Cyberpunk", desc: "Neon aesthetics, high-tech dystopian futures, and cybernetics", emoji: "🌌" },
    { text: "Sad anime", desc: "Bittersweet romances, emotional drama, and heartfelt tearjerkers", emoji: "🌧️" },
    { text: "Studio Ghibli", desc: "Magical adventures, cozy nostalgic vibes, and lush animation", emoji: "🌳" },
    { text: "Mind bending", desc: "Psychological thrillers, reality shifts, and shocking plot twists", emoji: "🧠" },
    { text: "Kdrama", desc: "Acclaimed Korean romances, gripping suspense, and heartfelt series", emoji: "🇰🇷" },
    { text: "Hidden gems", desc: "Critically acclaimed but overlooked cinematic treasures to explore", emoji: "💎" },
];

const MOODS = [
    { name: "Chill ☕", query: "cozy relaxing feel-good" },
    { name: "Hyped ⚡", query: "action adrenaline fast paced" },
    { name: "Melancholic 🌧️", query: "sad emotional drama tearjerker" },
    { name: "Adventurous 🗺️", query: "epic adventure fantasy quest" },
    { name: "Terrified 💀", query: "scary horror psychological suspense" },
    { name: "Intrigued 🧠", query: "mind bending mystery thriller" },
];

const PLACEHOLDERS = [
    "sad romance anime with beautiful visuals...",
    "mind bending sci-fi thriller with plot twists...",
    "cyberpunk neon aesthetic with deep story...",
    "cozy comforting Studio Ghibli vibes...",
    "epic high fantasy with magic and dragons...",
    "scary slow-burn psychological horror...",
];

export default function DiscoverClient() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const promptParam = searchParams?.get("prompt") || "";

    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [history, setHistory] = useState<string[]>([]);
    const [selectedMood, setSelectedMood] = useState<string | null>(null);
    const [isQuerying, setIsQuerying] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Voice search integration
    const {
        isListening,
        recordingFallbackActive,
        isTranscribing,
        errorMsg,
        startListening,
        stopListening
    } = useVoiceSearch((text) => {
        if (text && text.trim()) {
            setInput(text);
            handleNewSearch(text);
        }
    });

    const [isVoiceSupported, setIsVoiceSupported] = useState(false);

    useEffect(() => {
        setIsVoiceSupported(
            typeof window !== "undefined" && (
                "SpeechRecognition" in window || 
                "webkitSpeechRecognition" in window || 
                Boolean(navigator?.mediaDevices?.getUserMedia)
            )
        );
    }, []);

    const toggleVoice = () => {
        if (!isVoiceSupported) {
            toast.error("Voice input is not supported in this browser.", { id: "voice-unsupported" });
            return;
        }
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };

    // Cleanup interval on unmount
    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    // Placeholder Typing Effect
    const [placeholderText, setPlaceholderText] = useState("");
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const [charIndex, setCharIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        const currentSentence = PLACEHOLDERS[placeholderIndex];

        if (isDeleting) {
            timer = setTimeout(() => {
                setPlaceholderText(currentSentence.substring(0, charIndex - 1));
                setCharIndex(prev => prev - 1);
            }, 25);
        } else {
            timer = setTimeout(() => {
                setPlaceholderText(currentSentence.substring(0, charIndex + 1));
                setCharIndex(prev => prev + 1);
            }, 50);
        }

        if (!isDeleting && charIndex === currentSentence.length) {
            timer = setTimeout(() => setIsDeleting(true), 2000);
        } else if (isDeleting && charIndex === 0) {
            setIsDeleting(false);
            setPlaceholderIndex(prev => (prev + 1) % PLACEHOLDERS.length);
        }

        return () => clearTimeout(timer);
    }, [charIndex, isDeleting, placeholderIndex]);

    // Load recent prompt history from localStorage
    useEffect(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("toonplayer_ai_prompt_history");
            if (saved) {
                try {
                    setHistory(JSON.parse(saved));
                } catch(e) {}
            }
        }
    }, []);

    const savePromptToHistory = (promptText: string) => {
        setHistory(prev => {
            const updated = [promptText, ...prev.filter(p => p !== promptText)].slice(0, 8);
            if (typeof window !== "undefined") {
                localStorage.setItem("toonplayer_ai_prompt_history", JSON.stringify(updated));
            }
            return updated;
        });
    };

    const clearHistory = () => {
        setHistory([]);
        if (typeof window !== "undefined") {
            localStorage.removeItem("toonplayer_ai_prompt_history");
        }
        toast.success("Prompt history cleared");
    };

    const scrollToBottom = () => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Perform AI search recommendation
    const handleNewSearch = useCallback(async (queryText: string) => {
        const trimmed = queryText.trim();
        if (!trimmed || isQuerying) return;

        setIsQuerying(true);

        const userMsgId = String(Date.now());
        const userMessage: Message = {
            id: userMsgId,
            role: "user",
            content: trimmed
        };

        const assistantMsgId = String(Date.now() + 1);
        const assistantMessage: Message = {
            id: assistantMsgId,
            role: "assistant",
            content: "",
            loading: true,
            loadingProgressText: "Analyzing search intent..."
        };

        setMessages(prev => [...prev, userMessage, assistantMessage]);
        savePromptToHistory(trimmed);
        setTimeout(scrollToBottom, 50);

        const progressSteps = [
            "Analyzing search intent...",
            "Retrieving catalog mappings...",
            "Querying streaming databases...",
            "Formatting recommendations..."
        ];

        let stepIdx = 0;
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(() => {
            stepIdx = (stepIdx + 1) % progressSteps.length;
            setMessages(prev => prev.map(m => 
                m.id === assistantMsgId ? { ...m, loadingProgressText: progressSteps[stepIdx] } : m
            ));
        }, 800);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        try {
            const res = await axios.get("/api/discover", { 
                params: { prompt: trimmed },
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (intervalRef.current) clearInterval(intervalRef.current);

            // If backend returned an error in payload
            if (res.data?.error && (!res.data?.results || res.data.results.length === 0)) {
                setMessages(prev => prev.map(m => {
                    if (m.id === assistantMsgId) {
                        return {
                            ...m,
                            loading: false,
                            content: res.data.error || "Could not retrieve recommendations. Please retry.",
                            error: true,
                            failedPrompt: trimmed,
                            results: []
                        };
                    }
                    return m;
                }));
                return;
            }

            const searchResults = res.data.results || [];

            setMessages(prev => prev.map(m => {
                if (m.id === assistantMsgId) {
                    return {
                        ...m,
                        loading: false,
                        content: searchResults.length > 0 
                            ? `Here are the top recommendations discovered for "${trimmed}":`
                            : `No matching titles found for "${trimmed}". Try exploring broader keywords or different themes.`,
                        results: searchResults
                    };
                }
                return m;
            }));

            // Clear input after search has been dispatched successfully
            setInput("");
            setSelectedMood(null);
            setTimeout(scrollToBottom, 150);
        } catch (err: any) {
            clearTimeout(timeoutId);
            if (intervalRef.current) clearInterval(intervalRef.current);
            console.error("AI Discover search failed:", err);

            const isTimeout = err.name === "AbortError" || axios.isCancel(err);
            const errorDesc = isTimeout
                ? "The discovery request timed out. Please try again."
                : "Encountered an issue querying recommendations. Please retry.";

            setMessages(prev => prev.map(m => {
                if (m.id === assistantMsgId) {
                    return {
                        ...m,
                        loading: false,
                        content: errorDesc,
                        error: true,
                        failedPrompt: trimmed,
                        results: []
                    };
                }
                return m;
            }));
            setTimeout(scrollToBottom, 150);
        } finally {
            setIsQuerying(false);
        }
    }, [isQuerying]);

    // Initial prompt from URL deep link
    useEffect(() => {
        if (promptParam && messages.length === 0) {
            handleNewSearch(promptParam);
        }
    }, [promptParam, messages.length, handleNewSearch]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = input.trim();
        if (!trimmed) {
            toast.error("Please enter a query or select a suggestion first.", { id: "empty-search-toast" });
            return;
        }
        handleNewSearch(trimmed);
    };

    const handleClearConsole = () => {
        setMessages([]);
        setInput("");
        setSelectedMood(null);
        router.replace("/discover", { scroll: false });
    };

    const handleMoodClick = (mood: typeof MOODS[0]) => {
        if (selectedMood === mood.name) {
            setSelectedMood(null);
            const current = input.trim();
            if (current === mood.query) {
                setInput("");
            } else {
                setInput(current.replace(mood.query, "").trim());
            }
        } else {
            setSelectedMood(mood.name);
            const current = input.trim();
            if (!current) {
                setInput(mood.query);
            } else if (!current.toLowerCase().includes(mood.query.toLowerCase())) {
                setInput(`${current} ${mood.query}`);
            }
        }
    };

    return (
        <div className="flex-1 w-full bg-bg-main pt-6 pb-16 px-4 md:px-8 flex flex-col min-h-[75vh]">
            <div className="max-w-[1600px] mx-auto w-full flex-1 flex flex-col">
                
                {/* Header Row */}
                <div className="border-b border-white/5 pb-4 mb-6 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight font-sora">
                                    AI Discovery
                                </h1>
                                <span className="text-[10px] bg-pink-500/15 text-pink-400 px-2 py-0.5 rounded-full border border-pink-500/30 uppercase tracking-widest font-black font-mono">
                                    Console
                                </span>
                            </div>
                            <p className="text-[11px] text-zinc-400 font-medium">Conversational Movie, TV Series & Anime Finder</p>
                        </div>
                    </div>
                    
                    {messages.length > 0 && (
                        <button 
                            onClick={handleClearConsole}
                            className="flex items-center gap-1.5 text-zinc-400 hover:text-white font-bold transition-all text-xs uppercase tracking-wider py-2 px-3.5 bg-white/5 border border-white/10 hover:border-white/20 rounded-xl cursor-pointer"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>New Search</span>
                        </button>
                    )}
                </div>

                <AnimatePresence mode="wait">
                    {messages.length === 0 ? (
                        // Welcome Screen Dashboard
                        <motion.div 
                            key="welcome-dashboard"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                            transition={{ duration: 0.2 }}
                            className="max-w-4xl mx-auto w-full py-6 sm:py-10 flex-1 flex flex-col justify-center space-y-8"
                        >
                            <div className="text-center space-y-3">
                                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight font-sora">
                                    What are you in the <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-purple-400">mood to stream?</span>
                                </h2>
                                <p className="text-zinc-400 font-medium text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
                                    Describe your ideal watch — genres, themes, visual aesthetics, or storylines. ToonPlayer AI searches our indexed catalog to find matches.
                                </p>
                            </div>

                            {/* Search Composer Container */}
                            <div className="max-w-2xl mx-auto w-full space-y-3">
                                <form onSubmit={handleSubmit} className="relative w-full">
                                    <div className={`relative flex items-center bg-[#101118]/90 border rounded-2xl p-2 transition-all duration-200 backdrop-blur-md ${
                                        isQuerying 
                                            ? "border-pink-500/30 shadow-[0_0_20px_rgba(236,72,153,0.12)] opacity-90"
                                            : "border-white/[0.08] focus-within:border-pink-500/50 focus-within:shadow-[0_0_24px_rgba(236,72,153,0.18)]"
                                    }`}>
                                        <div className="pl-3 pr-2 text-zinc-500">
                                            <Search className="w-5 h-5 text-zinc-400" />
                                        </div>
                                        <input 
                                            type="text"
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            disabled={isQuerying}
                                            placeholder={placeholderText || "Describe what you'd like to watch..."}
                                            className="w-full bg-transparent py-3 pr-24 text-sm md:text-base text-white outline-none placeholder-zinc-500 font-medium disabled:opacity-60"
                                        />
                                        <div className="absolute right-2 flex items-center gap-1.5">
                                            {input.trim() && !isQuerying && (
                                                <button
                                                    type="button"
                                                    onClick={() => setInput("")}
                                                    className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                                                    aria-label="Clear input"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}

                                            <button
                                                type="button"
                                                onClick={toggleVoice}
                                                disabled={!isVoiceSupported || isQuerying}
                                                title={!isVoiceSupported ? "Voice search unavailable in this browser" : isListening ? "Stop voice listening" : "Search with voice"}
                                                aria-label={!isVoiceSupported ? "Voice search unavailable" : isListening ? "Stop voice listening" : "Start voice search"}
                                                className={`p-2.5 rounded-xl border transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-pink-500 disabled:opacity-30 disabled:cursor-not-allowed ${
                                                    isListening 
                                                        ? "bg-red-500/15 border-red-500/40 text-red-400 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.3)]" 
                                                        : "bg-white/[0.04] border-white/[0.08] text-zinc-400 hover:text-white hover:bg-white/10"
                                                }`}
                                            >
                                                {isTranscribing ? (
                                                    <Loader2 className="w-4 h-4 animate-spin text-pink-400" />
                                                ) : (
                                                    <Mic className="w-4 h-4" />
                                                )}
                                            </button>

                                            <button 
                                                type="submit"
                                                disabled={!input.trim() || isQuerying}
                                                className="w-10 h-10 rounded-xl bg-gradient-to-r from-pink-600 to-pink-500 hover:from-pink-500 hover:to-pink-400 disabled:opacity-30 disabled:hover:from-pink-600 disabled:hover:to-pink-500 text-white transition-all flex items-center justify-center cursor-pointer disabled:cursor-not-allowed shadow-md shadow-pink-600/20 active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-white"
                                                aria-label="Submit search"
                                            >
                                                {isQuerying ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Send className="w-4 h-4" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </form>

                                {/* Mood tags horizontal selector */}
                                <div className="flex flex-wrap items-center gap-1.5 justify-center pt-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mr-1">Mood:</span>
                                    {MOODS.map(mood => {
                                        const isSelected = selectedMood === mood.name;
                                        return (
                                            <button
                                                key={mood.name}
                                                type="button"
                                                onClick={() => handleMoodClick(mood)}
                                                className={`text-xs font-semibold px-3 py-1 rounded-full border transition-all duration-200 cursor-pointer select-none flex items-center gap-1 ${
                                                    isSelected 
                                                        ? "bg-pink-500/20 text-pink-300 border-pink-500/50 shadow-[0_0_12px_rgba(236,72,153,0.25)] scale-[1.02]"
                                                        : "bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08] border-white/[0.08]"
                                                }`}
                                            >
                                                <span>{mood.name}</span>
                                                {isSelected && <Check className="w-3 h-3 text-pink-400" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Standardized Suggestion Cards */}
                            <div className="space-y-4 pt-2">
                                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block text-center">
                                    Suggested Prompts
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 max-w-4xl mx-auto w-full">
                                    {SUGGESTIONS.map((sug) => (
                                        <button
                                            key={sug.text}
                                            type="button"
                                            onClick={() => {
                                                setInput(sug.text);
                                                handleNewSearch(sug.text);
                                            }}
                                            disabled={isQuerying}
                                            className="group p-4 sm:p-5 rounded-2xl border border-white/[0.08] bg-[#0c0d12]/90 hover:border-pink-500/40 hover:bg-pink-500/[0.03] backdrop-blur-md text-left flex flex-col justify-between h-[120px] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(236,72,153,0.12)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
                                        >
                                            <div className="flex items-center justify-between w-full">
                                                <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-base group-hover:scale-105 transition-transform">
                                                    {sug.emoji}
                                                </div>
                                                <Sparkles className="w-4 h-4 text-pink-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-white group-hover:text-pink-300 transition-colors tracking-tight font-sora">
                                                    {sug.text}
                                                </h3>
                                                <p className="text-[11px] text-zinc-400 mt-0.5 font-normal group-hover:text-zinc-300 transition-colors line-clamp-1 leading-normal">
                                                    {sug.desc}
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Recent Prompts History */}
                            {history.length > 0 && (
                                <div className="max-w-2xl mx-auto w-full border-t border-white/5 pt-6 space-y-3">
                                    <div className="flex items-center justify-between text-zinc-500">
                                        <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 text-zinc-400">
                                            <History className="w-3.5 h-3.5" /> Recent Prompts
                                        </span>
                                        <button 
                                            onClick={clearHistory}
                                            className="text-[10px] uppercase font-bold text-zinc-500 hover:text-white transition-colors cursor-pointer"
                                        >
                                            Clear History
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {history.map((hPrompt, i) => (
                                            <button
                                                key={`${hPrompt}-${i}`}
                                                type="button"
                                                onClick={() => {
                                                    setInput(hPrompt);
                                                    handleNewSearch(hPrompt);
                                                }}
                                                disabled={isQuerying}
                                                className="text-xs font-medium text-zinc-400 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.07] hover:border-pink-500/30 rounded-xl px-3 py-1.5 hover:text-white transition-all cursor-pointer truncate max-w-[220px]"
                                                title={hPrompt}
                                            >
                                                {hPrompt}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                        </motion.div>
                    ) : (
                        // Conversational Chat Screen
                        <div className="flex-1 flex flex-col justify-between max-w-5xl mx-auto w-full space-y-8 pb-10">
                            
                            {/* Scrollable messages thread */}
                            <div className="flex-1 flex flex-col space-y-8">
                                {messages.map((msg) => (
                                    <div key={msg.id} className="w-full flex flex-col">
                                        {msg.role === "user" ? (
                                            /* User Prompt Bubble */
                                            <div className="flex justify-end w-full">
                                                <div className="max-w-[85%] bg-gradient-to-r from-pink-600/90 to-purple-600/90 text-white rounded-2xl rounded-tr-sm px-5 py-3 shadow-lg border border-pink-500/20">
                                                    <p className="text-sm md:text-base font-semibold leading-relaxed">{msg.content}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            /* Assistant Response Bubble */
                                            <div className="flex flex-col space-y-3.5 w-full">
                                                <div className="flex items-center gap-2 text-zinc-500 border-b border-white/5 pb-2">
                                                    <div className="w-6 h-6 rounded-full bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-[10px] font-bold text-pink-400">
                                                        <Sparkles className="w-3.5 h-3.5" />
                                                    </div>
                                                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">ToonPlayer AI Recommendation</span>
                                                </div>
                                                
                                                {msg.loading ? (
                                                    /* Dynamic Loading Progress logs */
                                                    <div className="bg-[#101118]/80 border border-white/10 rounded-2xl p-5 flex items-center gap-3.5 max-w-md shadow-md backdrop-blur-md">
                                                        <Loader2 className="w-5 h-5 text-pink-400 animate-spin shrink-0" />
                                                        <span className="text-xs font-semibold text-zinc-300 tracking-wide">{msg.loadingProgressText}</span>
                                                    </div>
                                                ) : msg.error ? (
                                                    /* Error State UI with Retry Action */
                                                    <div className="p-5 rounded-2xl bg-red-950/20 border border-red-500/20 flex flex-col items-start gap-3 max-w-md">
                                                        <div className="flex items-center gap-2 text-red-400 text-xs font-bold">
                                                            <AlertTriangle className="w-4 h-4" />
                                                            <span>Recommendation Request Failed</span>
                                                        </div>
                                                        <p className="text-xs text-zinc-400 leading-relaxed">{msg.content}</p>
                                                        {msg.failedPrompt && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleNewSearch(msg.failedPrompt!)}
                                                                className="px-4 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-white flex items-center gap-1.5 transition-all cursor-pointer"
                                                            >
                                                                <RefreshCw className="w-3.5 h-3.5" /> Retry Search
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    /* Loaded card results list */
                                                    <div className="space-y-4">
                                                        <p className="text-sm text-zinc-300 font-medium leading-relaxed">{msg.content}</p>
                                                        {msg.results && msg.results.length > 0 ? (
                                                            <div className="pt-2">
                                                                <MovieGrid items={msg.results} />
                                                            </div>
                                                        ) : (
                                                            /* Empty Results */
                                                            <div className="py-10 bg-[#101118]/60 border border-white/10 rounded-2xl flex flex-col items-center justify-center text-center p-6">
                                                                <Compass className="w-8 h-8 text-zinc-600 mb-2" />
                                                                <h4 className="text-sm font-bold text-white">No matching titles discovered</h4>
                                                                <p className="text-xs text-zinc-500 mt-1 max-w-xs leading-relaxed">
                                                                    Try searching for simpler keywords, broad genres like &quot;sci-fi&quot; or &quot;anime&quot;, or select one of the suggested mood vibes below.
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Sticky bottom input panel */}
                            <div className="sticky bottom-0 bg-bg-main/95 backdrop-blur-md border-t border-white/5 pt-3 pb-2 z-20">
                                <div className="flex flex-col gap-2.5 max-w-3xl mx-auto w-full">
                                    
                                    {/* Mood tags inline while in chat view */}
                                    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none items-center">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 shrink-0 mr-1">Vibe:</span>
                                        {MOODS.map(mood => {
                                            const isSelected = selectedMood === mood.name;
                                            return (
                                                <button
                                                    key={mood.name}
                                                    type="button"
                                                    onClick={() => handleMoodClick(mood)}
                                                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                                                        isSelected 
                                                            ? "bg-pink-500/20 text-pink-300 border-pink-500/50 shadow-[0_0_10px_rgba(236,72,153,0.2)]"
                                                            : "bg-white/[0.04] text-zinc-400 hover:text-white border-white/[0.06]"
                                                    }`}
                                                >
                                                    <span>{mood.name}</span>
                                                    {isSelected && <Check className="w-2.5 h-2.5 text-pink-400" />}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Chat Form */}
                                    <form onSubmit={handleSubmit} className="relative w-full">
                                        <div className={`relative flex items-center bg-[#101118]/90 border rounded-2xl p-2 transition-all duration-200 backdrop-blur-md ${
                                            isQuerying 
                                                ? "border-pink-500/30 shadow-[0_0_20px_rgba(236,72,153,0.12)] opacity-90"
                                                : "border-white/[0.08] focus-within:border-pink-500/50 focus-within:shadow-[0_0_24px_rgba(236,72,153,0.18)]"
                                        }`}>
                                            <input 
                                                type="text"
                                                value={input}
                                                onChange={(e) => setInput(e.target.value)}
                                                disabled={isQuerying}
                                                placeholder={placeholderText || "Send follow-up request..."}
                                                className="w-full bg-transparent pl-3 pr-24 py-2.5 text-sm md:text-base text-white outline-none placeholder-zinc-500 font-medium disabled:opacity-60"
                                            />
                                            <div className="absolute right-2 flex items-center gap-1.5">
                                                {input.trim() && !isQuerying && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setInput("")}
                                                        className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                                                        aria-label="Clear input"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={toggleVoice}
                                                    disabled={!isVoiceSupported || isQuerying}
                                                    title={!isVoiceSupported ? "Voice search unavailable in this browser" : isListening ? "Stop listening" : "Search with voice"}
                                                    aria-label="Toggle voice search"
                                                    className={`p-2 rounded-xl border transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-pink-500 disabled:opacity-30 disabled:cursor-not-allowed ${
                                                        isListening 
                                                            ? "bg-red-500/15 border-red-500/40 text-red-400 animate-pulse" 
                                                            : "bg-white/[0.04] border-white/[0.08] text-zinc-400 hover:text-white"
                                                    }`}
                                                >
                                                    {isTranscribing ? (
                                                        <Loader2 className="w-4 h-4 animate-spin text-pink-400" />
                                                    ) : (
                                                        <Mic className="w-4 h-4" />
                                                    )}
                                                </button>

                                                <button 
                                                    type="submit"
                                                    disabled={!input.trim() || isQuerying}
                                                    className="w-9 h-9 rounded-xl bg-gradient-to-r from-pink-600 to-pink-500 hover:from-pink-500 hover:to-pink-400 disabled:opacity-30 text-white transition-all flex items-center justify-center cursor-pointer disabled:cursor-not-allowed shadow-md shadow-pink-600/20 active:scale-95"
                                                    aria-label="Send query"
                                                >
                                                    {isQuerying ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <Send className="w-3.5 h-3.5" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </form>

                                </div>
                            </div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
