"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

import { App } from '@capacitor/app';

interface MobileUIContextType {
    isSearchOpen: boolean;
    isMenuOpen: boolean;
    toggleSearch: () => void;
    toggleMenu: () => void;
    closeAll: () => void;
    setSearchOpen: (isOpen: boolean) => void;
    setMenuOpen: (isOpen: boolean) => void;
    theme: 'dark' | 'light';
    toggleTheme: () => void;
}

const MobileUIContext = createContext<MobileUIContextType | undefined>(undefined);

export function MobileUIProvider({ children }: { children: ReactNode }) {
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');

    // Handle Android Back Button
    useEffect(() => {
        let backListener: any = null;

        const setupListener = async () => {
            backListener = await App.addListener('backButton', ({ canGoBack }: { canGoBack: boolean }) => {
                // If any overlay is open, close it instead of going back or exiting
                if (isSearchOpen || isMenuOpen) {
                    setIsSearchOpen(false);
                    setIsMenuOpen(false);
                    return;
                }

                if (canGoBack) {
                    window.history.back();
                } else {
                    App.exitApp();
                }
            });
        };

        if (typeof window !== 'undefined') {
            setupListener();
        }

        return () => {
            if (backListener) {
                backListener.remove();
            }
        };
    }, [isSearchOpen, isMenuOpen]); // We still need deps because the listener callback closure needs latest state

    // Initialize theme from local storage or system preference
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
        if (savedTheme) {
            setTheme(savedTheme);
            document.documentElement.classList.toggle('dark', savedTheme === 'dark');
        } else {
            const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            setTheme(systemPrefersDark ? 'dark' : 'light');
            document.documentElement.classList.toggle('dark', systemPrefersDark);
        }
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
    };

    // Prevent scrolling when modals are open
    useEffect(() => {
        if (isSearchOpen || isMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isSearchOpen, isMenuOpen]);

    const toggleSearch = () => {
        if (!isSearchOpen) {
            setIsMenuOpen(false);
            setIsSearchOpen(true);
        } else {
            setIsSearchOpen(false);
        }
    };

    const toggleMenu = () => {
        if (!isMenuOpen) {
            setIsSearchOpen(false);
            setIsMenuOpen(true);
        } else {
            setIsMenuOpen(false);
        }
    };

    const closeAll = () => {
        setIsSearchOpen(false);
        setIsMenuOpen(false);
    };

    return (
        <MobileUIContext.Provider value={{
            isSearchOpen,
            isMenuOpen,
            toggleSearch,
            toggleMenu,
            closeAll,
            setSearchOpen: setIsSearchOpen,
            setMenuOpen: setIsMenuOpen,
            theme,
            toggleTheme
        }}>
            {children}
        </MobileUIContext.Provider>
    );
}

export function useMobileUI() {
    const context = useContext(MobileUIContext);
    if (context === undefined) {
        throw new Error('useMobileUI must be used within a MobileUIProvider');
    }
    return context;
}
