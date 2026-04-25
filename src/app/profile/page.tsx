"use client";

import { useEffect, useState } from "react";
import { User, Bell, Clock, Bookmark, LogOut, Settings, BellRing } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function ProfilePage() {
    const [user, setUser] = useState<any>(null);
    const [pushEnabled, setPushEnabled] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/user/me')
            .then(res => {
                if (res.ok) return res.json();
                throw new Error('Not logged in');
            })
            .then(data => {
                setUser(data.user);
                // Check if browser has push permission
                if ("Notification" in window && Notification.permission === "granted") {
                    setPushEnabled(true);
                }
            })
            .catch(() => {
                window.location.href = '/login';
            })
            .finally(() => setLoading(false));
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

    const handleLogout = () => {
        // Since we use httpOnly cookie, we should clear it. 
        // For now, we can just delete the cookie if it wasn't httpOnly, 
        // but since it is, we would need a /api/auth/logout. 
        // As a quick fix, just redirect to login which could override it, or clear local state.
        document.cookie = "toonplayer_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        localStorage.clear();
        window.location.href = "/";
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>;
    if (!user) return null;

    return (
        <main className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] pt-16 md:pt-24 pb-24 md:pl-[72px]">
            <div className="max-w-4xl mx-auto px-4 md:px-8">
                
                {/* Profile Header */}
                <div className="flex items-center gap-6 mb-12 p-6 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)]">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 p-[3px]">
                        <div className="w-full h-full bg-[var(--bg-card)] rounded-full overflow-hidden">
                            <img src={user.avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${user.name}`} alt="Avatar" className="w-full h-full object-cover" />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold font-sora">{user.name}</h1>
                        <p className="text-[var(--text-muted)] text-sm">{user.email}</p>
                    </div>
                </div>

                {/* Dashboard Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Quick Links */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-bold font-sora mb-4 flex items-center gap-2"><Settings className="w-5 h-5 text-purple-400" /> Account Hub</h2>
                        
                        <Link href="/history" className="flex items-center justify-between p-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] hover:border-purple-500/50 transition-colors">
                            <div className="flex items-center gap-3">
                                <Clock className="w-5 h-5 text-[var(--text-muted)]" />
                                <span className="font-medium">Watch History</span>
                            </div>
                            <span className="text-xs text-[var(--text-muted)] bg-white/5 px-2 py-1 rounded-md">{user.history?.length || 0} items</span>
                        </Link>

                        <Link href="/watchlist" className="flex items-center justify-between p-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] hover:border-purple-500/50 transition-colors">
                            <div className="flex items-center gap-3">
                                <Bookmark className="w-5 h-5 text-[var(--text-muted)]" />
                                <span className="font-medium">My Watchlist</span>
                            </div>
                            <span className="text-xs text-[var(--text-muted)] bg-white/5 px-2 py-1 rounded-md">{user.watchlist?.length || 0} items</span>
                        </Link>

                        <button onClick={handleLogout} className="w-full flex items-center gap-3 p-4 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20 hover:bg-red-500/20 transition-colors text-left">
                            <LogOut className="w-5 h-5" />
                            <span className="font-medium">Log Out</span>
                        </button>
                    </div>

                    {/* Notifications Panel */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-bold font-sora mb-4 flex items-center gap-2"><Bell className="w-5 h-5 text-purple-400" /> Notifications</h2>
                        
                        <div className="p-6 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] text-center">
                            <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
                                <BellRing className={`w-8 h-8 ${pushEnabled ? 'text-purple-400' : 'text-[var(--text-muted)]'}`} />
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
                                    className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold transition-colors"
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
