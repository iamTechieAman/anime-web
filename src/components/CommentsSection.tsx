"use client";

import { useState, useEffect, memo } from "react";
import { MessageSquare, ThumbsUp, ThumbsDown, Send, EyeOff, AlertCircle, Image as ImageIcon, Smile, HelpCircle, X } from "lucide-react";
import toast from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import { useUserStore } from "@/store/userStore";

interface Comment {
    id: string;
    username: string;
    avatar: string;
    content: string;
    timestamp: string;
    likes: number;
    dislikes: number;
    userLiked?: boolean;
    userDisliked?: boolean;
    isSpoiler?: boolean;
    showSpoiler?: boolean;
    gifUrl?: string;
}

const DEFAULT_MOCK_COMMENTS: Record<string, string[]> = {
    anime: [
        "This episode was absolutely stunning! The animation during the **fight scenes** is cinema-grade. 🔥",
        "Can't believe they left us on such a cliffhanger. Next week can't come soon enough!",
        "The sound design and the emotional track in the background made me tear up. `Masterpiece` status.",
        "Honestly, the pacing is much better than the manga. Studio did a fantastic job here."
    ],
    movie: [
        "One of the best movies I have watched this year. The cinematography is *incredible*.",
        "The plot twist in the second half caught me completely off guard. Highly recommended!",
        "A beautiful cinematic journey. ToonPlayer streaming quality made it look even better.",
        "Great movie, but the ending leaves a lot of questions. What do you all think?"
    ]
};

const POPULAR_GIFS = [
    { name: "Shocked Luffy", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3hmd3o1NmgzaHByZHA3c3lhNnRkMnB3cnQ2ZWF4ZW1iaWNrdWppOSZlcD12MV9pbnRlcm5hbF9naWZfYnlfZ2lmcyZjdD1n/C3brYLms1qFr2/giphy.gif" },
    { name: "Let's Go Goku", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMzA2OHR6aWdtNWQ5ZzNidjF5MmFicGswczdzdmZrcHA3bzdhOW9tYyZlcD12MV9pbnRlcm5hbF9naWZfYnlfZ2lmcyZjdD1n/11ym5gmgTYzpNS/giphy.gif" },
    { name: "Popcorn Watching", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3N2c2t0OXJmd2E3bW4zdnl3MHptOWl6Y3R5MHpxdWFtNHE0NDlhMiZlcD12MV9pbnRlcm5hbF9naWZfYnlfZ2lmcyZjdD1n/hVTouqNm673gI/giphy.gif" },
    { name: "Crying Anime", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYnJqZWZ2cHptNHlzbDJ4ZXk4cnA1d252OXptMzkxYXJkNGs5ZW9hOSZlcD12MV9pbnRlcm5hbF9naWZfYnlfZ2lmcyZjdD1n/8TJK6prRCagW4/giphy.gif" },
    { name: "Applause", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNmtpYTllZGszbmJ1eWozNXZrbzYwdGFtMTNqZ2swOHpyaDFrNGg5YiZlcD12MV9pbnRlcm5hbF9naWZfYnlfZ2lmcyZjdD1n/5Govl6GoC2xG0/giphy.gif" },
    { name: "Mind Blown", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZ3phNTVkOG5uMXd1OHU5azNzZXpyczJ2cm90cmNndTN0aG4ydWFqMCZlcD12MV9pbnRlcm5hbF9naWZfYnlfZ2lmcyZjdD1n/xT0xeJpNRMB4wEsJe0/giphy.gif" }
];

const USERNAME_POOL = [
    "OtakuDragon", "CrunchyVibe", "SlayerX", "LuffyG5", "HarajukuDream",
    "CinephilePro", "PopcornSlayer", "ShadowHokage", "ZoroLost", "MidnightAnime"
];

const AVATAR_COLOR_POOL = [
    "bg-purple-600", "bg-indigo-600", "bg-cyan-600", "bg-emerald-600",
    "bg-rose-600", "bg-amber-600", "bg-fuchsia-600", "bg-sky-600"
];

const CommentsSection = memo(function CommentsSection({ contentId, category = "anime" }: { contentId: string; category?: "anime" | "movie" | "tv" }) {
    const { isSignedIn } = useUser();
    const { profiles, activeProfileId } = useUserStore();
    const activeProfile = profiles.find(p => p.id === activeProfileId);
    const canComment = !!activeProfile;

    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [isSpoilerInput, setIsSpoilerInput] = useState(false);
    
    // GIF picker states
    const [showGifPicker, setShowGifPicker] = useState(false);
    const [selectedGif, setSelectedGif] = useState<string | null>(null);
    const [searchGifQuery, setSearchGifQuery] = useState("");
    const [tenorGifs, setTenorGifs] = useState<any[]>([]);
    const [isFetchingGifs, setIsFetchingGifs] = useState(false);

    useEffect(() => {
        if (!showGifPicker || !searchGifQuery.trim()) {
            setTenorGifs([]);
            return;
        }
        const timer = setTimeout(async () => {
            setIsFetchingGifs(true);
            try {
                // Using Tenor's public API key or a robust fallback search
                const res = await fetch(`https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(searchGifQuery)}&key=LIVDSRZULELA&client_key=toonplayer&limit=8`);
                const data = await res.json();
                if (data.results && data.results.length > 0) {
                    const gifs = data.results.map((g: any) => ({
                        name: g.content_description || "GIF",
                        url: g.media_formats?.gif?.url || g.media_formats?.tinygif?.url
                    })).filter((g: any) => !!g.url);
                    setTenorGifs(gifs);
                } else {
                    setTenorGifs([]);
                }
            } catch (e) {
                console.error("GIF fetch error", e);
                setTenorGifs([]);
            } finally {
                setIsFetchingGifs(false);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchGifQuery, showGifPicker]);

    const [isMounted, setIsMounted] = useState(false);

    // Load comments from localStorage or initialize with mock data
    useEffect(() => {
        setIsMounted(true);
        const stored = localStorage.getItem(`comments_${contentId}`);
        if (stored) {
            try {
                setComments(JSON.parse(stored));
                return;
            } catch (e) {
                console.error("Failed to parse stored comments", e);
            }
        }

        // Initialize with realistic mock comments
        const mockTexts = category === "movie" ? DEFAULT_MOCK_COMMENTS.movie : DEFAULT_MOCK_COMMENTS.anime;
        const initialComments: Comment[] = mockTexts.map((text, idx) => {
            const timeAgo = idx === 0 ? "2 hours ago" : idx === 1 ? "6 hours ago" : idx === 2 ? "1 day ago" : "3 days ago";
            const username = USERNAME_POOL[idx % USERNAME_POOL.length];
            const avatar = `${AVATAR_COLOR_POOL[idx % AVATAR_COLOR_POOL.length]} text-white`;
            
            return {
                id: `mock-${idx}`,
                username,
                avatar,
                content: text,
                timestamp: timeAgo,
                likes: Math.floor(Math.random() * 45) + 5,
                dislikes: Math.floor(Math.random() * 5),
                isSpoiler: idx === 1,
                showSpoiler: false
            };
        });
        setComments(initialComments);
        localStorage.setItem(`comments_${contentId}`, JSON.stringify(initialComments));
    }, [contentId, category]);

    const saveComments = (updated: Comment[]) => {
        setComments(updated);
        localStorage.setItem(`comments_${contentId}`, JSON.stringify(updated));
    };

    const handlePostComment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() && !selectedGif) return;

        const comment: Comment = {
            id: `user-${Date.now()}`,
            username: activeProfile?.name || "You",
            avatar: activeProfile?.avatar || "bg-accent text-black font-black",
            content: newComment.trim(),
            timestamp: "Just now",
            likes: 0,
            dislikes: 0,
            isSpoiler: isSpoilerInput,
            showSpoiler: false,
            gifUrl: selectedGif || undefined
        };

        const updated = [comment, ...comments];
        saveComments(updated);
        setNewComment("");
        setSelectedGif(null);
        setIsSpoilerInput(false);
        toast.success("Comment posted successfully!");
    };

    const handleLike = (id: string) => {
        if (!canComment) {
            toast.error("Please select a profile to like comments.");
            return;
        }
        const updated = comments.map(c => {
            if (c.id !== id) return c;
            
            let likesDiff = 0;
            let dislikesDiff = 0;
            let userLiked = c.userLiked;
            let userDisliked = c.userDisliked;

            if (userLiked) {
                likesDiff = -1;
                userLiked = false;
            } else {
                likesDiff = 1;
                userLiked = true;
                if (userDisliked) {
                    dislikesDiff = -1;
                    userDisliked = false;
                }
            }

            return {
                ...c,
                likes: c.likes + likesDiff,
                dislikes: c.dislikes + dislikesDiff,
                userLiked,
                userDisliked
            };
        });
        saveComments(updated);
    };

    const handleDislike = (id: string) => {
        if (!canComment) {
            toast.error("Please select a profile to dislike comments.");
            return;
        }
        const updated = comments.map(c => {
            if (c.id !== id) return c;

            let likesDiff = 0;
            let dislikesDiff = 0;
            let userLiked = c.userLiked;
            let userDisliked = c.userDisliked;

            if (userDisliked) {
                dislikesDiff = -1;
                userDisliked = false;
            } else {
                dislikesDiff = 1;
                userDisliked = true;
                if (userLiked) {
                    likesDiff = -1;
                    userLiked = false;
                }
            }

            return {
                ...c,
                likes: c.likes + likesDiff,
                dislikes: c.dislikes + dislikesDiff,
                userLiked,
                userDisliked
            };
        });
        saveComments(updated);
    };

    const toggleRevealSpoiler = (id: string) => {
        const updated = comments.map(c => {
            if (c.id !== id) return c;
            return { ...c, showSpoiler: !c.showSpoiler };
        });
        saveComments(updated);
    };

    // Safe Markdown Parser (Converts bold, italics, inline code, and URLs safely)
    const renderMarkdown = (text: string) => {
        if (!text) return "";
        let safe = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

        // bold **text**
        safe = safe.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // italic *text*
        safe = safe.replace(/\*(.*?)\*/g, '<em>$1</em>');
        // inline code `code`
        safe = safe.replace(/`(.*?)`/g, '<code class="bg-black/30 border border-white/5 px-1 py-0.5 rounded text-[11px] font-mono text-pink-400">$1</code>');
        // linebreaks
        safe = safe.replace(/\n/g, '<br/>');

        return <span dangerouslySetInnerHTML={{ __html: safe }} />;
    };

    if (!isMounted) return null;

    return (
        <div className="relative isolate bg-[#111113] rounded-2xl border border-border-color p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border-color">
                <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-accent" />
                    <h3 className="font-bold text-white text-lg font-sora">Discussion Chatroom</h3>
                </div>
                <span className="text-xs text-[var(--text-muted)] font-semibold bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                    {comments.length} Comment{comments.length !== 1 ? 's' : ''}
                </span>
            </div>

            {/* Comment Post Form */}
            <form onSubmit={handlePostComment} className="space-y-3 relative">
                {!canComment && (
                    <div className="flex items-center gap-3 p-4 mb-2 bg-accent-warm/10 border border-accent-warm/20 rounded-xl text-accent-warm text-xs font-semibold">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>Registered members only. Please sign in or switch profiles to write comments.</span>
                    </div>
                )}
                <div className="relative">
                    <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder={canComment ? "Write a comment... Markdown is supported (*italic*, **bold**, `code`)" : "Please sign in or switch profiles to write comments."}
                        rows={3}
                        disabled={!canComment}
                        className="w-full bg-bg-main text-white text-sm placeholder-[var(--text-muted)] border border-border-color rounded-xl p-4 outline-none focus:border-accent/50 transition-colors resize-none font-inter leading-relaxed disabled:opacity-40 disabled:cursor-not-allowed"
                    />
                    
                    {selectedGif && (
                        <div className="absolute bottom-4 left-4 flex items-center gap-2 p-1.5 bg-black/60 border border-white/10 rounded-xl">
                            <Image src={selectedGif} alt="selected-gif" unoptimized width={100} height={56} className="h-14 w-auto rounded-lg object-contain" />
                            <button 
                                type="button" 
                                onClick={() => setSelectedGif(null)}
                                className="p-1 bg-white/10 hover:bg-white/20 rounded-full text-white"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                </div>
                
                <div className="flex items-center justify-between relative">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setIsSpoilerInput(!isSpoilerInput)}
                            disabled={!canComment}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                                isSpoilerInput
                                    ? "bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20"
                                    : "bg-white/5 text-[var(--text-muted)] border-border-color hover:text-white hover:bg-white/10"
                            }`}
                        >
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>Tag Spoiler</span>
                        </button>
 
                        <button
                            type="button"
                            onClick={() => setShowGifPicker(!showGifPicker)}
                            disabled={!canComment}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-white/5 text-[var(--text-muted)] border-border-color hover:text-white hover:bg-white/10 text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <ImageIcon className="w-3.5 h-3.5 text-accent-warm" />
                            <span>Add GIF</span>
                        </button>
                    </div>
 
                    <button
                        type="submit"
                        disabled={!canComment || (!newComment.trim() && !selectedGif)}
                        className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-accent to-accent-warm hover:-translate-y-[1px] hover:scale-[1.02] text-white font-bold rounded-xl text-sm transition-all hover:shadow-[0_0_12px_var(--accent-glow)] active:scale-95 disabled:opacity-50 disabled:pointer-events-none hover:opacity-95"
                    >
                        <span>Comment</span>
                        <Send className="w-3.5 h-3.5" />
                    </button>

                    {/* GIF Picker Popup Panel */}
                    {showGifPicker && (
                        <div className="absolute bottom-full left-0 mb-2 w-80 sm:w-96 bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl p-3 flex flex-col z-50">
                            <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
                                <span className="text-[10px] font-black uppercase text-zinc-500">GIF Search</span>
                                <button type="button" onClick={() => setShowGifPicker(false)} className="text-zinc-500 hover:text-white"><X className="w-3.5 h-3.5" /></button>
                            </div>
                            <input
                                type="text"
                                placeholder="Search Tenor..."
                                value={searchGifQuery}
                                onChange={(e) => setSearchGifQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                    }
                                }}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs mb-3 focus:border-accent outline-none transition-colors"
                            />
                            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                                {isFetchingGifs ? (
                                    <div className="col-span-2 text-center text-xs text-zinc-500 py-4">Loading...</div>
                                ) : (searchGifQuery.trim() && tenorGifs.length === 0) ? (
                                    <div className="col-span-2 text-center text-xs text-zinc-500 py-6 font-semibold">No GIFs found for "{searchGifQuery}"</div>
                                ) : (
                                    (tenorGifs.length > 0 ? tenorGifs : POPULAR_GIFS).map((gif, i) => (
                                        <button
                                            key={`${gif.name}-${i}`}
                                            type="button"
                                            onClick={() => { setSelectedGif(gif.url); setShowGifPicker(false); setSearchGifQuery(""); }}
                                            className="relative h-20 rounded-xl overflow-hidden border border-white/5 hover:border-accent transition-all bg-black cursor-pointer group"
                                        >
                                            <Image src={gif.url} alt={gif.name} unoptimized fill sizes="150px" className="object-cover" />
                                            <div className="absolute inset-0 bg-black/40 flex items-end p-1 text-[9px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity truncate">{gif.name}</div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </form>

            {/* Comments List */}
            <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                {comments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center text-[var(--text-muted)]">
                        <AlertCircle className="w-8 h-8 opacity-40 mb-2" />
                        <p className="text-sm font-medium">No comments yet. Start the conversation!</p>
                    </div>
                ) : (
                    comments.map((comment) => (
                        <div key={comment.id} className="group/item flex gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.02] hover:border-white/[0.04] hover:bg-white/[0.04] transition-all">
                            {/* Avatar */}
                            {comment.avatar && (comment.avatar.startsWith('http') || comment.avatar.startsWith('data:')) ? (
                                <div className="relative w-9 h-9 rounded-full overflow-hidden shrink-0">
                                    <img src={comment.avatar} alt={comment.username} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                                </div>
                            ) : (
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-bold text-xs select-none ${comment.avatar || 'bg-accent text-black font-black'}`}>
                                    {comment.username.slice(0, 2).toUpperCase()}
                                </div>
                            )}

                            {/* Comment content */}
                            <div className="flex-1 min-w-0 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-bold text-white text-sm truncate font-sora">{comment.username}</span>
                                    <span className="text-[10px] text-[var(--text-muted)] font-semibold whitespace-nowrap">{comment.timestamp}</span>
                                </div>

                                {comment.isSpoiler && !comment.showSpoiler ? (
                                    <div 
                                        onClick={(e) => { e.preventDefault(); toggleRevealSpoiler(comment.id); }}
                                        className="bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-lg text-xs font-semibold cursor-pointer flex items-center justify-between transition-colors select-none"
                                    >
                                        <div className="flex items-center gap-2">
                                            <EyeOff className="w-3.5 h-3.5 text-red-400" />
                                            <span>Contains spoilers. Click to reveal.</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-[var(--text-main)] text-sm font-inter leading-relaxed break-words relative space-y-2">
                                        <div>{renderMarkdown(comment.content)}</div>
                                        {comment.gifUrl && (
                                            <div className="max-w-xs overflow-hidden rounded-xl border border-white/10 bg-black/20">
                                                <Image src={comment.gifUrl} alt="gif-response" unoptimized width={200} height={128} className="h-32 w-auto object-contain" />
                                            </div>
                                        )}
                                        {comment.isSpoiler && (
                                            <button 
                                                type="button"
                                                onClick={(e) => { e.preventDefault(); toggleRevealSpoiler(comment.id); }}
                                                className="absolute -top-4 right-0 text-[9px] font-bold text-red-400/80 hover:text-red-400 cursor-pointer bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20 select-none"
                                            >
                                                Hide Spoiler
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Reactions */}
                                <div className="flex items-center gap-4 pt-1">
                                    <button 
                                        type="button"
                                        onClick={(e) => { e.preventDefault(); handleLike(comment.id); }}
                                        className={`flex items-center gap-1.5 text-xs transition-colors hover:text-white ${comment.userLiked ? 'text-accent font-bold' : 'text-[var(--text-muted)]'}`}
                                    >
                                        <ThumbsUp className="w-3.5 h-3.5" />
                                        <span>{comment.likes}</span>
                                    </button>

                                    <button 
                                        type="button"
                                        onClick={(e) => { e.preventDefault(); handleDislike(comment.id); }}
                                        className={`flex items-center gap-1.5 text-xs transition-colors hover:text-white ${comment.userDisliked ? 'text-red-400 font-bold' : 'text-[var(--text-muted)]'}`}
                                    >
                                        <ThumbsDown className="w-3.5 h-3.5" />
                                        <span>{comment.dislikes}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
});

export default CommentsSection;
