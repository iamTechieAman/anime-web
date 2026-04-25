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
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

async function generateStaticData() {
    console.log('Generating static data for Vercel optimization...');
    
    try {
        // Fetch Trending Movies
        const trendingMovies = await fetchJson(`https://api.themoviedb.org/3/trending/movie/week?api_key=${TMDB_KEY}`);
        fs.writeFileSync(path.join(DATA_DIR, 'trending_movies.json'), JSON.stringify(trendingMovies));
        
        // Fetch Popular TV
        const popularTv = await fetchJson(`https://api.themoviedb.org/3/tv/popular?api_key=${TMDB_KEY}&page=1`);
        fs.writeFileSync(path.join(DATA_DIR, 'popular_tv.json'), JSON.stringify(popularTv));

        console.log('Static data generated successfully.');
    } catch (error) {
        console.error('Failed to generate static data:', error);
        // Do not crash the build if API fails
        process.exit(0);
    }
}

generateStaticData();
