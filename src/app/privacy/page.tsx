"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Lock, Eye, ShieldAlert, Globe, Server, UserCheck } from "lucide-react";

export default function PrivacyPage() {
    const sections = [
        {
            title: "Data Collection",
            icon: Eye,
            content: "ToonPlayer is designed to be a privacy-first platform. We do not require account registration, and we do not store personal identification information such as names, addresses, or phone numbers. Any local data (like your watch history) is stored locally on your device's storage and never transmitted to our servers."
        },
        {
            title: "Cookies & Storage",
            icon: Lock,
            content: "We use 'Local Storage' to save your preferences, watch history, and bookmarks. Third-party providers (like TMDB for metadata or our video player hosts) may use cookies or similar technologies to provide their services. You can manage or disable cookies through your browser settings."
        },
        {
            title: "Third-Party Links",
            icon: Globe,
            content: "Our website contains links to external streaming servers. These third-party sites have their own privacy policies. We encouraged you to read their terms. We do not have control over the privacy practices of external video hosts."
        },
        {
            title: "How We Use Information",
            icon: UserCheck,
            content: "Information we collect (non-personal server logs) is used solely to improve the performance and reliability of the platform and to protect against malicious traffic or scraping attempts."
        }
    ];

    return (
        <main className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] pt-24 pb-20 px-4 md:px-8">
            <div className="max-w-4xl mx-auto space-y-12">
                {/* Header */}
                <div className="text-center space-y-4">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-16 h-16 bg-blue-500/10 rounded-2xl mx-auto flex items-center justify-center mb-6"
                    >
                        <ShieldCheck className="w-8 h-8 text-blue-400" />
                    </motion.div>
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">Privacy Policy</h1>
                    <p className="text-[var(--text-muted)] text-lg">Last updated: April 2026</p>
                </div>

                {/* Content */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8">
                    {sections.map((section, i) => (
                        <motion.div 
                            key={section.title}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="p-8 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] space-y-4"
                        >
                            <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center">
                                <section.icon className="w-5 h-5 text-blue-400" />
                            </div>
                            <h2 className="text-xl font-bold text-white">{section.title}</h2>
                            <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                                {section.content}
                            </p>
                        </motion.div>
                    ))}
                </div>

                {/* Additional Info */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    className="p-8 bg-blue-500/5 border border-blue-500/20 rounded-2xl space-y-4"
                >
                    <div className="flex items-center gap-3 text-blue-400 mb-2">
                        <ShieldAlert className="w-5 h-5" />
                        <h3 className="text-lg font-bold">Safe Browsing Notice</h3>
                    </div>
                    <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                        ToonPlayer implements advanced ad-blocking and anti-redirect measures to ensure a safe viewing experience. However, we always recommend using a reputable browser and maintaining updated security software when browsing any third-party streaming resources.
                    </p>
                </motion.div>
                
                <div className="text-center pt-8">
                    <p className="text-xs text-[var(--text-muted)]">If you have any questions regarding this policy, please contact us at <span className="text-white font-bold">privacy@toonplayer.in</span></p>
                </div>
            </div>
        </main>
    );
}
