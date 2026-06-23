"use client";

import { motion } from "framer-motion";
import { FileText, Scale, AlertTriangle, Copyright, ShieldAlert, Zap, Film } from "lucide-react";

export default function TermsPage() {
    const sections = [
        {
            title: "Content Aggregation",
            icon: Film,
            content: "ToonPlayer is an index-based platform and content aggregator. We do not host, store, or upload any media files on our servers. All links and content indices are found publicly available on third-party domains. We do not have control over the content hosted on external servers."
        },
        {
            title: "Intellectual Property",
            icon: Copyright,
            content: "We respect the intellectual property rights of others. If you believe that your copyrighted work has been linked without authorization, please contact the hosting provider directly for removal from their servers. Once removed from the source, the link will automatically become unavailable on ToonPlayer."
        },
        {
            title: "Fair Use",
            icon: Scale,
            content: "This platform is intended for personal, non-commercial use only. We provide a unified interface for users to search public resources. Users are responsible for complying with local regulations regarding content access in their jurisdiction."
        },
        {
            title: "Service Availability",
            icon: Zap,
            content: "We strive to provide the best streaming experience, but we do not guarantee uninterrupted access or the permanent availability of any specific title, as we depend on third-party hosting status."
        }
    ];

    return (
        <main className="min-h-dvh bg-[var(--bg-main)] text-[var(--text-main)] pt-6 pb-20 px-4 md:px-8">
            <div className="max-w-4xl mx-auto space-y-12">
                {/* Header */}
                <div className="text-center space-y-4">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-16 h-16 bg-[var(--accent-warm)]/10 rounded-2xl mx-auto flex items-center justify-center mb-6"
                    >
                        <FileText className="w-8 h-8 text-[var(--accent-warm)]" />
                    </motion.div>
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">Terms of Service</h1>
                    <p className="text-[var(--text-muted)] text-lg">Agreement for Using ToonPlayer.in</p>
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
                                <section.icon className="w-5 h-5 text-[var(--accent-warm)]" />
                            </div>
                            <h2 className="text-xl font-bold text-white">{section.title}</h2>
                            <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                                {section.content}
                            </p>
                        </motion.div>
                    ))}
                </div>

                {/* Legal Warning */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    className="p-8 bg-amber-500/5 border border-amber-500/20 rounded-2xl space-y-4"
                >
                    <div className="flex items-center gap-3 text-amber-500 mb-2">
                        <AlertTriangle className="w-5 h-5" />
                        <h3 className="text-lg font-bold">Disclaimer of Liability</h3>
                    </div>
                    <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                        ToonPlayer.in and its operators shall not be held liable for any content accessible through the platform or for any damages resulting from the use of third-party streaming links. By using this platform, you acknowledge that you do so at your own risk.
                    </p>
                </motion.div>
                
                <div className="text-center pt-8">
                    <p className="text-xs text-[var(--text-muted)]">By accessing ToonPlayer, you agree to these terms. Last updated: April 2026.</p>
                </div>
            </div>
        </main>
    );
}
