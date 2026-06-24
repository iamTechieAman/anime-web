"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Sparkles, Loader2, Search, ArrowLeft, Send, X, History } from "lucide-react";
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
}

const SUGGESTIONS = [
    { text: "Cyberpunk", desc: "Neon aesthetics, cybernetics & deep futures", emoji: "🌌", gradient: "from-indigo-600/20 to-purple-600/5 hover:border-indigo-500/50 hover:shadow-indigo-500/5" },
    { text: "Sad anime", desc: "Emotional stories and beautiful tearjerkers", emoji: "🌧️", gradient: "from-rose-600/20 to-pink-600/5 hover:border-rose-500/50 hover:shadow-rose-500/5" },
    { text: "Studio Ghibli", desc: "Magical adventures & cozy comforting aesthetics", emoji: "🌳", gradient: "from-emerald-600/20 to-teal-600/5 hover:border-emerald-500/50 hover:shadow-emerald-500/5" },
    { text: "Mind bending", desc: "Psychological thrillers, plot twists & mystery", emoji: "🧠", gradient: "from-blue-600/20 to-cyan-600/5 hover:border-blue-500/50 hover:shadow-blue-500/5" },
    { text: "Kdrama", desc: "Acclaimed Korean romances & comforting comedies", emoji: "🇰🇷", gradient: "from-amber-600/20 to-accent-warm/5 hover:border-amber-500/50 hover:shadow-amber-500/5" },
    { text: "Hidden gems", desc: "Acclaimed but obscure films & series to discover", emoji: "💎", gradient: "from-violet-600/20 to-fuchsia-600/5 hover:border-violet-500/50 hover:shadow-violet-500/5" },
];

const MOODS = [
    { name: "Chill ☕", query: "cozy slow burn" },
    { name: "Hyped ⚡", query: "action hype adrenaline" },
    { name: "Melancholic 🌧️", query: "sad emotional tearjerker" },
    { name: "Adventurous 🗺️", query: "epic adventure fantasy journey" },
    { name: "Terrified 💀", query: "scary horror psychological suspense" },
    { name: "Intrigued 🧠", query: "mind bending thriller mystery" },
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
    const prompt = searchParams?.get("prompt") || "";

    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [history, setHistory] = useState<string[]>([]);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Cleanup interval on unmount
    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    const [isListening, setIsListening] = useState(false);
    
    const recognitionRef = useRef<any>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    
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
            }, 30);
        } else {
            timer = setTimeout(() => {
                setPlaceholderText(currentSentence.substring(0, charIndex + 1));
                setCharIndex(prev => prev + 1);
            }, 60);
        }

        if (!isDeleting && charIndex === currentSentence.length) {
            timer = setTimeout(() => setIsDeleting(true), 1500);
        } else if (isDeleting && charIndex === 0) {
            setIsDeleting(false);
            setPlaceholderIndex(prev => (prev + 1) % PLACEHOLDERS.length);
        }

        return () => clearTimeout(timer);
    }, [charIndex, isDeleting, placeholderIndex]);

    // Load recent history
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

    // Speech recognition setup
    useEffect(() => {
        if (typeof window !== "undefined") {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                const rec = new SpeechRecognition();
                rec.continuous = false;
                rec.interimResults = false;
                rec.lang = "en-US";

                rec.onstart = () => {
                    setIsListening(true);
                };
                rec.onend = () => {
                    setIsListening(false);
                };
                rec.onresult = (e: any) => {
                    const transcript = e.results[0][0].transcript;
                    if (transcript) {
                        setInput(transcript);
                        handleNewSearch(transcript);
                    }
                };

                rec.onerror = (event: any) => {
                    setIsListening(false);
                    console.error("[SpeechRecognition Error]", event.error);
                    if (event.error === 'not-allowed') {
                        toast.error("Microphone permission denied. Please allow mic access in your browser settings.");
                    } else if (event.error === 'no-speech') {
                        toast.error("No speech detected. Please speak clearly into your mic.");
                    } else if (event.error === 'network') {
                        toast.error("Voice search network error.");
                    } else {
                        toast.error(`Voice error: ${event.error}`);
                    }
                };
                recognitionRef.current = rec;
            }
        }
    }, [messages]);

    const toggleVoice = () => {
        if (!recognitionRef.current) {
            toast.error("Speech recognition is not supported in this browser.");
            return;
        }
        if (isListening) {
            recognitionRef.current.stop();
        } else {
            recognitionRef.current.start();
        }
    };

    const scrollToBottom = () => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    };

    // Auto scroll when message thread changes
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const savePromptToHistory = (promptText: string) => {
        setHistory(prev => {
            const updated = [promptText, ...prev.filter(p => p !== promptText)].slice(0, 10);
            localStorage.setItem("toonplayer_ai_prompt_history", JSON.stringify(updated));
            return updated;
        });
    };

    const clearHistory = () => {
        setHistory([]);
        localStorage.removeItem("toonplayer_ai_prompt_history");
        toast.success("AI search history cleared!");
    };

    const handleNewSearch = async (queryText: string) => {
        if (!queryText.trim()) return;

        // 1. Add user message
        const userMsgId = String(Date.now());
        const userMessage: Message = {
            id: userMsgId,
            role: "user",
            content: queryText
        };

        // 2. Add assistant message (loading state)
        const assistantMsgId = String(Date.now() + 1);
        const assistantMessage: Message = {
            id: assistantMsgId,
            role: "assistant",
            content: "",
            loading: true,
            loadingProgressText: "Deconstructing prompt context..."
        };

        // Context check: combine past messages for chat memory
        const pastUserPrompts = messages
            .filter(m => m.role === "user")
            .map(m => m.content);
        const combinedPrompt = [...pastUserPrompts, queryText].join(" ");

        // Append to state
        setMessages(prev => [...prev, userMessage, assistantMessage]);
        setInput(""); // Clear input

        // Save history
        savePromptToHistory(queryText);
        
        // Auto scroll
        setTimeout(scrollToBottom, 50);

        // Progress loading texts
        const progressSteps = [
            "Analyzing semantic intent...",
            "Retrieving TMDB genre mappings...",
            "Mapping query context keywords...",
            "Interrogating catalog databases...",
            "Hydrating poster references...",
            "Formatting recommendations..."
        ];
        
        let stepIdx = 0;
        intervalRef.current = setInterval(() => {
            if (stepIdx < progressSteps.length) {
                setMessages(prev => prev.map(m => {
                    if (m.id === assistantMsgId) {
                        return { ...m, loadingProgressText: progressSteps[stepIdx] };
                    }
                    return m;
                }));
                stepIdx++;
                scrollToBottom();
            }
        }, 700);

        try {
            const res = await axios.get("/api/discover", { params: { prompt: combinedPrompt } });
            const searchResults = res.data.results || [];

            if (intervalRef.current) clearInterval(intervalRef.current);

            setMessages(prev => prev.map(m => {
                if (m.id === assistantMsgId) {
                    return {
                        ...m,
                        loading: false,
                        content: searchResults.length > 0 
                            ? `Here are the top matches I discovered for "${queryText}":`
                            : `I couldn't find any recommendations matching "${queryText}". Try broadening your prompt or checking your spelling.`,
                        results: searchResults
                    };
                }
                return m;
            }));
            
            setTimeout(scrollToBottom, 200);

        } catch (err) {
            console.error("AI Discover search failed:", err);
            if (intervalRef.current) clearInterval(intervalRef.current);

            setMessages(prev => prev.map(m => {
                if (m.id === assistantMsgId) {
                    return {
                        ...m,
                        loading: false,
                        content: "I encountered an error querying the catalog indexes. Please try again."
                    };
                }
                return m;
            }));
            setTimeout(scrollToBottom, 200);
        }
    };

    // Load initial prompt from URL
    useEffect(() => {
        if (prompt && messages.length === 0) {
            handleNewSearch(prompt);
        }
    }, [prompt, messages.length]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleNewSearch(input);
    };

    const handleSuggestionClick = (text: string) => {
        handleNewSearch(text);
    };

    const handleClearChat = () => {
        setMessages([]);
        setInput("");
        router.replace("/discover", { scroll: false });
    };

    const handleMoodClick = (moodText: string, query: string) => {
        setInput(prev => {
            const trimmed = prev.trim();
            return trimmed ? `${trimmed} in a ${query} mood` : `${moodText} mood: ${query}`;
        });
        toast.success(`Appended mood: ${moodText}`);
    };

    return (
        <div className="flex-1 w-full bg-[#050505] pt-6 pb-12 px-4 md:px-8 flex flex-col min-h-[calc(100dvh-4rem)]">
            <div className="max-w-[1800px] mx-auto w-full flex-1 flex flex-col">
                
                {/* Header Row */}
                <div className="border-b border-white/5 pb-4 mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-500">
                            <Sparkles className="w-5 h-5 animate-pulse" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-white tracking-tight font-sora">
                                AI Discovery <span className="text-xs bg-pink-500/15 text-pink-500 px-2 py-0.5 rounded-full border border-pink-500/20 uppercase tracking-widest font-black font-mono ml-2">Console</span>
                            </h1>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Conversational Movie & Anime Agent</p>
                        </div>
                    </div>
                    
                    {messages.length > 0 && (
                        <button 
                            onClick={handleClearChat}
                            className="flex items-center gap-2 text-zinc-400 hover:text-white font-black transition-colors text-[10px] uppercase tracking-wider py-2 px-4 bg-white/5 border border-white/5 hover:border-white/10 rounded-xl cursor-pointer"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" /> Clear Console
                        </button>
                    )}
                </div>

                <AnimatePresence mode="wait">
                    {messages.length === 0 ? (
                        // Welcome Screen Dashboard
                        <motion.div 
                            key="welcome-dashboard"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="max-w-4xl mx-auto w-full py-6 flex-1 flex flex-col justify-center space-y-8"
                        >
                            <div className="text-center space-y-3">
                                <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter leading-tight font-sora">
                                    What are you in the <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-purple-500">mood to stream?</span>
                                </h2>
                                <p className="text-zinc-400 font-semibold text-sm max-w-xl mx-auto">
                                    Talk to ToonPlayer AI. Ask for genres, vibes, years, or descriptions. I will scan movie platforms and anime servers to find matches.
                                </p>
                            </div>

                            {/* Search bar console */}
                            <div className="max-w-2xl mx-auto w-full">
                                <form onSubmit={handleSubmit} className="relative">
                                    <div className="relative flex items-center bg-[#12131A] border border-white/5 focus-within:border-pink-500/40 focus-within:shadow-[0_0_24px_rgba(236,72,153,0.15)] rounded-2xl p-2 transition-all duration-[250ms] backdrop-blur-md">
                                        <input 
                                            type="text"
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            placeholder={placeholderText || "Describe your ideal watch..."}
                                            className="w-full bg-transparent pl-4 pr-24 py-3.5 text-sm md:text-base text-white outline-none focus-visible:ring-2 focus-visible:ring-pink-500 rounded-2xl placeholder-white/20 font-bold"
                                        />
                                        <div className="absolute right-2 flex items-center gap-1.5">
                                            {/* Mic icon voice search */}
                                            <button
                                                type="button"
                                                onClick={toggleVoice}
                                                className={`p-2.5 rounded-xl border transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-pink-500 ${
                                                    isListening 
                                                        ? "bg-red-500/15 border-red-500/30 text-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.3)]" 
                                                        : "bg-white/5 border-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                                                }`}
                                                title="Voice Search"
                                                aria-label="Voice Search"
                                            >
                                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                                                    <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 19v4M8 23h8" />
                                                </svg>
                                            </button>
                                            <button 
                                                type="submit"
                                                disabled={!input.trim()}
                                                className="w-10 h-10 rounded-xl bg-pink-600 hover:bg-pink-500 disabled:opacity-30 text-white transition-all flex items-center justify-center cursor-pointer disabled:cursor-not-allowed shadow-lg shadow-pink-600/15 outline-none focus-visible:ring-2 focus-visible:ring-white"
                                                aria-label="Send Query"
                                            >
                                                <Send className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </form>
                                
                                {/* Mood tags horizontal selector */}
                                <div className="mt-4 flex flex-wrap items-center gap-2 justify-center">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 mr-1">Vibe:</span>
                                    {MOODS.map(mood => (
                                        <button
                                            key={mood.name}
                                            onClick={() => handleMoodClick(mood.name, mood.query)}
                                            className="text-[10px] font-bold text-zinc-400 bg-white/5 hover:bg-white/10 px-3 py-1 rounded-full border border-white/5 hover:border-pink-500/20 hover:text-white transition-all cursor-pointer"
                                        >
                                            {mood.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Prompt cards grid */}
                            <div className="space-y-4 pt-4">
                                <span className="text-xs font-black text-zinc-500 uppercase tracking-widest block text-center">Prompt Suggestions</span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto w-full">
                                    {SUGGESTIONS.map((sug) => (
                                        <button
                                            key={sug.text}
                                            onClick={() => handleSuggestionClick(sug.text)}
                                            className={`group p-5 rounded-2xl border border-white/5 backdrop-blur-md text-left flex flex-col justify-between transition-all duration-[250ms] bg-gradient-to-br ${sug.gradient} hover:shadow-lg hover:-translate-y-0.5 cursor-pointer`}
                                        >
                                            <div className="flex items-center justify-between w-full mb-3">
                                                <span className="text-2xl">{sug.emoji}</span>
                                                <Sparkles className="w-4 h-4 text-pink-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-black text-white tracking-tight">{sug.text}</h3>
                                                <p className="text-[11px] text-zinc-400 mt-1 font-semibold group-hover:text-white/80 transition-colors line-clamp-2 leading-relaxed">{sug.desc}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Recent Searches / History */}
                            {history.length > 0 && (
                                <div className="max-w-2xl mx-auto w-full border-t border-white/5 pt-6 space-y-3">
                                    <div className="flex items-center justify-between text-zinc-500">
                                        <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                            <History className="w-3.5 h-3.5" /> Recent Prompts
                                        </span>
                                        <button 
                                            onClick={clearHistory}
                                            className="text-[9px] uppercase font-black hover:text-white transition-colors cursor-pointer"
                                        >
                                            Clear History
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {history.map((hPrompt, i) => (
                                            <button
                                                key={`${hPrompt}-${i}`}
                                                onClick={() => handleSuggestionClick(hPrompt)}
                                                className="text-xs font-bold text-zinc-400 bg-[#12131A] hover:bg-white/5 border border-white/5 rounded-xl px-3.5 py-2 hover:text-white transition-all cursor-pointer truncate max-w-[200px]"
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
                        <div className="flex-1 flex flex-col justify-between max-w-4xl mx-auto w-full space-y-6 pb-24">
                            
                            {/* Scrollable messages history container */}
                            <div className="flex-1 flex flex-col space-y-8">
                                {messages.map((msg) => (
                                    <div key={msg.id} className="w-full flex flex-col">
                                        {msg.role === "user" ? (
                                            /* User Prompt Bubble */
                                            <div className="flex justify-end w-full">
                                                <div className="max-w-[85%] bg-gradient-to-tr from-pink-600 to-purple-600 text-white rounded-2xl rounded-tr-sm px-5 py-3.5 shadow-xl">
                                                    <p className="text-sm md:text-base font-bold leading-relaxed">{msg.content}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            /* Assistant Response Bubble */
                                            <div className="flex flex-col space-y-4 w-full">
                                                <div className="flex items-center gap-2 text-zinc-500 border-b border-white/5 pb-2">
                                                    <div className="w-6 h-6 rounded-full bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-[10px] font-black text-pink-500">
                                                        AI
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase tracking-widest">ToonPlayer Assistant Recommendation</span>
                                                </div>
                                                
                                                {msg.loading ? (
                                                    /* Dynamic Loading Progress logs */
                                                    <div className="bg-[#12131A]/40 border border-white/5 rounded-2xl p-6 flex items-center gap-4 max-w-md shadow-md animate-pulse">
                                                        <Loader2 className="w-5 h-5 text-pink-500 animate-spin" />
                                                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{msg.loadingProgressText}</span>
                                                    </div>
                                                ) : (
                                                    /* Loaded card results list */
                                                    <div className="space-y-6">
                                                        <p className="text-sm text-zinc-300 font-semibold leading-relaxed">{msg.content}</p>
                                                        {msg.results && msg.results.length > 0 ? (
                                                            <div className="pt-2 animate-in fade-in slide-in-from-bottom-2 duration-[250ms]">
                                                                <MovieGrid items={msg.results} />
                                                            </div>
                                                        ) : (
                                                            /* Empty Results */
                                                            !msg.loading && (
                                                                <div className="py-12 bg-[#12131A]/20 border border-white/5 rounded-2xl flex flex-col items-center justify-center text-center opacity-65">
                                                                    <Search className="w-10 h-10 text-zinc-600 mb-3" />
                                                                    <h4 className="text-sm font-bold text-white">No items found matching the prompt</h4>
                                                                    <p className="text-xs text-zinc-500 mt-1 max-w-xs leading-relaxed">Try typing general keywords, simpler phrases, or select a different mood pill.</p>
                                                                </div>
                                                            )
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
                            <div className="sticky bottom-0 bg-[#050505]/95 backdrop-blur-md border-t border-white/5 py-4 z-20">
                                <div className="flex flex-col gap-3">
                                    
                                    {/* Mood tags inline while in chat view */}
                                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center shrink-0">Add vibe:</span>
                                        {MOODS.map(mood => (
                                            <button
                                                key={mood.name}
                                                onClick={() => handleMoodClick(mood.name, mood.query)}
                                                className="text-[10px] font-bold text-zinc-400 bg-[#12131A] hover:bg-white/5 px-2.5 py-1 rounded-full border border-white/5 hover:border-pink-500/20 hover:text-white transition-all shrink-0 cursor-pointer"
                                            >
                                                {mood.name}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Chat Form */}
                                    <form onSubmit={handleSubmit} className="relative">
                                        <div className="relative flex items-center bg-[#12131A] border border-white/5 focus-within:border-pink-500/40 focus-within:shadow-[0_0_24px_rgba(236,72,153,0.15)] rounded-2xl p-2 transition-all duration-[250ms] backdrop-blur-md">
                                            <input 
                                                type="text"
                                                value={input}
                                                onChange={(e) => setInput(e.target.value)}
                                                placeholder={placeholderText || "Send message to AI..."}
                                                className="w-full bg-transparent pl-4 pr-24 py-3 text-sm md:text-base text-white outline-none placeholder-white/20 font-bold"
                                            />
                                            <div className="absolute right-2 flex items-center gap-1.5">
                                                {/* Voice search button */}
                                                <button
                                                    type="button"
                                                    onClick={toggleVoice}
                                                    className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                                                        isListening 
                                                            ? "bg-red-500/15 border-red-500/30 text-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.3)]" 
                                                            : "bg-white/5 border-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                                                    }`}
                                                    title="Voice Search"
                                                >
                                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                                                        <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 19v4M8 23h8" />
                                                    </svg>
                                                </button>
                                                <button 
                                                    type="submit"
                                                    disabled={!input.trim()}
                                                    className="w-10 h-10 rounded-xl bg-pink-600 hover:bg-pink-500 disabled:opacity-30 text-white transition-all flex items-center justify-center cursor-pointer disabled:cursor-not-allowed shadow-lg shadow-pink-600/15"
                                                >
                                                    <Send className="w-4 h-4" />
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
