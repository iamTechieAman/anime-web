"use client";

import React, { useState, useEffect, useRef } from "react";
import { RowSkeleton } from "@/components/SkeletonLoader";

interface LazySectionProps {
    children: React.ReactNode;
    height?: string;
    fallback?: React.ReactNode;
}

export default function LazySection({ children, height = "260px", fallback }: LazySectionProps) {
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
                rootMargin: "350px 0px", // Trigger loading before it enters the viewport
                threshold: 0.01 
            }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        <div ref={ref} style={{ minHeight: isVisible ? "auto" : height }} className="w-full">
            {isVisible ? children : (fallback || <RowSkeleton count={6} />)}
        </div>
    );
}
