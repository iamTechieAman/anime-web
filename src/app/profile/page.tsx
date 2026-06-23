"use client";

import { useEffect, useState } from "react";
import { User, Bell, Clock, Bookmark, LogOut, Settings, BellRing } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import { useUser, useClerk } from "@clerk/nextjs";
import { useWatch } from "@/context/WatchContext";

export default function ProfilePage() {
    const { user, isLoaded } = useUser();
    const { signOut } = useClerk();
    const { history, watchlist } = useWatch();
    const [pushEnabled, setPushEnabled] = useState(false);

    useEffect(() => {
        // Check if browser has push permission
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            setPushEnabled(true);
        }
    }, []);

    const urlBase64ToUint8Array = (base64String: string) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    };

    const enablePush = async () => {
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
            toast.error("Push notifications not supported by your browser.");
            return;
        }

        try {
            const permission = await Notification.requestPermission();
            if (permission !== "granted") {
                toast.error("Notification permission denied.");
                return;
            }

            const registration = await navigator.serviceWorker.register('/sw.js');
            const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuB2A8p8C8iE0mFz2v1D1qXz9s';
            const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedVapidKey
            });

            await fetch('/api/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(subscription)
            });

            setPushEnabled(true);
            toast.success("Push notifications enabled!");
        } catch (error) {
            console.error(error);
            toast.error("Failed to enable notifications.");
        }
    };

    const handleLogout = async () => {
        await signOut();
        localStorage.clear();
        window.location.href = "/";
    };

    if (!isLoaded) return <div className="min-h-dvh flex items-center justify-center text-white">Loading...</div>;
    if (!user) return null;

    const displayName = user.fullName || user.username || user.primaryEmailAddress?.emailAddress.split('@')[0] || "ToonPlayer User";
    const displayEmail = user.primaryEmailAddress?.emailAddress || "clerk-auth-user@toonplayer.in";
    const displayAvatar = user.imageUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${displayName}`;

    return (
        <main className="min-h-dvh bg-[var(--bg-main)] text-[var(--text-main)] pb-24 pt-6">
            <div className="max-w-4xl mx-auto px-4 md:px-8">
                
                {/* Profile Header */}
                <div className="flex items-center gap-6 mb-12 p-6 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)]">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[var(--accent)] to-[var(--accent-warm)] p-[3px]">
                        <div className="w-full h-full bg-[var(--bg-card)] rounded-full overflow-hidden">
                            <Image src={displayAvatar} alt="Avatar" fill sizes="80px" className="object-cover" />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold font-sora">{displayName}</h1>
                        <p className="text-[var(--text-muted)] text-sm">{displayEmail}</p>
                    </div>
                </div>

                {/* Dashboard Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Quick Links */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-bold font-sora mb-4 flex items-center gap-2"><Settings className="w-5 h-5 text-[var(--accent-warm)]" /> Account Hub</h2>
                        
                        <Link href="/history" className="flex items-center justify-between p-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] hover:border-[var(--accent-warm)]/50 transition-colors">
                            <div className="flex items-center gap-3">
                                <Clock className="w-5 h-5 text-[var(--text-muted)]" />
                                <span className="font-medium">Watch History</span>
                            </div>
                            <span className="text-xs text-[var(--text-muted)] bg-white/5 px-2 py-1 rounded-md">{history?.length || 0} items</span>
                        </Link>

                        <Link href="/watchlist" className="flex items-center justify-between p-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] hover:border-[var(--accent-warm)]/50 transition-colors">
                            <div className="flex items-center gap-3">
                                <Bookmark className="w-5 h-5 text-[var(--text-muted)]" />
                                <span className="font-medium">My Watchlist</span>
                            </div>
                            <span className="text-xs text-[var(--text-muted)] bg-white/5 px-2 py-1 rounded-md">{watchlist?.length || 0} items</span>
                        </Link>

                        <button onClick={handleLogout} className="w-full flex items-center gap-3 p-4 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20 hover:bg-red-500/20 transition-colors text-left cursor-pointer">
                            <LogOut className="w-5 h-5" />
                            <span className="font-medium">Log Out</span>
                        </button>
                    </div>

                    {/* Notifications Panel */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-bold font-sora mb-4 flex items-center gap-2"><Bell className="w-5 h-5 text-[var(--accent-warm)]" /> Notifications</h2>
                        
                        <div className="p-6 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] text-center">
                            <div className="w-16 h-16 rounded-full bg-[var(--accent-warm)]/10 flex items-center justify-center mx-auto mb-4">
                                <BellRing className={`w-8 h-8 ${pushEnabled ? 'text-[var(--accent-warm)]' : 'text-[var(--text-muted)]'}`} />
                            </div>
                            <h3 className="font-bold mb-2">Episode Updates</h3>
                            <p className="text-sm text-[var(--text-muted)] mb-6">
                                Get instant notifications on your device whenever a new anime episode or movie drops!
                            </p>
                            
                            {pushEnabled ? (
                                <div className="px-4 py-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg text-sm font-bold inline-block">
                                    ✓ Notifications Enabled
                                </div>
                            ) : (
                                <button 
                                    onClick={enablePush}
                                    className="w-full px-4 py-3 bg-[var(--accent-warm)] hover:bg-orange-600 text-white rounded-xl font-bold transition-colors cursor-pointer"
                                >
                                    Enable Notifications
                                </button>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </main>
    );
}
