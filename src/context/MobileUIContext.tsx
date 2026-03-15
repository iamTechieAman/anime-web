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
    showProfileSettings: boolean;
    setShowProfileSettings: (open: boolean) => void;
}

const MobileUIContext = createContext<MobileUIContextType | undefined>(undefined);

export function MobileUIProvider({ children }: { children: ReactNode }) {
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showProfileSettings, setShowProfileSettings] = useState(false);

    // Handle Android Back Button
    useEffect(() => {
        let backListener: any = null;

        const setupListener = async () => {
            backListener = await App.addListener('backButton', ({ canGoBack }: { canGoBack: boolean }) => {
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
    }, [isSearchOpen, isMenuOpen]);

    // Force Dark Mode
    useEffect(() => {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
    }, []);

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
            showProfileSettings,
            setShowProfileSettings,
            theme: 'dark',
            toggleTheme: () => {} // No-op
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
