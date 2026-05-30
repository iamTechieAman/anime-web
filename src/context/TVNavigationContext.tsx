"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface TVNavigationContextType {
  deviceMode: "mobile" | "pc" | "tv";
  activeElement: HTMLElement | null;
}

const TVNavigationContext = createContext<TVNavigationContextType>({
  deviceMode: "pc",
  activeElement: null,
});

export const useTVNavigation = () => useContext(TVNavigationContext);

export function TVNavigationProvider({ children }: { children: React.ReactNode }) {
  const [deviceMode, setDeviceMode] = useState<"mobile" | "pc" | "tv">("pc");
  const [activeElement, setActiveElement] = useState<HTMLElement | null>(null);

  // Detect TV Device
  useEffect(() => {
    const detectDevice = () => {
      if (typeof window !== "undefined") {
        const ua = navigator.userAgent;
        const width = window.innerWidth;
        const isTVUA = /SmartTV|GoogleTV|AppleTV|Roku|CastTV|Tizen|Web0S|NetCast|Opera TV|Viera|Bravia|PlayStation|Xbox/i.test(ua);
        if (isTVUA || width >= 2500) {
          setDeviceMode("tv");
          document.body.classList.add("device-tv");
        } else {
          document.body.classList.remove("device-tv");
          if (width < 1024) {
            setDeviceMode("mobile");
          } else {
            setDeviceMode("pc");
          }
        }
      }
    };
    detectDevice();
    window.addEventListener("resize", detectDevice);
    return () => window.removeEventListener("resize", detectDevice);
  }, []);

  // Spatial navigation engine
  useEffect(() => {
    if (deviceMode !== "tv") return;

    // Track active element focus
    const handleFocus = (e: FocusEvent) => {
      setActiveElement(e.target as HTMLElement);
    };
    document.addEventListener("focusin", handleFocus);

    // Initial focus setup
    const initialFocusTimer = setTimeout(() => {
      if (typeof document !== "undefined" && (!document.activeElement || document.activeElement === document.body)) {
        const firstFocusable = document.querySelector<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex="0"]'
        );
        if (firstFocusable) firstFocusable.focus();
      }
    }, 1500);

    const getDistance = (curr: DOMRect, cand: DOMRect, direction: string): number => {
      const currCX = curr.left + curr.width / 2;
      const currCY = curr.top + curr.height / 2;
      const candCX = cand.left + cand.width / 2;
      const candCY = cand.top + cand.height / 2;

      let primary = 0;
      let secondary = 0;

      switch (direction) {
        case "left":
          primary = currCX - candCX;
          secondary = Math.abs(currCY - candCY);
          break;
        case "right":
          primary = candCX - currCX;
          secondary = Math.abs(currCY - candCY);
          break;
        case "up":
          primary = currCY - candCY;
          secondary = Math.abs(currCX - candCX);
          break;
        case "down":
          primary = candCY - currCY;
          secondary = Math.abs(currCX - candCX);
          break;
      }

      // If candidate is not in the correct direction half-plane, return infinity
      if (primary <= 0) return Infinity;

      // Primary distance is much more important than orthogonal alignment
      return primary * 2.5 + secondary;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const keys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", "Backspace", "Escape"];
      if (!keys.includes(e.key)) return;

      const activeEl = document.activeElement as HTMLElement;
      if (!activeEl) return;

      // Handle Backspace/Escape to go back
      if (e.key === "Backspace" || e.key === "Escape") {
        // Don't go back if typing in an input
        if (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA") return;
        e.preventDefault();
        window.history.back();
        return;
      }

      // If active element is input, let Left/Right arrow keys navigate text inside the input
      if (
        (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA") &&
        (e.key === "ArrowLeft" || e.key === "ArrowRight")
      ) {
        return;
      }

      if (e.key === "Enter") {
        // Let normal click propagate, but make sure Enter triggers action on non-links/buttons if needed
        return;
      }

      // Map arrow keys to directions
      const directionMap: Record<string, string> = {
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowUp: "up",
        ArrowDown: "down",
      };
      const direction = directionMap[e.key];
      if (!direction) return;

      // Prevent window default scrolling
      e.preventDefault();

      // Find all focusable candidates
      const candidates = Array.from(
        document.querySelectorAll<HTMLElement>(
          'a, button, input, select, [tabindex="0"], [data-focusable="true"]'
        )
      );

      const activeRect = activeEl.getBoundingClientRect();

      let bestCandidate: HTMLElement | null = null;
      let minDistance = Infinity;

      candidates.forEach((cand) => {
        if (cand === activeEl) return;

        // Visibility check
        const rect = cand.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        const style = window.getComputedStyle(cand);
        if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return;
        if ((cand as any).disabled) return;

        const distance = getDistance(activeRect, rect, direction);
        if (distance < minDistance) {
          minDistance = distance;
          bestCandidate = cand;
        }
      });

      if (bestCandidate) {
        (bestCandidate as HTMLElement).focus();
        // Smooth scroll focused element into view, aligning it nicely in the viewport
        (bestCandidate as HTMLElement).scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "center",
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("focusin", handleFocus);
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(initialFocusTimer);
    };
  }, [deviceMode]);

  return (
    <TVNavigationContext.Provider value={{ deviceMode, activeElement }}>
      {children}
    </TVNavigationContext.Provider>
  );
}
