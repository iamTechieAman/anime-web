"use client";

import { motion } from "framer-motion";
import { Mail, ShieldAlert, Send, Github, Info, CheckCircle2, Copy, RefreshCw, AlertCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import Link from "next/link";

const INQUIRY_TYPES = [
    "General Inquiry",
    "Bug Report",
    "Content Request",
    "DMCA & Copyright Notice",
    "Feature Suggestion"
] as const;

type InquiryType = typeof INQUIRY_TYPES[number];

export default function ContactPage() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [inquiryType, setInquiryType] = useState<InquiryType>("General Inquiry");
    const [message, setMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submittedData, setSubmittedData] = useState<{
        name: string;
        email: string;
        category: string;
        message: string;
    } | null>(null);

    const handleSelectCategory = (cat: InquiryType) => {
        setInquiryType(cat);
        if (cat === "DMCA & Copyright Notice" && !message) {
            setMessage("Title / Content URL to report:\nReason for notice:\nRights owner documentation / identification:\n");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = name.trim();
        const trimmedEmail = email.trim();
        const trimmedMsg = message.trim();

        if (!trimmedName || !trimmedEmail || !trimmedMsg) {
            toast.error("Please fill in all required fields.");
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
            toast.error("Please enter a valid email address.");
            return;
        }

        setIsSubmitting(true);

        try {
            // Construct verified mailto string to truthfully connect with support
            const subject = encodeURIComponent(`[ToonPlayer] ${inquiryType} from ${trimmedName}`);
            const body = encodeURIComponent(
                `Sender Name: ${trimmedName}\nSender Email: ${trimmedEmail}\nInquiry Type: ${inquiryType}\n\nMessage:\n${trimmedMsg}\n\n---\nSent via ToonPlayer Contact Portal`
            );
            const mailtoUrl = `mailto:contact@toonplayer.in?subject=${subject}&body=${body}`;

            // Trigger mailto client
            if (typeof window !== "undefined") {
                window.location.href = mailtoUrl;
            }

            setSubmittedData({
                name: trimmedName,
                email: trimmedEmail,
                category: inquiryType,
                message: trimmedMsg
            });

            toast.success("Inquiry prepared. Email client launched!");
        } catch {
            toast.error("Could not launch email client. Please send directly to contact@toonplayer.in");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCopyMessage = () => {
        if (!submittedData) return;
        const formatted = `To: contact@toonplayer.in\nSubject: [ToonPlayer] ${submittedData.category} from ${submittedData.name}\nFrom: ${submittedData.email}\n\n${submittedData.message}`;
        navigator.clipboard.writeText(formatted);
        toast.success("Message details copied to clipboard!");
    };

    const handleReset = () => {
        setSubmittedData(null);
        setName("");
        setEmail("");
        setMessage("");
        setInquiryType("General Inquiry");
    };

    return (
        <div className="flex-1 w-full bg-bg-main text-[var(--text-main)] pt-6 pb-20 px-4 sm:px-6 md:px-8">
            <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-start">
                
                {/* Left Column: Direct Contact Info & Guidelines */}
                <div className="space-y-8">
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/5">
                            <Info className="w-3 h-3" />
                            ToonPlayer Support
                        </div>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight font-sora">
                            Get in <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-accent-warm">Touch.</span>
                        </h1>
                        <p className="text-zinc-400 text-sm sm:text-base max-w-md leading-relaxed">
                            Have a content request, found a bug, or need to report a DMCA notice? Contact our support team directly.
                        </p>
                    </div>

                    <div className="space-y-4">
                        {/* Direct Email Card */}
                        <div className="flex items-start gap-4 p-5 bg-bg-card border border-border-color rounded-2xl group hover:border-blue-500/30 transition-all">
                            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center shrink-0">
                                <Mail className="w-5 h-5 text-blue-400" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-white font-bold text-sm mb-0.5">Email Support</h3>
                                <p className="text-xs text-zinc-400 mb-2">Direct assistance and feedback inquiries.</p>
                                <a 
                                    href="mailto:contact@toonplayer.in" 
                                    className="text-blue-400 text-xs sm:text-sm font-bold hover:underline break-all"
                                >
                                    contact@toonplayer.in
                                </a>
                            </div>
                        </div>

                        {/* DMCA & Legal Notices */}
                        <div className="flex items-start gap-4 p-5 bg-bg-card border border-border-color rounded-2xl group hover:border-accent-warm/30 transition-all">
                            <div className="w-12 h-12 bg-accent-warm/10 rounded-xl flex items-center justify-center shrink-0">
                                <ShieldAlert className="w-5 h-5 text-accent-warm" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="text-white font-bold text-sm mb-0.5">DMCA & Legal Notice</h3>
                                <p className="text-xs text-zinc-400 mb-3">Please include title names, exact links, and legal proof of ownership.</p>
                                <button 
                                    type="button"
                                    onClick={() => handleSelectCategory("DMCA & Copyright Notice")}
                                    className="px-3 py-1.5 bg-accent-warm/10 border border-accent-warm/25 text-accent-warm text-xs font-bold rounded-xl hover:bg-accent-warm hover:text-white transition-all cursor-pointer"
                                >
                                    Report Copyright Issue
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                        <a 
                            href="https://github.com/iamTechieAman/anime-web" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="p-3 bg-white/5 rounded-xl text-zinc-400 hover:text-white transition-colors border border-white/5 hover:border-white/10 flex items-center gap-2 text-xs font-bold"
                            aria-label="View Project on GitHub"
                        >
                            <Github className="w-4 h-4" />
                            <span>GitHub Repository</span>
                        </a>
                    </div>
                </div>

                {/* Right Column: Interactive Form & Truthful Delivery */}
                <div className="bg-bg-card border border-border-color p-6 sm:p-8 md:p-10 rounded-3xl shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 blur-[100px] -z-10" />
                    
                    {submittedData ? (
                        /* Truthful Post-Submission Delivery Summary */
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 text-emerald-400">
                                <CheckCircle2 className="w-6 h-6 shrink-0" />
                                <div>
                                    <h3 className="text-base font-bold text-white">Inquiry Prepared for Delivery</h3>
                                    <p className="text-xs text-zinc-400">Email client opened for transmission</p>
                                </div>
                            </div>

                            <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-4 text-xs space-y-2 text-zinc-300">
                                <p><strong className="text-white font-semibold">Recipient:</strong> contact@toonplayer.in</p>
                                <p><strong className="text-white font-semibold">Category:</strong> {submittedData.category}</p>
                                <p><strong className="text-white font-semibold">Sender:</strong> {submittedData.name} ({submittedData.email})</p>
                                <div className="mt-2 pt-2 border-t border-white/5">
                                    <p className="text-[11px] text-zinc-400 line-clamp-4 font-mono bg-black/30 p-2.5 rounded-xl whitespace-pre-wrap">
                                        {submittedData.message}
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    type="button"
                                    onClick={handleCopyMessage}
                                    className="flex-1 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                                >
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Copy Message</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleReset}
                                    className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-accent to-accent-warm text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    <span>Send Another</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Standard Contact Form */
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Inquiry Category Pills */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                                    Topic / Category <span className="text-accent">*</span>
                                </label>
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {INQUIRY_TYPES.map(cat => (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => handleSelectCategory(cat)}
                                            className={`text-[11px] font-bold px-3 py-1 rounded-xl border transition-all cursor-pointer ${
                                                inquiryType === cat
                                                    ? "bg-accent/20 text-accent border-accent/40 shadow-[0_0_12px_var(--accent-glow)]"
                                                    : "bg-white/[0.03] text-zinc-400 hover:text-white border-white/[0.06]"
                                            }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Full Name */}
                            <div className="space-y-1.5">
                                <label htmlFor="contact-name" className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                                    Full Name <span className="text-accent">*</span>
                                </label>
                                <input 
                                    id="contact-name"
                                    required
                                    type="text" 
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Your name or handle"
                                    disabled={isSubmitting}
                                    className="w-full bg-bg-main border border-border-color rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-accent/60 transition-all font-medium disabled:opacity-50"
                                />
                            </div>

                            {/* Email Address */}
                            <div className="space-y-1.5">
                                <label htmlFor="contact-email" className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                                    Email Address <span className="text-accent">*</span>
                                </label>
                                <input 
                                    id="contact-email"
                                    required
                                    type="email" 
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    disabled={isSubmitting}
                                    className="w-full bg-bg-main border border-border-color rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-accent/60 transition-all font-medium disabled:opacity-50"
                                />
                            </div>

                            {/* Message */}
                            <div className="space-y-1.5">
                                <label htmlFor="contact-message" className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                                    Message <span className="text-accent">*</span>
                                </label>
                                <textarea 
                                    id="contact-message"
                                    required
                                    rows={5}
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                    placeholder="Provide detailed information regarding your inquiry..."
                                    disabled={isSubmitting}
                                    className="w-full bg-bg-main border border-border-color rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-accent/60 transition-all font-medium resize-none disabled:opacity-50"
                                />
                            </div>
                            
                            <button 
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-gradient-to-r from-accent to-accent-warm hover:from-accent-hover hover:to-accent text-white py-3.5 rounded-xl font-bold uppercase text-xs tracking-wider flex items-center justify-center gap-2 hover:shadow-[0_0_25px_var(--accent-glow)] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed shadow-md"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Preparing Transmission...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Send Inquiry</span>
                                        <Send className="w-4 h-4" />
                                    </>
                                )}
                            </button>

                            <p className="text-center text-[11px] text-zinc-500 font-medium leading-relaxed">
                                Messages are addressed directly to our team. Review our{" "}
                                <Link href="/privacy" className="text-zinc-300 hover:text-white hover:underline">
                                    Privacy Policy
                                </Link>{" "}
                                and{" "}
                                <Link href="/terms" className="text-zinc-300 hover:text-white hover:underline">
                                    DMCA Terms
                                </Link>.
                            </p>
                        </form>
                    )}
                </div>

            </div>
        </div>
    );
}
