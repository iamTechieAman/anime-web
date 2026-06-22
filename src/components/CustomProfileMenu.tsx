"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { User, Bookmark, Clock, LogOut, Settings } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useMobileUI } from "@/context/MobileUIContext";
import UserAvatar from "./UserAvatar";

interface CustomProfileMenuProps {
  buttonClassName?: string;
}

export default function CustomProfileMenu({ buttonClassName = "" }: CustomProfileMenuProps) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const { setShowProfileSettings } = useMobileUI();

  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const initials = user ? ((user.firstName?.[0] || "") + (user.lastName?.[0] || "")).toUpperCase() || "U" : "U";

  const menuItems = [
    { label: "Watchlist", icon: Bookmark, href: "/watchlist", color: "text-pink-400" },
    { label: "Watch History", icon: Clock, href: "/history", color: "text-[var(--accent)]" },
    { label: "Profile Settings", icon: Settings, href: "/settings", color: "text-blue-400" },
    { label: "Switch Profile", icon: User, action: () => window.dispatchEvent(new Event("openProfileGate")), color: "text-purple-400" },
    { label: "Sign Out", icon: LogOut, action: () => signOut(() => router.push("/", { scroll: false })), color: "text-red-400" },
  ];

  const updateMenuPosition = useCallback(() => {
    if (isOpen && buttonRef.current && menuRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const menuRect = menuRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      const spaceBelow = viewportHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;
      
      let top = buttonRect.bottom + 8;
      let isFlipped = false;

      // Auto-flip if not enough space below but enough space above
      if (spaceBelow < menuRect.height + 20 && spaceAbove > menuRect.height + 20) {
        top = buttonRect.top - menuRect.height - 8;
        isFlipped = true;
      }

      // Constrain to viewport bounds to prevent clipping
      if (top + menuRect.height > viewportHeight && !isFlipped) {
        top = viewportHeight - menuRect.height - 16;
      }

      // Align right
      let right = viewportWidth - buttonRect.right;
      if (right < 16) right = 16;

      const maxWidth = viewportWidth < 768 ? viewportWidth * 0.9 : 320;
      if (right + maxWidth > viewportWidth) {
          right = viewportWidth - maxWidth - 16;
      }

      setMenuStyle({
        position: 'fixed',
        top: `${top}px`,
        right: `${right}px`,
        zIndex: 9999,
        transformOrigin: isFlipped ? 'bottom right' : 'top right'
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      // Small delay to allow the menu to render and get its size
      setTimeout(updateMenuPosition, 0);
      window.addEventListener('scroll', updateMenuPosition, true);
      window.addEventListener('resize', updateMenuPosition);
    }

    return () => {
      window.removeEventListener('scroll', updateMenuPosition, true);
      window.removeEventListener('resize', updateMenuPosition);
    };
  }, [isOpen, updateMenuPosition]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && 
          menuRef.current && 
          !menuRef.current.contains(event.target as Node) &&
          buttonRef.current &&
          !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.focus();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex(prev => (prev < menuItems.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex(prev => (prev > 0 ? prev - 1 : menuItems.length - 1));
      } else if (e.key === "Enter" && focusedIndex !== -1) {
        e.preventDefault();
        const item = menuItems[focusedIndex];
        if (item.href) {
          router.push(item.href, { scroll: false });
        } else if (item.action) {
          item.action();
        }
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, focusedIndex, menuItems, router]);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
    setFocusedIndex(-1);
  };

  if (!isMounted || !user) return null;

  return (
    <>
      <button
        ref={buttonRef}
        onClick={toggleMenu}
        className={`relative w-9 h-9 rounded-full ring-2 ring-[var(--accent)]/40 shadow-[0_0_12px_var(--accent-glow)] overflow-hidden transition-transform active:scale-95 ${buttonClassName}`}
      >
        <UserAvatar 
          src={user.imageUrl} 
          alt={user.fullName || "User"} 
          initials={initials} 
          size={40} 
          className="w-full h-full rounded-full" 
        />
      </button>

      {isMounted && createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              style={menuStyle}
              className="bg-[#141419]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_20px_50px_-10px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col w-[90vw] md:w-[320px]"
            >
              {/* Header */}
              <div className="p-4 border-b border-white/5 flex items-center gap-3 bg-white/5">
                <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0">
                  <UserAvatar 
                    src={user.imageUrl} 
                    alt={user.fullName || "User"} 
                    initials={initials} 
                    size={40} 
                    className="w-full h-full" 
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-white truncate">{user.fullName || "User"}</span>
                  <span className="text-[10px] text-zinc-400 truncate">{user.primaryEmailAddress?.emailAddress}</span>
                </div>
              </div>

              {/* Menu Items */}
              <div className="p-2 flex flex-col gap-1">
                {menuItems.map((item, index) => {
                  const isFocused = focusedIndex === index;
                  const Icon = item.icon;

                  const content = (
                    <>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isFocused ? 'bg-white/10' : 'bg-white/5'} transition-colors`}>
                        <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                      </div>
                      <span className="text-xs font-bold text-white">{item.label}</span>
                    </>
                  );

                  const className = `flex items-center gap-3 p-2 rounded-xl transition-all cursor-pointer ${
                    isFocused ? "bg-[var(--accent)]/10 border-[var(--accent)]/20" : "hover:bg-white/5 border-transparent"
                  } border w-full text-left`;

                  if (item.href) {
                    return (
                      <Link
                        key={item.label}
                        href={item.href}
                        className={className}
                        onClick={() => setIsOpen(false)}
                        onMouseEnter={() => setFocusedIndex(index)}
                      >
                        {content}
                      </Link>
                    );
                  }

                  return (
                    <button
                      key={item.label}
                      className={className}
                      onClick={() => {
                        if (item.action) item.action();
                        setIsOpen(false);
                      }}
                      onMouseEnter={() => setFocusedIndex(index)}
                    >
                      {content}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
