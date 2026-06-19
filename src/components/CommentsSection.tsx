"use client";

import { useState, useEffect } from "react";
import { MessageSquare, ThumbsUp, ThumbsDown, Send, EyeOff, AlertCircle } from "lucide-react";

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
}

const DEFAULT_MOCK_COMMENTS: Record<string, string[]> = {
    anime: [
        "This episode was absolutely stunning! The animation during the fight scenes is cinema-grade. 🔥",
        "Can't believe they left us on such a cliffhanger. Next week can't come soon enough!",
        "The sound design and the emotional track in the background made me tear up. Masterpiece.",
        "Honestly, the pacing is much better than the manga. Studio did a fantastic job here."
    ],
    movie: [
        "One of the best movies I have watched this year. The cinematography is incredible.",
        "The plot twist in the second half caught me completely off guard. Highly recommended!",
        "A beautiful cinematic journey. ToonPlayer streaming quality made it look even better.",
        "Great movie, but the ending leaves a lot of questions. What do you all think?"
    ]
};

const USERNAME_POOL = [
    "OtakuDragon", "CrunchyVibe", "SlayerX", "LuffyG5", "HarajukuDream",
    "CinephilePro", "PopcornSlayer", "ShadowHokage", "ZoroLost", "MidnightAnime"
];

const AVATAR_COLOR_POOL = [
    "bg-purple-600", "bg-indigo-600", "bg-cyan-600", "bg-emerald-600",
    "bg-rose-600", "bg-amber-600", "bg-fuchsia-600", "bg-sky-600"
];

export default function CommentsSection({ contentId, category = "anime" }: { contentId: string; category?: "anime" | "movie" | "tv" }) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [isSpoilerInput, setIsSpoilerInput] = useState(false);

    // Load comments from localStorage or initialize with mock data
    useEffect(() => {
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
            const initial = username.charAt(0).toUpperCase();
            const avatar = `${AVATAR_COLOR_POOL[idx % AVATAR_COLOR_POOL.length]} text-white`;
            
            return {
                id: `mock-${idx}`,
                username,
                avatar,
                content: text,
                timestamp: timeAgo,
                likes: Math.floor(Math.random() * 45) + 5,
                dislikes: Math.floor(Math.random() * 5),
                isSpoiler: idx === 1, // Make one of them a spoiler comment
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
        if (!newComment.trim()) return;

        const comment: Comment = {
            id: `user-${Date.now()}`,
            username: "You (Member)",
            avatar: "bg-[var(--accent)] text-black font-black",
            content: newComment.trim(),
            timestamp: "Just now",
            likes: 0,
            dislikes: 0,
            isSpoiler: isSpoilerInput,
            showSpoiler: false
        };

        const updated = [comment, ...comments];
        saveComments(updated);
        setNewComment("");
        setIsSpoilerInput(false);
    };

    const handleLike = (id: string) => {
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

    return (
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-[var(--accent)]" />
                    <h3 className="font-bold text-white text-lg font-sora">Comments & Discussion</h3>
                </div>
                <span className="text-xs text-[var(--text-muted)] font-semibold bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                    {comments.length} Comment{comments.length !== 1 ? 's' : ''}
                </span>
            </div>

            {/* Comment Form */}
            <form onSubmit={handlePostComment} className="space-y-3">
                <div className="relative">
                    <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Join the discussion... Share your thoughts!"
                        rows={3}
                        className="w-full bg-[var(--bg-main)] text-white text-sm placeholder-[var(--text-muted)] border border-[var(--border-color)] rounded-xl p-4 outline-none focus:border-[var(--accent)]/50 transition-colors resize-none font-inter"
                    />
                </div>
                
                <div className="flex items-center justify-between">
                    <button
                        type="button"
                        onClick={() => setIsSpoilerInput(!isSpoilerInput)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                            isSpoilerInput
                                ? "bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20"
                                : "bg-white/5 text-[var(--text-muted)] border-[var(--border-color)] hover:text-white hover:bg-white/10"
                        }`}
                    >
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Tag as Spoiler</span>
                    </button>

                    <button
                        type="submit"
                        disabled={!newComment.trim()}
                        className="flex items-center gap-2 px-5 py-2 bg-[var(--accent)] text-white font-bold rounded-xl text-sm transition-all hover:shadow-[0_0_12px_var(--accent-glow)] active:scale-95 disabled:opacity-50 disabled:pointer-events-none hover:opacity-95"
                    >
                        <span>Comment</span>
                        <Send className="w-3.5 h-3.5" />
                    </button>
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
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-bold text-xs select-none ${comment.avatar}`}>
                                {comment.username.slice(0, 2).toUpperCase()}
                            </div>

                            {/* Comment Content */}
                            <div className="flex-1 min-w-0 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-bold text-white text-sm truncate font-sora">{comment.username}</span>
                                    <span className="text-[10px] text-[var(--text-muted)] font-semibold whitespace-nowrap">{comment.timestamp}</span>
                                </div>

                                {comment.isSpoiler && !comment.showSpoiler ? (
                                    <div 
                                        onClick={() => toggleRevealSpoiler(comment.id)}
                                        className="bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-lg text-xs font-semibold cursor-pointer flex items-center justify-between transition-colors select-none"
                                    >
                                        <div className="flex items-center gap-2">
                                            <EyeOff className="w-3.5 h-3.5 text-red-400" />
                                            <span>Comment contains spoilers. Click to reveal.</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-[var(--text-main)] text-sm font-inter leading-relaxed break-words relative">
                                        {comment.content}
                                        {comment.isSpoiler && (
                                            <span 
                                                onClick={() => toggleRevealSpoiler(comment.id)}
                                                className="absolute -top-4 right-0 text-[9px] font-bold text-red-400/80 hover:text-red-400 cursor-pointer bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20 select-none"
                                            >
                                                Hide Spoiler
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Likes & Actions */}
                                <div className="flex items-center gap-4 pt-1">
                                    <button 
                                        onClick={() => handleLike(comment.id)}
                                        className={`flex items-center gap-1.5 text-xs transition-colors hover:text-white ${comment.userLiked ? 'text-[var(--accent)] font-bold' : 'text-[var(--text-muted)]'}`}
                                    >
                                        <ThumbsUp className="w-3.5 h-3.5" />
                                        <span>{comment.likes}</span>
                                    </button>

                                    <button 
                                        onClick={() => handleDislike(comment.id)}
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
}
