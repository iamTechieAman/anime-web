import { NextResponse } from "next/server";
import axios from "axios";
import fs from "fs/promises";
import path from "path";

// This endpoint accepts a natural language prompt and returns recommended content.
// It is designed to use OpenAI if an API key is present, but gracefully falls back
// to a robust local NLP keyword extractor that uses TMDB to find relevant results.
// If TMDB is unavailable or times out (common on restricted ISP networks), it falls
// back to local pre-rendered catalog items in public/data/.

const TMDB_SEARCH_URL = "https://api.themoviedb.org/3/search/multi";
const TMDB_DISCOVER_MOVIE = "https://api.themoviedb.org/3/discover/movie";
const TMDB_DISCOVER_TV = "https://api.themoviedb.org/3/discover/tv";
const TMDB_API_KEY = process.env.TMDB_API_KEY || "a46c50a0ccb1bafe2b15665df7fad7e1";

// Extract keywords to mock NLP
function extractKeywords(prompt: string): string[] {
    const stopwords = [
        "i", "want", "to", "watch", "a", "some", "the", "with", "and", "or", "but", 
        "in", "on", "at", "good", "best", "like", "similar", "movie", "movies", 
        "show", "shows", "anime", "series", "recommend", "me", "find", "give"
    ];
    return prompt
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopwords.includes(word));
}

// Map keywords to TMDB Genres (Mock AI Classification)
const GENRE_MAP: Record<string, string> = {
    "action": "28", "adventure": "12", "animation": "16", "anime": "16", "comedy": "35", "funny": "35",
    "crime": "80", "documentary": "99", "drama": "18", "sad": "18", "emotional": "18",
    "family": "10751", "fantasy": "14", "magic": "14", "history": "36", "historical": "36",
    "horror": "27", "scary": "27", "music": "10402", "mystery": "9648", "romance": "10749",
    "romantic": "10749", "love": "10749", "sci-fi": "878", "scifi": "878", "cyberpunk": "878",
    "space": "878", "thriller": "53", "war": "10752", "western": "37"
};

// Fallback search over local public/data JSON files
async function searchLocalFallback(prompt: string, keywords: string[]): Promise<any[]> {
    try {
        const dataDir = path.join(process.cwd(), "public", "data");
        const lowerPrompt = prompt.toLowerCase();

        let primaryFile = "popular_movies.json";
        if (lowerPrompt.includes("anime") || lowerPrompt.includes("ghibli") || lowerPrompt.includes("animation")) {
            primaryFile = "genre_animation.json";
        } else if (lowerPrompt.includes("cyberpunk") || lowerPrompt.includes("sci-fi") || lowerPrompt.includes("scifi") || lowerPrompt.includes("space")) {
            primaryFile = "genre_scifi.json";
        } else if (lowerPrompt.includes("action") || lowerPrompt.includes("hyped") || lowerPrompt.includes("fight")) {
            primaryFile = "genre_action.json";
        } else if (lowerPrompt.includes("romance") || lowerPrompt.includes("love") || lowerPrompt.includes("sad") || lowerPrompt.includes("melancholic") || lowerPrompt.includes("drama")) {
            primaryFile = "genre_romance.json";
        } else if (lowerPrompt.includes("horror") || lowerPrompt.includes("scary") || lowerPrompt.includes("terrified") || lowerPrompt.includes("fear")) {
            primaryFile = "genre_horror.json";
        } else if (lowerPrompt.includes("comedy") || lowerPrompt.includes("chill") || lowerPrompt.includes("funny")) {
            primaryFile = "genre_comedy.json";
        } else if (lowerPrompt.includes("tv") || lowerPrompt.includes("series") || lowerPrompt.includes("kdrama")) {
            primaryFile = "tv_popular.json";
        }

        const primaryPath = path.join(dataDir, primaryFile);
        const primaryContent = await fs.readFile(primaryPath, "utf-8");
        const primaryData = JSON.parse(primaryContent);
        let items: any[] = primaryData.results || [];

        // If we have specific keywords, filter or rank by matches
        if (keywords.length > 0) {
            const matches = items.filter(item => {
                const text = `${item.title || item.name || ""} ${item.overview || ""}`.toLowerCase();
                return keywords.some(kw => text.includes(kw));
            });

            if (matches.length > 0) {
                return matches.slice(0, 10).map(item => ({
                    ...item,
                    media_type: item.media_type || (primaryFile.includes("tv") ? "tv" : "movie")
                }));
            }
        }

        return items.slice(0, 10).map(item => ({
            ...item,
            media_type: item.media_type || (primaryFile.includes("tv") ? "tv" : "movie")
        }));
    } catch (e: any) {
        console.error("[Discover API] Local fallback error:", e.message);
        return [];
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const prompt = searchParams.get("prompt") || searchParams.get("q") || searchParams.get("query") || searchParams.get("mood") || "";

    if (!prompt || prompt.trim().length < 2) {
        return NextResponse.json({ results: [], error: "Prompt too short" }, { status: 400 });
    }

    const keywords = extractKeywords(prompt);

    try {
        const openaiKey = process.env.OPENAI_API_KEY;

        // ---------------------------------------------------------
        // 1. OPENAI INTEGRATION (If API Key is present)
        // ---------------------------------------------------------
        if (openaiKey) {
            console.log("[AI Discover] Using OpenAI for:", prompt);
            const aiResponse = await axios.post("https://api.openai.com/v1/chat/completions", {
                model: "gpt-3.5-turbo",
                messages: [
                    { 
                        role: "system", 
                        content: "You are a movie/anime recommendation engine. Given a user's prompt, suggest 10 titles. Return ONLY a JSON array of objects with format: [{\"title\": \"Movie Name\", \"type\": \"movie\" | \"tv\" | \"anime\", \"year\": \"2023\"}]. Do not wrap in markdown."
                    },
                    { role: "user", content: prompt }
                ]
            }, {
                headers: { Authorization: `Bearer ${openaiKey}` },
                timeout: 3000
            });

            const recommendations = JSON.parse(aiResponse.data.choices[0].message.content);
            
            const mappedResults = await Promise.all(recommendations.map(async (rec: any) => {
                const searchRes = await axios.get(TMDB_SEARCH_URL, {
                    params: { api_key: TMDB_API_KEY, query: rec.title, language: "en-US", page: 1 },
                    timeout: 2500
                });
                const item = searchRes.data.results?.[0];
                if (!item) return null;
                
                return {
                    ...item,
                    media_type: item.media_type || (rec.type === "tv" || rec.type === "anime" ? "tv" : "movie")
                };
            }));

            const filtered = mappedResults.filter(Boolean);
            if (filtered.length > 0) {
                return NextResponse.json({ results: filtered });
            }
        }

        // ---------------------------------------------------------
        // 2. TMDB Keyword / Discover Mapping
        // ---------------------------------------------------------
        console.log("[AI Discover] Querying TMDB for:", prompt);
        const isAnime = prompt.toLowerCase().includes("anime");
        const isTv = prompt.toLowerCase().includes("tv") || prompt.toLowerCase().includes("show") || prompt.toLowerCase().includes("series");
        
        const genreIds: string[] = [];
        const searchTerms: string[] = [];

        keywords.forEach(kw => {
            if (GENRE_MAP[kw]) {
                genreIds.push(GENRE_MAP[kw]);
            } else {
                searchTerms.push(kw);
            }
        });

        // If we found genres but no specific search terms, use TMDB Discover
        if (genreIds.length > 0 && searchTerms.length === 0) {
            const discoverUrl = isTv ? TMDB_DISCOVER_TV : TMDB_DISCOVER_MOVIE;
            if (isAnime && !genreIds.includes("16")) genreIds.push("16");

            const res = await axios.get(discoverUrl, {
                params: {
                    api_key: TMDB_API_KEY,
                    with_genres: genreIds.join(","),
                    with_original_language: isAnime ? "ja" : undefined,
                    sort_by: "popularity.desc",
                    page: 1
                },
                timeout: 3000
            });

            const results = (res.data.results || []).slice(0, 10).map((item: any) => ({
                ...item,
                media_type: isAnime ? "anime" : (isTv ? "tv" : "movie")
            }));
            if (results.length > 0) {
                return NextResponse.json({ results });
            }
        }

        // If we have search terms, fall back to a unified search using the search terms
        const searchTerm = searchTerms.join(" ") || prompt;
        const searchRes = await axios.get(TMDB_SEARCH_URL, {
            params: {
                api_key: TMDB_API_KEY,
                query: searchTerm,
                language: "en-US",
                page: 1
            },
            timeout: 3000
        });

        const results = (searchRes.data.results || []).slice(0, 10).filter((i: any) => i.media_type !== "person").map((item: any) => ({
            ...item,
            media_type: item.media_type || (isTv ? "tv" : "movie")
        }));

        if (results.length > 0) {
            return NextResponse.json({ results });
        }

        // If TMDB returns empty, fall back to local indexed catalog
        const fallbackResults = await searchLocalFallback(prompt, keywords);
        return NextResponse.json({ results: fallbackResults });

    } catch (error: any) {
        console.warn("[Discover API] External provider failed, falling back to local dataset:", error.message);
        const fallbackResults = await searchLocalFallback(prompt, keywords);
        return NextResponse.json({ results: fallbackResults });
    }
}
