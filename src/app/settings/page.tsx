import { Suspense } from "react";
import { Metadata } from "next";
import SettingsClient from "./SettingsClient";

export const metadata: Metadata = {
    title: "App Settings - ToonPlayer",
    description: "Configure your playback, appearance, account profiles, notifications, and accessibility preferences.",
    alternates: {
        canonical: "https://www.toonplayer.in/settings",
    },
    robots: { index: false, follow: false },
};

export default function SettingsPage() {
    return (
        <Suspense fallback={
            <div className="min-h-dvh pt-24 flex items-center justify-center bg-bg-main">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                    <p className="text-sm text-[var(--text-muted)] animate-pulse font-bold tracking-widest uppercase">Loading Settings...</p>
                </div>
            </div>
        }>
            <SettingsClient />
        </Suspense>
    );
}
