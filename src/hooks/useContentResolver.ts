"use client";

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { detectMediaType } from "@/utils/mediaType";

export interface UnifiedContent {
    id: string;
    type: "movie" | "tv" | "anime";
    title: string;
    description: string;
    poster: string;
    backdrop: string;
    year: string;
    rating: number;
    genres: any[];
    cast: any[];
    runtime: number;
    trailer: string | null;
    isAnime: boolean;
    availableEpisodesDetail?: any;
    malId?: string;
    aniListId?: string;
    provider?: string;
    seasons?: any[];
}

export interface ResolverResult {
    content: UnifiedContent | null;
    loading: boolean;
    error: string | null;
    detectedType: "movie" | "tv" | "anime" | null;
}

/**
 * Universal Content Resolver
 * 
 * 1. Validate ID
 * 2. Detect Type
 * 3. Fetch Metadata
 * 4. Return Unified Object
 */
export function useContentResolver(rawId: string, providedType?: string, provider?: string): ResolverResult {
    const [content, setContent] = useState<UnifiedContent | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [detectedType, setDetectedType] = useState<"movie" | "tv" | "anime" | null>(null);
    const processingId = useRef<string | null>(null);

    useEffect(() => {
        if (!rawId || rawId === "undefined" || rawId === "null") {
            setError("Invalid ID provided.");
            setLoading(false);
            return;
        }

        const controller = new AbortController();
        const resolve = async () => {
            if (processingId.current === rawId) return;
            processingId.current = rawId;
            setLoading(true);
            setError(null);
            
            try {
                const id = rawId.includes(':') ? rawId.split(':').pop()! : rawId;
                
                // 1. Detect Type
                let typeToFetch = providedType === "cartoon" ? "tv" : (providedType || "movie");
                const isExplicitAnime = providedType === "anime" || !!provider;

                console.log(`[GlobalClickDebugger] 🔍 RESOLVER START ID: ${id} | Type: ${typeToFetch}`);

                let unified: Partial<UnifiedContent> = { id };

                if (isExplicitAnime) {
                    typeToFetch = "anime";
                    // Fetch Anime Metadata
                    const res = await axios.get(`/api/anime/episodes?id=${id}&provider=${provider || ''}`, {
                        signal: controller.signal,
                        timeout: 15000
                    });

                    if (controller.signal.aborted) return;
                    const show = res.data.show;
                    if (!show) throw new Error("No show data received");

                    // Validate ID
                    if (String(show.id) !== String(id) && String(show.showId) !== String(id) && !provider) {
                        console.error('[UniversalResolver] ID Mismatch', { requested: id, received: show.id });
                        throw new Error("CONTENT_MISMATCH");
                    }

                    unified = {
                        id,
                        type: "anime",
                        title: show.name || show.englishName,
                        description: show.description,
                        poster: show.thumbnail || show.image,
                        backdrop: show.thumbnail || show.image,
                        year: "",
                        rating: 0,
                        genres: [],
                        cast: [],
                        runtime: 0,
                        trailer: null,
                        isAnime: true,
                        availableEpisodesDetail: show.availableEpisodesDetail,
                        malId: show.malId,
                        aniListId: show.aniListId,
                        provider: show.provider || provider
                    };
                } else {
                    // Fetch TMDB Metadata
                    const res = await axios.get(`/api/prime/details?id=${id}&type=${typeToFetch}`, { signal: controller.signal });
                    if (controller.signal.aborted) return;
                    
                    const data = res.data;
                    if (!data) throw new Error("No TMDB data received");

                    // Validate ID
                    if (String(data.id) !== String(id)) {
                        console.error('[UniversalResolver] ID Mismatch', { requested: id, received: data.id });
                        throw new Error("CONTENT_MISMATCH");
                    }

                    // Strict Type Detection using utility
                    const detected = detectMediaType(data);
                    
                    unified = {
                        id,
                        type: detected,
                        title: data.title || data.name,
                        description: data.overview,
                        poster: data.poster_path,
                        backdrop: data.backdrop_path,
                        year: (data.release_date || data.first_air_date || "").slice(0, 4),
                        rating: data.vote_average,
                        genres: data.genres || [],
                        cast: data.cast || [],
                        runtime: data.runtime || 0,
                        trailer: data.trailer,
                        isAnime: detected === "anime",
                        seasons: data.seasons || []
                    };
                }

                console.log(`[GlobalClickDebugger] ✅ RESOLVER SUCCESS ID: ${id} | UnifiedType: ${unified.type}`);
                
                setContent(unified as UnifiedContent);
                setDetectedType(unified.type as "movie" | "tv" | "anime");
            } catch (err: any) {
                if (axios.isCancel(err)) return;
                console.error("[UniversalResolver] Error:", err);
                setError(err.message === "CONTENT_MISMATCH" ? "Content ID mismatch" : "Failed to resolve content");
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                    processingId.current = null;
                }
            }
        };

        resolve();
        return () => controller.abort();
    }, [rawId, providedType, provider]);

    return { content, loading, error, detectedType };
}
