"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";

export type DeviceCategory = 
  | "small-phone" 
  | "large-phone" 
  | "foldable" 
  | "tablet" 
  | "ipad" 
  | "laptop" 
  | "desktop" 
  | "ultrawide" 
  | "tv";

export type PerformanceTier = "low" | "mid" | "high";

interface TVNavigationContextType {
  deviceMode: "mobile" | "pc" | "tv";
  deviceCategory: DeviceCategory;
  performanceTier: PerformanceTier;
  isLowEnd: boolean;
  activeElement: HTMLElement | null;
  registerFocusGroup: (groupId: string, defaultElement: HTMLElement) => void;
}

const TVNavigationContext = createContext<TVNavigationContextType>({
  deviceMode: "pc",
  deviceCategory: "desktop",
  performanceTier: "high",
  isLowEnd: false,
  activeElement: null,
  registerFocusGroup: () => {},
});

export const useTVNavigation = () => useContext(TVNavigationContext);

export function TVNavigationProvider({ children }: { children: React.ReactNode }) {
  const [deviceMode, setDeviceMode] = useState<"mobile" | "pc" | "tv">("pc");
  const [deviceCategory, setDeviceCategory] = useState<DeviceCategory>("desktop");
  const [performanceTier, setPerformanceTier] = useState<PerformanceTier>("high");
  const [activeElement, setActiveElement] = useState<HTMLElement | null>(null);

  const isLowEnd = performanceTier === "low";

  // Focus Memory Registry: maps group-id to last focused element or unique identifier (e.g. data-focus-id)
  const focusGroupsRef = useRef<Map<string, string>>(new Map());
  const lastFocusedCoordsRef = useRef<{ x: number; y: number } | null>(null);

  // Register focus state of group
  const registerFocusGroup = (groupId: string, element: HTMLElement) => {
    const focusId = element.getAttribute("data-focus-id") || element.id;
    if (focusId) {
      focusGroupsRef.current.set(groupId, focusId);
    }
  };

  // 1. Device Category & Performance Profiler
  useEffect(() => {
    const detectDeviceAndProfile = () => {
      if (typeof window === "undefined") return;

      const ua = navigator.userAgent;
      const width = window.innerWidth;
      const height = window.innerHeight;

      // ─── DEVICE CATEGORIES ───
      const isTVUA = /SmartTV|GoogleTV|AppleTV|Roku|CastTV|Tizen|Web0S|NetCast|Opera TV|Viera|Bravia|PlayStation|Xbox/i.test(ua);
      
      let category: DeviceCategory = "desktop";
      let mode: "mobile" | "pc" | "tv" = "pc";

      if (isTVUA || width >= 2500) {
        category = "tv";
        mode = "tv";
      } else if (width < 360) {
        category = "small-phone";
        mode = "mobile";
      } else if (width >= 360 && width < 600) {
        category = "large-phone";
        mode = "mobile";
      } else if (width >= 600 && width < 768) {
        category = "foldable";
        mode = "mobile";
      } else if (width >= 768 && width < 1024) {
        // iPad vs Standard Tablet
        const isIPad = /iPad|Macintosh/i.test(ua) && navigator.maxTouchPoints > 0;
        category = isIPad ? "ipad" : "tablet";
        mode = "mobile";
      } else if (width >= 1024 && width < 1440) {
        category = "laptop";
        mode = "pc";
      } else if (width >= 1440 && width < 2560) {
        category = "desktop";
        mode = "pc";
      } else {
        category = "ultrawide";
        mode = "pc";
      }

      setDeviceMode(mode);
      setDeviceCategory(category);

      // Apply body classes for CSS targeting
      const docEl = document.documentElement;
      // Remove previous categories
      const classesToRemove = Array.from(docEl.classList).filter(c => c.startsWith("device-") || c.startsWith("perf-"));
      classesToRemove.forEach(c => docEl.classList.remove(c));

      docEl.classList.add(`device-${category}`);
      if (mode === "tv") docEl.classList.add("device-tv");

      // ─── PERFORMANCE TIERS ───
      let ram = 8; // Default fallback
      let cores = 8; // Default fallback
      let isSaveData = false;

      if ("deviceMemory" in navigator) {
        ram = (navigator as any).deviceMemory;
      }
      if ("hardwareConcurrency" in navigator) {
        cores = navigator.hardwareConcurrency;
      }
      if ("connection" in navigator) {
        const conn = (navigator as any).connection;
        isSaveData = conn.saveData || conn.effectiveType === "2g" || conn.effectiveType === "3g";
      }

      let tier: PerformanceTier = "high";
      if (isTVUA || isSaveData || ram <= 4 || cores <= 4) {
        tier = "low";
      } else if (ram <= 8 || cores <= 8) {
        tier = "mid";
      }

      setPerformanceTier(tier);
      docEl.classList.add(`perf-${tier}`);
      if (tier === "low") {
        docEl.classList.add("performance-low-end");
      } else {
        docEl.classList.remove("performance-low-end");
      }
    };

    detectDeviceAndProfile();
    window.addEventListener("resize", detectDeviceAndProfile);
    return () => window.removeEventListener("resize", detectDeviceAndProfile);
  }, []);

  // 2. Spatial Navigation & Key Events (TV / D-Pad mode)
  useEffect(() => {
    if (deviceMode !== "tv") return;

    // Track active element focus
    const handleFocus = (e: FocusEvent) => {
      const el = e.target as HTMLElement;
      setActiveElement(el);
      
      const rect = el.getBoundingClientRect();
      lastFocusedCoordsRef.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };

      // Focus memory: Save group selection
      const focusGroup = el.getAttribute("data-focus-group");
      const focusId = el.getAttribute("data-focus-id") || el.id;
      if (focusGroup && focusId) {
        focusGroupsRef.current.set(focusGroup, focusId);
      }
    };
    document.addEventListener("focusin", handleFocus);

    // Focus recovery engine
    const focusRecoveryInterval = setInterval(() => {
      if (typeof document === "undefined") return;

      const active = document.activeElement;
      if (!active || active === document.body) {
        // Lost focus! Recover focus based on last coordinates
        const coords = lastFocusedCoordsRef.current;
        const candidates = Array.from(
          document.querySelectorAll<HTMLElement>(
            'a, button, input, select, [tabindex="0"], [data-focusable="true"]'
          )
        ).filter(c => {
          const style = window.getComputedStyle(c);
          const rect = c.getBoundingClientRect();
          return (
            rect.width > 0 && 
            rect.height > 0 && 
            style.display !== "none" && 
            style.visibility !== "hidden" && 
            !(c as any).disabled
          );
        });

        if (candidates.length === 0) return;

        let bestCandidate = candidates[0];
        if (coords) {
          let minDistance = Infinity;
          candidates.forEach(cand => {
            const r = cand.getBoundingClientRect();
            const cx = r.left + r.width / 2;
            const cy = r.top + r.height / 2;
            const dist = Math.hypot(cx - coords.x, cy - coords.y);
            if (dist < minDistance) {
              minDistance = dist;
              bestCandidate = cand;
            }
          });
        }
        bestCandidate.focus();
      }
    }, 1000);

    // Helper: calculate distance metrics
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

      if (primary <= 0) return Infinity;
      return primary * 2.5 + secondary;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const keys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", "Backspace", "Escape"];
      if (!keys.includes(e.key)) return;

      const activeEl = document.activeElement as HTMLElement;
      if (!activeEl) return;

      // Detect if user is active in the player container or full-screen video
      const isInsidePlayer = activeEl.closest(".artplayer-app") || activeEl.closest("iframe") || activeEl.closest(".video-player-container");

      // Remote Keys inside Video Player: intercept arrow navigation and map to OSD playback
      if (isInsidePlayer) {
        // Let the player controls handle left/right seeking and up/down HUD OSD toggle
        if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter"].includes(e.key)) {
          // Send messaging to parent WatchClient to trigger action overlays or direct API
          const event = new CustomEvent("tv-player-control", { detail: { key: e.key } });
          window.dispatchEvent(event);
          
          // Prevent default only if seeking or toggling controls so we don't move focus out of screen
          if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();
            return;
          }
        }
      }

      // Input specific filters
      if (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA") {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") return;
      }

      if (e.key === "Backspace" || e.key === "Escape") {
        if (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA") return;
        e.preventDefault();
        window.history.back();
        return;
      }

      const directionMap: Record<string, string> = {
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowUp: "up",
        ArrowDown: "down",
      };
      const direction = directionMap[e.key];
      if (!direction) return;

      e.preventDefault();

      // Find focusable candidates
      const candidates = Array.from(
        document.querySelectorAll<HTMLElement>(
          'a, button, input, select, [tabindex="0"], [data-focusable="true"]'
        )
      ).filter(c => {
        if (c === activeEl) return false;
        const rect = c.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return false;

        const style = window.getComputedStyle(c);
        if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
        if ((c as any).disabled) return false;
        return true;
      });

      const activeRect = activeEl.getBoundingClientRect();
      let bestCandidate: HTMLElement | null = null;
      let minDistance = Infinity;

      candidates.forEach(cand => {
        const rect = cand.getBoundingClientRect();
        const distance = getDistance(activeRect, rect, direction);
        if (distance < minDistance) {
          minDistance = distance;
          bestCandidate = cand;
        }
      });

      if (bestCandidate) {
        const destGroup = (bestCandidate as HTMLElement).getAttribute("data-focus-group");
        
        // Focus Memory redirection: If moving into a group, check if we have a saved element
        if (destGroup) {
          const cachedId = focusGroupsRef.current.get(destGroup);
          if (cachedId) {
            const memorizedEl = candidates.find(c => c.getAttribute("data-focus-id") === cachedId || c.id === cachedId);
            if (memorizedEl && memorizedEl !== activeEl) {
              bestCandidate = memorizedEl;
            }
          }
        }

        bestCandidate.focus();
        bestCandidate.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "center",
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("focusin", handleFocus);
      clearInterval(focusRecoveryInterval);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [deviceMode]);

  return (
    <TVNavigationContext.Provider 
      value={{ 
        deviceMode, 
        deviceCategory, 
        performanceTier, 
        isLowEnd, 
        activeElement,
        registerFocusGroup
      }}
    >
      {children}
    </TVNavigationContext.Provider>
  );
}
