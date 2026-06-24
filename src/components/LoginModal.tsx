"use client";

import { useState, useEffect } from "react";
import { useSignIn, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Play, X, User, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import ModalPortal from "./ModalPortal";
import { useUserStore } from "@/store/userStore";

const ProfileAvatar = ({ src, alt }: { src?: string | null, alt?: string | null }) => {
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
  }, [src]);

  const isInvalidSrc = !src || 
    src === "null" || 
    src === "undefined" || 
    src.trim() === "" || 
    src.includes("undefined") ||
    src.includes("/undefined") ||
    src.includes("/null");
  const fallbackChar = (alt && typeof alt === 'string' && alt.trim().length > 0) 
    ? alt.trim().charAt(0).toUpperCase() 
    : "?";
  
  return error || isInvalidSrc ? (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent to-accent-secondary text-white font-black text-2xl select-none rounded-lg">{fallbackChar}</div>
  ) : (
    <img src={src!} alt={alt || "Avatar"} className="w-full h-full object-cover rounded-lg" onError={() => setError(true)} />
  );
};

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AVATARS = [
  { name: "Totoro", url: "/avatars/avatar-1.png" },
  { name: "Ponyo", url: "/avatars/avatar-2.png" },
  { name: "Luffy", url: "/avatars/avatar-3.png" },
  { name: "Naruto", url: "/avatars/avatar-4.png" },
  { name: "Nezuko", url: "/avatars/avatar-5.png" },
  { name: "Goku", url: "/avatars/avatar-6.png" },
  { name: "Pikachu", url: "/avatars/avatar-7.png" },
  { name: "Chihiro", url: "/avatars/avatar-8.png" }
];

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { signIn, isLoaded: signInLoaded } = useSignIn() as any;
  const { isLoaded: userLoaded, isSignedIn } = useUser() as any;
  const { addProfile, setActiveProfile, profiles } = useUserStore();
  const router = useRouter();

  const [guestMode, setGuestMode] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0].url);

  useEffect(() => {
    if (isOpen) {
      setGuestMode(false);
      setGuestName("");
      setSelectedAvatar(AVATARS[0].url);
    }
  }, [isOpen]);

  const handleOAuth = (strategy: "oauth_google" | "oauth_github" | "oauth_discord") => {
    if (!signInLoaded) {
      toast.error("Authentication engine is loading. Please try again.");
      return;
    }
    try {
      signIn.authenticateWithRedirect({
        strategy,
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/",
      });
    } catch (e) {
      console.error(e);
      toast.error("OAuth initiation failed.");
    }
  };

  const handleGuestLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;

    try {
      const name = guestName.trim();
      
      // Check if this exact guest name exists
      const currentStore = useUserStore.getState();
      const existing = currentStore.profiles.find(p => p.name === name && p.type === 'guest');

      if (existing) {
        // If it exists, just use it
        setActiveProfile(existing.id);
      } else {
        // Add new guest profile
        addProfile({
          name,
          avatar: selectedAvatar,
          type: 'guest',
          isKids: false,
          theme: 'purple'
        });
        
        // Let state update, then find the newly created one
        setTimeout(() => {
          const updatedStore = useUserStore.getState();
          const created = updatedStore.profiles.find(p => p.name === name && p.type === 'guest');
          if (created) {
            setActiveProfile(created.id);
          } else {
            setActiveProfile('profile-guest');
          }
        }, 50);
      }

      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("toonplayer-session-active", "true");
        window.dispatchEvent(new Event("profileUpdated"));
      }
      toast.success(`Welcome to ToonPlayer, ${name}!`);
      onClose();
      router.refresh();

    } catch (error) {
      toast.error("Guest login failed.");
    }
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose} className="max-w-[440px]">
      <div className="relative p-6 sm:p-8 flex flex-col min-h-0 overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white cursor-pointer z-20"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-4 border border-accent/20 shadow-[0_0_30px_var(--accent-glow)] shrink-0">
            <Play className="w-7 h-7 text-accent fill-current translate-x-0.5" />
          </div>
          <h2 className="text-2xl font-black font-sora text-white tracking-tight">ToonPlayer</h2>
          <p className="text-xs text-[var(--text-muted)] mt-1 font-medium">Premium Streaming Experience</p>
        </div>

        <AnimatePresence mode="wait">
          {!guestMode ? (
            <motion.div
              key="auth-options"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-3.5"
            >
              <button
                onClick={() => handleOAuth("oauth_google")}
                className="w-full flex items-center justify-center gap-3 px-5 py-3 bg-white text-black rounded-xl font-bold hover:bg-gray-100 transition-all active:scale-95 cursor-pointer text-sm"
              >
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-[18px] h-[18px] object-contain" />
                Continue with Google
              </button>

              <div className="relative py-3">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5" /></div>
                <div className="relative flex justify-center"><span className="px-3.5 text-[10px] text-zinc-500 bg-[#16161c] font-black tracking-widest uppercase">OR</span></div>
              </div>

              <button
                onClick={() => setGuestMode(true)}
                className="w-full px-5 py-3 bg-transparent border border-white/10 hover:border-white/20 text-white rounded-xl font-bold hover:bg-white/5 transition-all active:scale-95 cursor-pointer text-sm"
              >
                Continue as Guest
              </button>
            </motion.div>
          ) : (
            <motion.form
              key="guest-form"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              onSubmit={handleGuestLogin}
              className="space-y-5"
            >
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Guest Name</label>
                <input
                  type="text"
                  required
                  maxLength={15}
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full bg-black/45 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-accent transition-all"
                  placeholder="Enter your name"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Choose Avatar</label>
                <div className="grid grid-cols-4 gap-2.5">
                  {AVATARS.map((avatar) => {
                    const isSelected = selectedAvatar === avatar.url;
                    return (
                      <button
                        key={avatar.name}
                        type="button"
                        onClick={() => setSelectedAvatar(avatar.url)}
                        className={`relative aspect-square rounded-xl overflow-hidden border-2 bg-white/5 p-1 transition-all ${
                          isSelected ? "border-accent scale-105 bg-white/10" : "border-transparent hover:border-white/20"
                        } cursor-pointer`}
                      >
                        <div className="relative w-full h-full">
                          <ProfileAvatar src={avatar.url} alt={avatar.name} sizes="80px" />
                        </div>
                        {isSelected && (
                          <div className="absolute top-1 right-1 bg-accent rounded-full p-0.5 shadow-md">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setGuestMode(false)}
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl text-xs font-bold hover:bg-white/10 transition-all active:scale-95 cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={!guestName.trim()}
                  className="flex-[2] flex items-center justify-center gap-1.5 px-5 py-3 bg-gradient-to-r from-accent to-accent-warm hover:-translate-y-[1px] hover:scale-[1.02] text-white rounded-xl text-xs font-bold shadow-[0_0_20px_var(--accent-glow)] hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Start Watching
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </ModalPortal>
  );
}
