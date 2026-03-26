"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

interface AdBlockContextType {
  isAdBlockEnabled: boolean;
  toggleAdBlock: () => void;
}

const AdBlockContext = createContext<AdBlockContextType>({
  isAdBlockEnabled: true,
  toggleAdBlock: () => {},
});

export const useAdBlock = () => useContext(AdBlockContext);

export const AdBlockProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdBlockEnabled, setIsAdBlockEnabled] = useState(true);

  // Load state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("toonplayer_adblock");
    if (saved !== null) {
      setIsAdBlockEnabled(saved === "true");
    }
  }, []);

  const toggleAdBlock = useCallback(() => {
    setIsAdBlockEnabled(prev => {
        const next = !prev;
        localStorage.setItem("toonplayer_adblock", next.toString());
        return next;
    });
  }, []);

  // Ad-blocking CSS injection and MutationObserver removed to ensure raw experience
  // and resolve persistent "disable sandbox" errors from external providers.

  // Background ad-hiding CSS is retained as it's less intrusive
  // Redirection & Window Management removed as requested to solve sandbox issues

  return (
    <AdBlockContext.Provider value={{ isAdBlockEnabled, toggleAdBlock }}>
      {children}
    </AdBlockContext.Provider>
  );
};
