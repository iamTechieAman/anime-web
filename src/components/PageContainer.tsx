"use client";

import React from "react";

interface PageContainerProps {
    children: React.ReactNode;
    title?: string;
    titleAccent?: string;
    description?: string;
    icon?: React.ComponentType<{ className?: string }>;
    actions?: React.ReactNode;
    className?: string;
    maxWidth?: "default" | "narrow" | "full";
}

export default function PageContainer({
    children,
    title,
    titleAccent,
    description,
    icon: Icon,
    actions,
    className = "",
    maxWidth = "default",
}: PageContainerProps) {
    const maxWidthClass = 
        maxWidth === "narrow" 
            ? "max-w-5xl" 
            : maxWidth === "full" 
            ? "max-w-full" 
            : "max-w-[1800px]";

    return (
        <div className={`flex-1 w-full bg-bg-main text-[var(--text-main)] py-6 md:py-8 px-4 sm:px-6 md:px-8 ${className}`}>
            <div className={`${maxWidthClass} mx-auto w-full flex flex-col space-y-6 md:space-y-8`}>
                {(title || description || actions) && (
                    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
                        <div>
                            {title && (
                                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white flex items-center gap-3 tracking-tight font-sora">
                                    {Icon && <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-accent shrink-0" />}
                                    <span>
                                        {title}{" "}
                                        {titleAccent && (
                                            <span className="bg-gradient-to-r from-accent to-accent-secondary bg-clip-text text-transparent">
                                                {titleAccent}
                                            </span>
                                        )}
                                    </span>
                                </h1>
                            )}
                            {description && (
                                <p className="text-zinc-400 mt-1.5 text-xs sm:text-sm font-medium max-w-2xl leading-relaxed">
                                    {description}
                                </p>
                            )}
                        </div>
                        {actions && (
                            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                                {actions}
                            </div>
                        )}
                    </header>
                )}
                {children}
            </div>
        </div>
    );
}
