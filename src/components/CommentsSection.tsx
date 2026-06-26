"use client";

import { useState, useEffect, memo, useRef } from "react";
import { 
    MessageSquare, ThumbsUp, ThumbsDown, Send, EyeOff, AlertCircle, 
    Image as ImageIcon, Smile, HelpCircle, X, Pin, Trash2, Edit2, 
    CornerDownRight, Check, AlertTriangle, Loader2 
} from "lucide-react";
import toast from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import { useUserStore } from "@/store/userStore";
import UserAvatar from "./UserAvatar";

interface Reply {
    id: string;
    profileId?: string;
    username: string;
    avatar: string;
    content: string;
    timestamp: number | string;
    likes: number;
    userLiked?: boolean;
    badge?: string;
}

interface Comment {
    id: string;
    profileId?: string;
    username: string;
    avatar: string;
    content: string;
    timestamp: number | string;
    likes: number;
    dislikes: number;
    userLiked?: boolean;
    userDisliked?: boolean;
    isSpoiler?: boolean;
    showSpoiler?: boolean;
    gifUrl?: string;
    replies?: Reply[];
    isPinned?: boolean;
    badge?: string;
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

const CommentsSection = memo(function CommentsSection({ 
    contentId, 
    category = "anime",
    episodeId,
    seasonId,
    slug 
}: { 
    contentId: string; 
    category?: "anime" | "movie" | "tv";
    episodeId?: string | number;
    seasonId?: string | number;
    slug?: string;
}) {
    const { isSignedIn } = useUser();
    const { profiles, activeProfileId } = useUserStore();
    const activeProfile = profiles.find(p => p.id === activeProfileId);
    const canComment = !!activeProfile;

    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [isSpoilerInput, setIsSpoilerInput] = useState(false);
    
    // Sort & filter states
    const [sortBy, setSortBy] = useState<"Newest" | "Most Liked" | "Top">("Top");
    const [isLoading, setIsLoading] = useState(true);

    // Edit states
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState("");
    const [editingReplyId, setEditingReplyId] = useState<{ commentId: string; replyId: string } | null>(null);
    const [editingReplyText, setEditingReplyText] = useState("");

    // Reply states
    const [replyingCommentId, setReplyingCommentId] = useState<string | null>(null);
    const [newReplyText, setNewReplyText] = useState("");

    // Anti-spam states
    const [lastPostedTime, setLastPostedTime] = useState<number>(0);
    const [lastPostedText, setLastPostedText] = useState<string>("");

    // Live typing simulation state
    const [typingUser, setTypingUser] = useState<string | null>(null);

    // GIF picker states
    const [showGifPicker, setShowGifPicker] = useState(false);
    const [selectedGif, setSelectedGif] = useState<string | null>(null);
    const [searchGifQuery, setSearchGifQuery] = useState("");
    const [tenorGifs, setTenorGifs] = useState<any[]>([]);
    const [isFetchingGifs, setIsFetchingGifs] = useState(false);

    const [isMounted, setIsMounted] = useState(false);

    // Formulate unique storage key based on available show context
    const getStorageKey = () => {
        let key = `comments_${contentId}`;
        if (episodeId) key += `_ep${episodeId}`;
        if (seasonId) key += `_se${seasonId}`;
        if (slug) key += `_${slug}`;
        return key;
    };

    // Live typing simulation
    useEffect(() => {
        if (!isMounted) return;

        let typingTimeout: NodeJS.Timeout | null = null;

        const interval = setInterval(() => {
            if (Math.random() > 0.4) return; // 40% chance of trigger
            const randomUser = USERNAME_POOL[Math.floor(Math.random() * USERNAME_POOL.length)];
            setTypingUser(randomUser);

            typingTimeout = setTimeout(() => {
                setTypingUser(null);

                // 25% chance to post a simulated comment to keep discussion active
                if (Math.random() < 0.25) {
                    const mockTexts = category === "movie" ? DEFAULT_MOCK_COMMENTS.movie : DEFAULT_MOCK_COMMENTS.anime;
                    const randomText = mockTexts[Math.floor(Math.random() * mockTexts.length)];
                    
                    const newMockComment: Comment = {
                        id: `simulated-${Date.now()}`,
                        username: randomUser,
                        avatar: `${AVATAR_COLOR_POOL[Math.floor(Math.random() * AVATAR_COLOR_POOL.length)]} text-white`,
                        content: randomText,
                        timestamp: Date.now(),
                        likes: Math.floor(Math.random() * 4) + 1,
                        dislikes: 0,
                        badge: "Member"
                    };

                    setComments(prev => {
                        const updated = [newMockComment, ...prev];
                        localStorage.setItem(getStorageKey(), JSON.stringify(updated));
                        return updated;
                    });
                }
            }, 3000);
        }, 40000);

        return () => {
            clearInterval(interval);
            if (typingTimeout) clearTimeout(typingTimeout);
        };
    }, [isMounted, contentId, episodeId, seasonId, slug]);

    // Fetch Tenor GIFs
    useEffect(() => {
        if (!showGifPicker || !searchGifQuery.trim()) {
            setTenorGifs([]);
            return;
        }
        const timer = setTimeout(async () => {
            setIsFetchingGifs(true);
            try {
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

    // Load comments on mount/context change with shimmer loading simulation
    useEffect(() => {
        setIsMounted(true);
        setIsLoading(true);

        const storageKey = getStorageKey();
        const stored = localStorage.getItem(storageKey);
        
        let loadedComments: Comment[] = [];
        if (stored) {
            try {
                loadedComments = JSON.parse(stored);
            } catch (e) {
                console.error("Failed to parse stored comments", e);
            }
        } else {
            // Seed mock comments + pinned welcome message
            const adminComment: Comment = {
                id: "admin-welcome",
                username: "ToonPlayer Moderator",
                avatar: "bg-red-600 text-white font-black border border-red-500",
                content: "Welcome to the **ToonPlayer Premium Discussion**! 🎉 Feel free to share your thoughts, theories, and reviews. \n\n⚠️ **Quick Rules:**\n- Please tag spoilers using the **Tag Spoiler** button.\n- Keep the discussion respectful and hate-free.\n- Enjoy streaming!",
                timestamp: Date.now() - 3600000 * 24, // 1 day ago
                likes: 42,
                dislikes: 0,
                isPinned: true,
                badge: "Admin",
                replies: []
            };

            const mockTexts = category === "movie" ? DEFAULT_MOCK_COMMENTS.movie : DEFAULT_MOCK_COMMENTS.anime;
            const initialComments: Comment[] = mockTexts.map((text, idx) => {
                const username = USERNAME_POOL[idx % USERNAME_POOL.length];
                const avatar = `${AVATAR_COLOR_POOL[idx % AVATAR_COLOR_POOL.length]} text-white`;
                
                return {
                    id: `mock-${idx}`,
                    username,
                    avatar,
                    content: text,
                    timestamp: Date.now() - (idx + 1) * 3600000 * 3, // spaced hours ago
                    likes: Math.floor(Math.random() * 45) + 5,
                    dislikes: Math.floor(Math.random() * 5),
                    isSpoiler: idx === 1,
                    showSpoiler: false,
                    badge: idx === 0 ? "Pro" : "Member",
                    replies: []
                };
            });

            loadedComments = [adminComment, ...initialComments];
            localStorage.setItem(storageKey, JSON.stringify(loadedComments));
        }

        // 600ms artificial database loading simulation for premium feel
        const timer = setTimeout(() => {
            setComments(loadedComments);
            setIsLoading(false);
        }, 600);

        return () => clearTimeout(timer);
    }, [contentId, episodeId, seasonId, slug]);

    const saveComments = (updated: Comment[]) => {
        setComments(updated);
        localStorage.setItem(getStorageKey(), JSON.stringify(updated));
    };

    const getActiveBadge = () => {
        if (!activeProfile) return undefined;
        if (activeProfile.id === "profile-kids") return "Kids";
        if (activeProfile.id === "profile-guest") return "Guest";
        return activeProfile.theme === "red" ? "Admin" : "Pro";
    };

    const handlePostComment = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedText = newComment.trim();
        if (!trimmedText && !selectedGif) return;

        // Anti-spam checks
        if (Date.now() - lastPostedTime < 3000) {
            toast.error("Slow down! Please wait 3 seconds before commenting again.");
            return;
        }
        if (trimmedText === lastPostedText) {
            toast.error("Duplicate comment detected! Please post something else.");
            return;
        }
        const isDuplicate = comments.some(c => 
            c.content.trim() === trimmedText && 
            (c.profileId === activeProfile?.id || c.username === (activeProfile?.name || "You"))
        );
        if (isDuplicate) {
            toast.error("Duplicate comment detected! Please post something else.");
            return;
        }

        const comment: Comment = {
            id: `user-${Date.now()}`,
            profileId: activeProfile?.id,
            username: activeProfile?.name || "You",
            avatar: activeProfile?.avatar || "bg-accent text-black font-black",
            content: trimmedText,
            timestamp: Date.now(),
            likes: 0,
            dislikes: 0,
            isSpoiler: isSpoilerInput,
            showSpoiler: false,
            gifUrl: selectedGif || undefined,
            badge: getActiveBadge(),
            replies: []
        };

        const updated = [comment, ...comments];
        saveComments(updated);
        
        setNewComment("");
        setSelectedGif(null);
        setIsSpoilerInput(false);
        setLastPostedTime(Date.now());
        setLastPostedText(trimmedText);
        
        toast.success("Comment posted!");
    };

    const handlePostReply = (commentId: string) => {
        const trimmedText = newReplyText.trim();
        if (!trimmedText) return;

        const targetComment = comments.find(c => c.id === commentId);
        const isReplyDuplicate = targetComment?.replies?.some(r => 
            r.content.trim() === trimmedText && 
            (r.profileId === activeProfile?.id || r.username === (activeProfile?.name || "You"))
        );
        if (isReplyDuplicate) {
            toast.error("Duplicate reply detected! Please post something else.");
            return;
        }

        const reply: Reply = {
            id: `reply-${Date.now()}`,
            profileId: activeProfile?.id,
            username: activeProfile?.name || "You",
            avatar: activeProfile?.avatar || "bg-accent text-black font-black",
            content: trimmedText,
            timestamp: Date.now(),
            likes: 0,
            badge: getActiveBadge()
        };

        const updated = comments.map(c => {
            if (c.id !== commentId) return c;
            return {
                ...c,
                replies: [...(c.replies || []), reply]
            };
        });

        saveComments(updated);
        setNewReplyText("");
        setReplyingCommentId(null);
        toast.success("Reply posted!");
    };

    const handleEditCommentSubmit = (id: string) => {
        if (!editingText.trim()) return;
        const updated = comments.map(c => {
            if (c.id !== id) return c;
            return { ...c, content: editingText.trim() };
        });
        saveComments(updated);
        setEditingCommentId(null);
        setEditingText("");
        toast.success("Comment updated!");
    };

    const handleEditReplySubmit = (commentId: string, replyId: string) => {
        if (!editingReplyText.trim()) return;
        const updated = comments.map(c => {
            if (c.id !== commentId) return c;
            return {
                ...c,
                replies: (c.replies || []).map(r => 
                    r.id === replyId ? { ...r, content: editingReplyText.trim() } : r
                )
            };
        });
        saveComments(updated);
        setEditingReplyId(null);
        setEditingReplyText("");
        toast.success("Reply updated!");
    };

    const handleDeleteComment = (id: string) => {
        const updated = comments.filter(c => c.id !== id);
        saveComments(updated);
        toast.success("Comment deleted.");
    };

    const handleDeleteReply = (commentId: string, replyId: string) => {
        const updated = comments.map(c => {
            if (c.id !== commentId) return c;
            return {
                ...c,
                replies: (c.replies || []).filter(r => r.id !== replyId)
            };
        });
        saveComments(updated);
        toast.success("Reply deleted.");
    };

    const handleLike = (id: string) => {
        if (!canComment) {
            toast.error("Please switch profiles to like comments.");
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
            toast.error("Please switch profiles to dislike comments.");
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

    const handleReplyLike = (commentId: string, replyId: string) => {
        if (!canComment) {
            toast.error("Please switch profiles to like replies.");
            return;
        }
        const updated = comments.map(c => {
            if (c.id !== commentId) return c;
            return {
                ...c,
                replies: (c.replies || []).map(r => {
                    if (r.id !== replyId) return r;
                    const userLiked = !r.userLiked;
                    return {
                        ...r,
                        likes: r.likes + (userLiked ? 1 : -1),
                        userLiked
                    };
                })
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

    const formatCommentTime = (time: number | string) => {
        if (typeof time === "string") return time;
        try {
            return formatDistanceToNow(new Date(time), { addSuffix: true });
        } catch {
            return "some time ago";
        }
    };

    const isOwnComment = (c: Comment | Reply) => {
        if (!activeProfile) return false;
        if (c.profileId) return c.profileId === activeProfile.id;
        return c.username === activeProfile.name;
    };

    // Sorting calculation
    const getSortedComments = () => {
        return [...comments].sort((a, b) => {
            // Pinned comments always stay at the top
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;

            if (sortBy === "Newest") {
                const timeA = typeof a.timestamp === "number" ? a.timestamp : 0;
                const timeB = typeof b.timestamp === "number" ? b.timestamp : 0;
                return timeB - timeA;
            }
            if (sortBy === "Most Liked") {
                return b.likes - a.likes;
            }
            if (sortBy === "Top") {
                const scoreA = a.likes - a.dislikes;
                const scoreB = b.likes - b.dislikes;
                if (scoreA !== scoreB) return scoreB - scoreA;

                const timeA = typeof a.timestamp === "number" ? a.timestamp : 0;
                const timeB = typeof b.timestamp === "number" ? b.timestamp : 0;
                return timeB - timeA;
            }
            return 0;
        });
    };

    const renderBadge = (badge?: string) => {
        if (!badge) return null;
        const color = 
            badge === "Admin" ? "bg-red-500/20 text-red-400 border border-red-500/30" :
            badge === "Kids" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
            badge === "Pro" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
            badge === "Guest" ? "bg-zinc-800 text-zinc-400 border border-zinc-700/30" :
            "bg-blue-500/20 text-blue-400 border border-blue-500/30";
            
        return (
            <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${color}`}>
                {badge}
            </span>
        );
    };

    if (!isMounted) return null;

    const currentSortedComments = getSortedComments();

    return (
        <div className="relative isolate bg-[#111113] rounded-2xl border border-border-color p-6 space-y-6 select-none">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-color">
                <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-accent" />
                    <h3 className="font-bold text-white text-lg font-sora">Discussion Arena</h3>
                    <span className="text-xs text-[var(--text-muted)] font-semibold bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                        {comments.length}
                    </span>
                </div>

                {/* Sorting options */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--text-muted)] font-semibold">Sort by:</span>
                    <div className="flex bg-black/40 rounded-xl p-1 border border-white/5">
                        {(["Top", "Newest", "Most Liked"] as const).map(option => (
                            <button
                                key={option}
                                type="button"
                                onClick={() => setSortBy(option)}
                                className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                                    sortBy === option 
                                        ? "bg-accent text-white shadow-inner" 
                                        : "text-zinc-500 hover:text-white"
                                }`}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Comment Post Form */}
            <form onSubmit={handlePostComment} className="space-y-3 relative">
                {!canComment && (
                    <div className="flex items-center gap-3 p-4 mb-2 bg-accent-warm/10 border border-accent-warm/20 rounded-xl text-accent-warm text-xs font-semibold">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>Please choose a profile to join the discussion.</span>
                    </div>
                )}
                <div className="relative">
                    <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder={canComment ? "Write a comment... Markdown is supported (*italic*, **bold**, `code`)" : "Please select or create a profile to comment."}
                        rows={3}
                        maxLength={500}
                        disabled={!canComment}
                        className="w-full bg-bg-main text-white text-sm placeholder-[var(--text-muted)] border border-border-color rounded-xl p-4 outline-none focus:border-accent/50 transition-colors resize-none font-inter leading-relaxed disabled:opacity-40 disabled:cursor-not-allowed pr-14"
                    />

                    {/* Character limit counter */}
                    <div className="absolute right-4 bottom-3 flex items-center gap-2">
                        <span className={`text-[10px] font-semibold ${newComment.length >= 480 ? 'text-red-400 font-bold' : 'text-zinc-500'}`}>
                            {newComment.length} / 500
                        </span>
                    </div>
                    
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
                            <span>Spoiler</span>
                        </button>
 
                        <button
                            type="button"
                            onClick={() => setShowGifPicker(!showGifPicker)}
                            disabled={!canComment}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-white/5 text-[var(--text-muted)] border-border-color hover:text-white hover:bg-white/10 text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <ImageIcon className="w-3.5 h-3.5 text-accent-warm" />
                            <span>GIF</span>
                        </button>
                    </div>
 
                    <button
                        type="submit"
                        disabled={!canComment || (!newComment.trim() && !selectedGif) || newComment.length > 500}
                        className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-accent to-accent-warm hover:-translate-y-[1px] hover:scale-[1.02] text-white font-bold rounded-xl text-sm transition-all hover:shadow-[0_0_12px_var(--accent-glow)] active:scale-95 disabled:opacity-50 disabled:pointer-events-none hover:opacity-95"
                    >
                        <span>Send</span>
                        <Send className="w-3.5 h-3.5" />
                    </button>

                    {/* GIF Picker Panel */}
                    {showGifPicker && (
                        <div className="absolute bottom-full left-0 mb-2 w-80 sm:w-96 bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl p-3 flex flex-col z-50">
                            <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
                                <span className="text-[10px] font-black uppercase text-zinc-500">Search Giphy</span>
                                <button type="button" onClick={() => setShowGifPicker(false)} className="text-zinc-500 hover:text-white"><X className="w-3.5 h-3.5" /></button>
                            </div>
                            <input
                                type="text"
                                placeholder="Search Tenor GIFs..."
                                value={searchGifQuery}
                                onChange={(e) => setSearchGifQuery(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs mb-3 focus:border-accent outline-none transition-colors"
                            />
                            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                                {isFetchingGifs ? (
                                    <div className="col-span-2 text-center text-xs text-zinc-500 py-4 flex items-center justify-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin text-accent" /> Searching...
                                    </div>
                                ) : (searchGifQuery.trim() && tenorGifs.length === 0) ? (
                                    <div className="col-span-2 text-center text-xs text-zinc-500 py-6 font-semibold">No results for "{searchGifQuery}"</div>
                                ) : (
                                    (tenorGifs.length > 0 ? tenorGifs : POPULAR_GIFS).map((gif, i) => (
                                        <button
                                            key={`${gif.name}-${i}`}
                                            type="button"
                                            onClick={() => { setSelectedGif(gif.url); setShowGifPicker(false); setSearchGifQuery(""); }}
                                            className="relative h-20 rounded-xl overflow-hidden border border-white/5 hover:border-accent transition-all bg-black cursor-pointer group"
                                        >
                                            <Image src={gif.url} alt={gif.name} unoptimized fill sizes="150px" className="object-cover animate-none" />
                                            <div className="absolute inset-0 bg-black/40 flex items-end p-1 text-[9px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity truncate">{gif.name}</div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </form>

            {/* Typing Indicator */}
            {typingUser && (
                <div className="flex items-center gap-2 pl-4 text-xs text-[var(--text-muted)] font-medium animate-pulse">
                    <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span>{typingUser} is typing...</span>
                </div>
            )}

            {/* Comments List */}
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {isLoading ? (
                    // Artificial Shimmer loading state
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex gap-4 p-4 rounded-xl bg-white/[0.01] border border-white/[0.02] animate-pulse">
                                <div className="w-9 h-9 rounded-full bg-white/5 shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="flex justify-between items-center">
                                        <div className="h-4 bg-white/5 rounded w-24" />
                                        <div className="h-3 bg-white/5 rounded w-12" />
                                    </div>
                                    <div className="h-4 bg-white/5 rounded w-3/4" />
                                    <div className="h-3 bg-white/5 rounded w-16" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : currentSortedComments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-[var(--text-muted)]">
                        <AlertCircle className="w-10 h-10 opacity-30 mb-3 text-accent" />
                        <p className="text-sm font-bold uppercase tracking-wider text-white">No discussions yet</p>
                        <p className="text-xs text-zinc-500 mt-1 max-w-xs font-medium">Be the first to share your thoughts on this episode!</p>
                    </div>
                ) : (
                    currentSortedComments.map((comment) => (
                        <div 
                            key={comment.id} 
                            className={`group/item flex flex-col gap-3 p-4 rounded-xl transition-all border ${
                                comment.isPinned 
                                    ? "bg-accent/[0.03] border-accent/20" 
                                    : "bg-white/[0.02] border-white/[0.02] hover:border-white/[0.04] hover:bg-white/[0.04]"
                            }`}
                        >
                            {/* Comment Head */}
                            <div className="flex gap-3">
                                {/* Avatar */}
                                <UserAvatar 
                                    src={comment.avatar} 
                                    alt={comment.username} 
                                    initials={comment.username.slice(0, 2).toUpperCase()} 
                                    size={36} 
                                    className="border border-white/5"
                                />

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-white text-sm truncate font-sora">{comment.username}</span>
                                            {renderBadge(comment.badge)}
                                            {comment.isPinned && (
                                                <span className="flex items-center gap-1 text-[9px] font-black uppercase text-accent-warm tracking-wider bg-accent-warm/10 px-1.5 py-0.5 rounded border border-accent-warm/20">
                                                    <Pin className="w-2.5 h-2.5" /> Pinned
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-[var(--text-muted)] font-semibold whitespace-nowrap">{formatCommentTime(comment.timestamp)}</span>
                                    </div>

                                    {/* Edit Comment block or Display Comment */}
                                    {editingCommentId === comment.id ? (
                                        <div className="mt-2 space-y-2">
                                            <textarea
                                                value={editingText}
                                                onChange={(e) => setEditingText(e.target.value)}
                                                className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-accent"
                                                rows={2}
                                                maxLength={500}
                                            />
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleEditCommentSubmit(comment.id)}
                                                    className="flex items-center gap-1 px-3 py-1.5 bg-accent hover:opacity-90 text-white text-xs font-bold rounded-lg cursor-pointer"
                                                >
                                                    <Check className="w-3.5 h-3.5" /> Save
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => { setEditingCommentId(null); setEditingText(""); }}
                                                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-lg cursor-pointer"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mt-1">
                                            {comment.isSpoiler && !comment.showSpoiler ? (
                                                <button
                                                    type="button"
                                                    onClick={() => toggleRevealSpoiler(comment.id)}
                                                    className="w-full bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-lg text-xs font-semibold cursor-pointer flex items-center justify-between transition-colors select-none"
                                                >
                                                    <span className="flex items-center gap-2"><EyeOff className="w-3.5 h-3.5 text-red-400" /> Contains spoilers. Click to reveal.</span>
                                                </button>
                                            ) : (
                                                <div className="text-[var(--text-main)] text-sm font-inter leading-relaxed break-words relative space-y-2">
                                                    <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-invert max-w-none text-sm leading-relaxed">
                                                        {comment.content}
                                                    </ReactMarkdown>
                                                    {comment.gifUrl && (
                                                        <div className="max-w-xs overflow-hidden rounded-xl border border-white/10 bg-black/20">
                                                            <Image src={comment.gifUrl} alt="gif" unoptimized width={200} height={128} className="h-32 w-auto object-contain animate-none" />
                                                        </div>
                                                    )}
                                                    {comment.isSpoiler && (
                                                        <button 
                                                            type="button"
                                                            onClick={() => toggleRevealSpoiler(comment.id)}
                                                            className="absolute -top-3 right-0 text-[8px] font-black text-red-400/80 hover:text-red-400 cursor-pointer bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20 select-none uppercase tracking-wider"
                                                        >
                                                            Hide Spoiler
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-4 mt-2">
                                        {/* Likes */}
                                        <button 
                                            type="button"
                                            onClick={() => handleLike(comment.id)}
                                            className={`flex items-center gap-1.5 text-xs transition-colors hover:text-white cursor-pointer ${comment.userLiked ? 'text-accent font-bold' : 'text-[var(--text-muted)]'}`}
                                        >
                                            <ThumbsUp className="w-3.5 h-3.5" />
                                            <span>{comment.likes}</span>
                                        </button>

                                        {/* Dislikes */}
                                        <button 
                                            type="button"
                                            onClick={() => handleDislike(comment.id)}
                                            className={`flex items-center gap-1.5 text-xs transition-colors hover:text-white cursor-pointer ${comment.userDisliked ? 'text-red-400 font-bold' : 'text-[var(--text-muted)]'}`}
                                        >
                                            <ThumbsDown className="w-3.5 h-3.5" />
                                            <span>{comment.dislikes}</span>
                                        </button>

                                        {/* Reply Trigger */}
                                        {canComment && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setReplyingCommentId(replyingCommentId === comment.id ? null : comment.id);
                                                    setNewReplyText("");
                                                }}
                                                className="text-xs text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer font-bold"
                                            >
                                                Reply
                                            </button>
                                        )}

                                        {/* Edit / Delete for own comments */}
                                        {isOwnComment(comment) && !comment.isPinned && (
                                            <div className="flex items-center gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => { setEditingCommentId(comment.id); setEditingText(comment.content); }}
                                                    className="text-xs text-[var(--text-muted)] hover:text-accent transition-colors flex items-center gap-1 cursor-pointer font-semibold"
                                                >
                                                    <Edit2 className="w-3 h-3" /> Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteComment(comment.id)}
                                                    className="text-xs text-red-500/80 hover:text-red-400 transition-colors flex items-center gap-1 cursor-pointer font-semibold"
                                                >
                                                    <Trash2 className="w-3 h-3" /> Delete
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Replies Area */}
                            {comment.replies && comment.replies.length > 0 && (
                                <div className="pl-6 md:pl-10 space-y-3 mt-1 border-l-2 border-white/5">
                                    {comment.replies.map((reply) => (
                                        <div key={reply.id} className="flex gap-3 p-3 bg-white/[0.01] rounded-xl border border-white/[0.01] relative group/reply">
                                            {/* Corner icon */}
                                            <CornerDownRight className="w-3.5 h-3.5 text-zinc-600 shrink-0 mt-0.5" />

                                            {/* Avatar */}
                                            <UserAvatar 
                                                src={reply.avatar} 
                                                alt={reply.username} 
                                                initials={reply.username.slice(0, 2).toUpperCase()} 
                                                size={28} 
                                                className="border border-white/5"
                                            />

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-bold text-white text-xs truncate font-sora">{reply.username}</span>
                                                        {renderBadge(reply.badge)}
                                                    </div>
                                                    <span className="text-[9px] text-[var(--text-muted)] font-medium whitespace-nowrap">{formatCommentTime(reply.timestamp)}</span>
                                                </div>

                                                {/* Edit Reply block or Display Reply */}
                                                {editingReplyId?.replyId === reply.id ? (
                                                    <div className="mt-2 space-y-2">
                                                        <textarea
                                                            value={editingReplyText}
                                                            onChange={(e) => setEditingReplyText(e.target.value)}
                                                            className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-accent"
                                                            rows={2}
                                                            maxLength={500}
                                                        />
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleEditReplySubmit(comment.id, reply.id)}
                                                                className="flex items-center gap-1 px-2.5 py-1 bg-accent hover:opacity-90 text-white text-[10px] font-bold rounded-lg cursor-pointer"
                                                            >
                                                                <Check className="w-3 h-3" /> Save
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => { setEditingReplyId(null); setEditingReplyText(""); }}
                                                                className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold rounded-lg cursor-pointer"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="mt-0.5 text-zinc-300 text-xs font-inter leading-relaxed break-words">
                                                        <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-invert max-w-none text-xs leading-relaxed">
                                                            {reply.content}
                                                        </ReactMarkdown>
                                                    </div>
                                                )}

                                                {/* Actions */}
                                                <div className="flex items-center gap-3 mt-1.5">
                                                    <button 
                                                        type="button"
                                                        onClick={() => handleReplyLike(comment.id, reply.id)}
                                                        className={`flex items-center gap-1 text-[10px] transition-colors hover:text-white cursor-pointer ${reply.userLiked ? 'text-accent font-bold' : 'text-[var(--text-muted)]'}`}
                                                    >
                                                        <ThumbsUp className="w-3 h-3" />
                                                        <span>{reply.likes}</span>
                                                    </button>

                                                    {isOwnComment(reply) && (
                                                        <div className="flex items-center gap-2.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => { setEditingReplyId({ commentId: comment.id, replyId: reply.id }); setEditingReplyText(reply.content); }}
                                                                className="text-[10px] text-[var(--text-muted)] hover:text-accent transition-colors flex items-center gap-0.5 cursor-pointer font-semibold"
                                                            >
                                                                <Edit2 className="w-2.5 h-2.5" /> Edit
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteReply(comment.id, reply.id)}
                                                                className="text-[10px] text-red-500/80 hover:text-red-400 transition-colors flex items-center gap-0.5 cursor-pointer font-semibold"
                                                            >
                                                                <Trash2 className="w-2.5 h-2.5" /> Delete
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Reply Input Form */}
                            {replyingCommentId === comment.id && (
                                <div className="pl-6 md:pl-10 mt-2 flex gap-3 items-start">
                                    <CornerDownRight className="w-4 h-4 text-zinc-600 mt-2" />
                                    <div className="flex-1 space-y-2">
                                        <textarea
                                            value={newReplyText}
                                            onChange={(e) => setNewReplyText(e.target.value)}
                                            placeholder="Write a reply..."
                                            rows={2}
                                            maxLength={500}
                                            className="w-full bg-black/50 text-white text-xs placeholder-[var(--text-muted)] border border-border-color rounded-xl p-3 outline-none focus:border-accent/40 resize-none font-inter leading-relaxed"
                                        />
                                        <div className="flex items-center justify-between">
                                            <span className="text-[9px] text-zinc-600 font-semibold">{newReplyText.length} / 500</span>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handlePostReply(comment.id)}
                                                    disabled={!newReplyText.trim() || newReplyText.length > 500}
                                                    className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-accent to-accent-warm hover:opacity-90 text-white text-[10px] font-bold rounded-lg cursor-pointer transition-all disabled:opacity-50 disabled:pointer-events-none"
                                                >
                                                    Reply <Send className="w-2.5 h-2.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setReplyingCommentId(null)}
                                                    className="px-3 py-1 bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold rounded-lg cursor-pointer"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
});

export default CommentsSection;
