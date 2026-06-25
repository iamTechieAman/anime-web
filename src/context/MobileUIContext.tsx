"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';


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
        let active = true;
        let listenerInstance: any = null;

        const setupListener = async () => {
            try {
                // Only import and use Capacitor if we are in a browser environment
                if (typeof window !== 'undefined') {
                    const { App } = await import('@capacitor/app');
                    if (!active) return;
                    
                    listenerInstance = await App.addListener('backButton', ({ canGoBack }: { canGoBack: boolean }) => {
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

                    if (!active && listenerInstance) {
                        listenerInstance.remove();
                    }
                }
            } catch (error) {
                console.warn("[MobileUIContext] Capacitor App plugin not available:", error);
            }
        };

        setupListener();

        return () => {
            active = false;
            if (listenerInstance) {
                try {
                    listenerInstance.remove();
                } catch (e) {}
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
