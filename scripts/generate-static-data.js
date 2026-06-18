const fs = require('fs');
const path = require('path');
const https = require('https');

const TMDB_KEY = "a46c50a0ccb1bafe2b15665df7fad7e1";
const DATA_DIR = path.join(__dirname, '..', 'public', 'data');

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            signal: AbortSignal.timeout(10000),
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    if (res.statusCode >= 400) {
                        reject(new Error(`HTTP Error ${res.statusCode}: ${data}`));
                        return;
                    }
                    if (!data.trim()) {
                        reject(new Error('Empty response'));
                        return;
                    }
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
    });
}

const CATEGORIES = [
    { name: 'trending_movies.json', url: `https://api.themoviedb.org/3/trending/movie/week?api_key=${TMDB_KEY}` },
    { name: 'trending_all.json', url: `https://api.themoviedb.org/3/trending/all/week?api_key=${TMDB_KEY}` },
    { name: 'trending_person.json', url: `https://api.themoviedb.org/3/trending/person/week?api_key=${TMDB_KEY}` },
    { name: 'popular_movies.json', url: `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_KEY}&page=1` },
    { name: 'now_playing_movies.json', url: `https://api.themoviedb.org/3/movie/now_playing?api_key=${TMDB_KEY}&page=1` },
    { name: 'top_rated_movies.json', url: `https://api.themoviedb.org/3/movie/top_rated?api_key=${TMDB_KEY}&page=1` },
    { name: 'tv_popular.json', url: `https://api.themoviedb.org/3/tv/popular?api_key=${TMDB_KEY}&page=1` },
    { name: 'tv_top_rated.json', url: `https://api.themoviedb.org/3/tv/top_rated?api_key=${TMDB_KEY}&page=1` },
    
    // Genres
    { name: 'genre_action.json', url: `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_KEY}&with_genres=28&sort_by=popularity.desc&page=1` },
    { name: 'genre_comedy.json', url: `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_KEY}&with_genres=35&sort_by=popularity.desc&page=1` },
    { name: 'genre_romance.json', url: `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_KEY}&with_genres=10749&sort_by=popularity.desc&page=1` },
    { name: 'genre_horror.json', url: `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_KEY}&with_genres=27,53&sort_by=popularity.desc&page=1` },
    { name: 'genre_animation.json', url: `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_KEY}&with_genres=16&sort_by=popularity.desc&page=1` },
    { name: 'genre_scifi.json', url: `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_KEY}&with_genres=878&sort_by=popularity.desc&page=1` },
    
    // Networks
    { name: 'network_213.json', url: `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_KEY}&with_networks=213&sort_by=popularity.desc&page=1` },
    { name: 'network_1024.json', url: `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_KEY}&with_networks=1024&sort_by=popularity.desc&page=1` },
    { name: 'network_2739.json', url: `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_KEY}&with_networks=2739&sort_by=popularity.desc&page=1` },
    { name: 'network_453.json', url: `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_KEY}&with_networks=453&sort_by=popularity.desc&page=1` },
    { name: 'network_49.json', url: `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_KEY}&with_networks=49&sort_by=popularity.desc&page=1` },
    { name: 'network_2552.json', url: `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_KEY}&with_networks=2552&sort_by=popularity.desc&page=1` },
    { name: 'network_4330.json', url: `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_KEY}&with_networks=4330&sort_by=popularity.desc&page=1` },
    { name: 'network_3353.json', url: `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_KEY}&with_networks=3353&sort_by=popularity.desc&page=1` },
];

async function generateStaticData() {
    console.log('Generating expanded static data fallbacks for TMDB...');
    
    await Promise.all(CATEGORIES.map(async (cat) => {
        try {
            console.log(`Fetching ${cat.name}...`);
            const data = await fetchJson(cat.url);
            fs.writeFileSync(path.join(DATA_DIR, cat.name), JSON.stringify(data, null, 2));
            console.log(`Successfully saved ${cat.name}`);
        } catch (error) {
            console.error(`Failed to fetch ${cat.name}:`, error.message);
        }
    }));
    
    console.log('Static data fallbacks generation complete.');
}

generateStaticData();
