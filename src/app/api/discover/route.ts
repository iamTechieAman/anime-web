import { NextResponse } from "next/server";
import axios from "axios";

// This endpoint accepts a natural language prompt and returns recommended content.
// It is designed to use OpenAI if an API key is present, but gracefully falls back
// to a robust local NLP keyword extractor that uses TMDB to find relevant results.

const TMDB_SEARCH_URL = 'https://api.themoviedb.org/3/search/multi';
const TMDB_DISCOVER_MOVIE = 'https://api.themoviedb.org/3/discover/movie';
const TMDB_DISCOVER_TV = 'https://api.themoviedb.org/3/discover/tv';
const TMDB_API_KEY = process.env.TMDB_API_KEY || "522103f166160100778c1995804369a4";

// Extract keywords to mock NLP
function extractKeywords(prompt: string): string[] {
    const stopwords = ["i", "want", "to", "watch", "a", "some", "the", "with", "and", "or", "but", "in", "on", "at", "good", "best", "like", "similar", "movie", "movies", "show", "shows", "anime", "series", "recommend", "me"];
    return prompt
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(' ')
        .filter(word => word.length > 2 && !stopwords.includes(word));
}

// Map keywords to TMDB Genres (Mock AI Classification)
const GENRE_MAP: Record<string, string> = {
    "action": "28", "adventure": "12", "animation": "16", "comedy": "35", "funny": "35",
    "crime": "80", "documentary": "99", "drama": "18", "sad": "18", "emotional": "18",
    "family": "10751", "fantasy": "14", "magic": "14", "history": "36", "historical": "36",
    "horror": "27", "scary": "27", "music": "10402", "mystery": "9648", "romance": "10749",
    "romantic": "10749", "love": "10749", "sci-fi": "878", "space": "878", "thriller": "53",
    "war": "10752", "western": "37"
};

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const prompt = searchParams.get('prompt') || '';

    if (!prompt || prompt.length < 3) {
        return NextResponse.json({ results: [], error: "Prompt too short" }, { status: 400 });
    }

    try {
        const openaiKey = process.env.OPENAI_API_KEY;

        // ---------------------------------------------------------
        // 1. OPENAI INTEGRATION (If API Key is present)
        // ---------------------------------------------------------
        if (openaiKey) {
            console.log("[AI Discover] Using OpenAI for:", prompt);
            const aiResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
                model: "gpt-3.5-turbo",
                messages: [
                    { 
                        role: "system", 
                        content: "You are a movie/anime recommendation engine. Given a user's prompt, suggest 10 titles. Return ONLY a JSON array of objects with format: [{\"title\": \"Movie Name\", \"type\": \"movie\" | \"tv\" | \"anime\", \"year\": \"2023\"}]. Do not wrap in markdown."
                    },
                    { role: "user", content: prompt }
                ]
            }, {
                headers: { Authorization: `Bearer ${openaiKey}` }
            });

            const recommendations = JSON.parse(aiResponse.data.choices[0].message.content);
            
            const mappedResults = await Promise.all(recommendations.map(async (rec: any) => {
                const searchRes = await axios.get(TMDB_SEARCH_URL, {
                    params: { api_key: TMDB_API_KEY, query: rec.title, language: 'en-US', page: 1 }
                });
                const item = searchRes.data.results?.[0];
                if (!item) return null;
                
                // Keep original properties and ensure media_type exists
                return {
                    ...item,
                    media_type: item.media_type || (rec.type === 'tv' || rec.type === 'anime' ? 'tv' : 'movie')
                };
            }));

            return NextResponse.json({ results: mappedResults.filter(Boolean) });
        }

        // ---------------------------------------------------------
        // 2. MOCK NLP FALLBACK (TMDB Keyword/Genre Mapping)
        // ---------------------------------------------------------
        console.log("[AI Discover] Using NLP Mock for:", prompt);
        const keywords = extractKeywords(prompt);
        const isAnime = prompt.toLowerCase().includes('anime');
        const isTv = prompt.toLowerCase().includes('tv') || prompt.toLowerCase().includes('show');
        
        let genreIds: string[] = [];
        let searchTerms: string[] = [];

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
            // Add animation genre if anime
            if (isAnime && !genreIds.includes("16")) genreIds.push("16");

            const res = await axios.get(discoverUrl, {
                params: {
                    api_key: TMDB_API_KEY,
                    with_genres: genreIds.join(','),
                    with_original_language: isAnime ? 'ja' : undefined,
                    sort_by: 'popularity.desc',
                    page: 1
                }
            });

            const results = res.data.results.slice(0, 10).map((item: any) => ({
                ...item,
                media_type: isAnime ? 'anime' : (isTv ? 'tv' : 'movie')
            }));
            return NextResponse.json({ results });
        }

        // If we have search terms, fall back to a unified search using the first term
        // This mimics AI trying to find exactly what they typed
        const searchTerm = searchTerms.join(' ') || prompt;
        const searchRes = await axios.get(TMDB_SEARCH_URL, {
            params: {
                api_key: TMDB_API_KEY,
                query: searchTerm,
                language: 'en-US',
                page: 1
            }
        });

        const results = searchRes.data.results.slice(0, 10).filter((i: any) => i.media_type !== 'person').map((item: any) => ({
            ...item,
            media_type: item.media_type || 'movie'
        }));

        return NextResponse.json({ results });

    } catch (error: any) {
        console.error("[Discover API] Error:", error.message);
        return NextResponse.json({ error: "Failed to fetch AI recommendations", results: [] }, { status: 200 });
    }
}
