"use client";

import React, { useState, useEffect, useRef } from "react";

interface LazySectionProps {
    children: React.ReactNode;
    height?: string;
}

export default function LazySection({ children, height = "260px" }: LazySectionProps) {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { 
                rootMargin: "300px 0px", // Trigger loading slightly before it enters the viewport
                threshold: 0.01 
            }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        <div ref={ref} style={{ minHeight: isVisible ? "auto" : height }} className="w-full">
            {isVisible ? children : (
                <div className="w-full h-[200px] flex items-center justify-center bg-[#12131A]/10 rounded-2xl animate-pulse">
                    <div className="w-12 h-12 rounded-full border-2 border-white/5 border-t-orange-500/40 animate-spin" />
                </div>
            )}
        </div>
    );
}
