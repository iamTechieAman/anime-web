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
}

const MobileUIContext = createContext<MobileUIContextType | undefined>(undefined);

export function MobileUIProvider({ children }: { children: ReactNode }) {
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

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
        setIsSearchOpen(prev => !prev);
        if (!isSearchOpen) setIsMenuOpen(false); // Close menu if opening search
    };

    const toggleMenu = () => {
        setIsMenuOpen(prev => !prev);
        if (!isMenuOpen) setIsSearchOpen(false); // Close search if opening menu
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
            setMenuOpen: setIsMenuOpen
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
