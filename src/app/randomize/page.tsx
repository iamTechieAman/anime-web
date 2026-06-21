"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";

export default function RandomizePage() {
  const router = useRouter();
  const [statusText, setStatusText] = useState("Consulting the stars of destiny...");

  useEffect(() => {
    let active = true;

    const findRandomShow = async () => {
      try {
        // 1. Pick a random media type (movie vs tv)
        const mediaType = Math.random() > 0.5 ? "movie" : "tv";
        
        // 2. Pick a random page to keep things fresh
        const randomPage = Math.floor(Math.random() * 20) + 1;

        if (active) setStatusText(`Scanning ${mediaType === "movie" ? "blockbuster movies" : "acclaimed shows"} (page ${randomPage})...`);

        // 3. Query our discover endpoint
        const response = await axios.get(`/api/prime/discover`, {
          params: {
            media_type: mediaType,
            page: String(randomPage),
            sort_by: "popularity.desc",
            watch_region: "US"
          }
        });

        const results = response.data.results || [];
        if (results.length > 0) {
          const randomIndex = Math.floor(Math.random() * results.length);
          const item = results[randomIndex];
          const targetId = item.id;
          
          if (active) {
              setStatusText(`Destiny selected: "${item.title || item.name}"! Shuttling you there...`);
              toast.success(`Fate chose: ${item.title || item.name}!`, { icon: "✨" });
              
              setTimeout(() => {
                if (active) router.replace(`/watch/${mediaType}/${targetId}`);
              }, 1200);
          }
        } else {
          throw new Error("Empty pool");
        }
      } catch (err) {
        console.error("Dynamic random discovery failed:", err);
        // Fallback to static pool
        const staticPool = [
          "tv/31911", "tv/37854", "tv/46260", "tv/85937", "tv/95479", "movie/129", "movie/372058", "movie/155", "tv/1396"
        ];
        const pick = staticPool[Math.floor(Math.random() * staticPool.length)];
        const [type, id] = pick.split("/");
        if (active) {
            setStatusText("Restoring static timeline fallback...");
            setTimeout(() => {
              if (active) router.replace(`/watch/${type}/${id}`);
            }, 1000);
        }
      }
    };

    findRandomShow();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-4">
      <div className="relative w-24 h-24 mb-6">
        <div className="absolute inset-0 border-4 border-pink-500/20 rounded-full animate-ping"></div>
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-card)] border border-[var(--border-color)] rounded-full shadow-[0_0_30px_rgba(236,72,153,0.35)]">
          <Loader2 className="w-10 h-10 text-pink-500 animate-spin" />
        </div>
      </div>
      <h1 className="text-2xl md:text-3xl font-black font-sora text-white tracking-tighter mb-2 text-center flex items-center gap-2">
        <Sparkles className="w-6 h-6 text-pink-500 animate-pulse" />
        Feeling Lucky?
      </h1>
      <p className="text-zinc-400 text-xs md:text-sm font-bold uppercase tracking-wider animate-pulse text-center max-w-md mt-1">
        {statusText}
      </p>
    </div>
  );
}
