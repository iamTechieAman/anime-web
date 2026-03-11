"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, Calendar, Clock } from "lucide-react";

export default function DesktopSidebar() {
    const pathname = usePathname();

    const navItems = [
        { name: "Home", href: "/", icon: Home },
        { name: "Movies", href: "/movies", icon: Compass },
        { name: "Schedule", href: "/schedule", icon: Calendar },
        { name: "History", href: "/history", icon: Clock },
    ];

    return (
        <aside className="fixed left-0 top-[70px] bottom-0 w-[72px] bg-[var(--bg-main)] border-r border-[var(--border-color)] hidden md:flex flex-col items-center py-6 gap-6 z-40">
            {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                
                return (
                    <Link 
                        key={item.href} 
                        href={item.href}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all ${
                            isActive 
                            ? "text-[var(--text-main)] bg-[var(--bg-card)] shadow-sm" 
                            : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]/50"
                        }`}
                        title={item.name}
                    >
                        <Icon className="w-5 h-5" />
                        <span className="text-[10px] font-medium hidden lg:block">{item.name}</span>
                    </Link>
                );
            })}
        </aside>
    );
}
