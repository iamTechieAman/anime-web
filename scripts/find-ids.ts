
import axios from 'axios';

const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const headers = {
    'User-Agent': userAgent,
    'Referer': 'https://allanime.to/',
};

async function search(query: string) {
    console.log(`Searching for: ${query}`);
    try {
        const response = await axios.get(`https://api.allanime.day/api?variables=${encodeURIComponent(JSON.stringify({
            search: {
                query: query,
                allowAdult: false,
                allowUnknown: false,
            },
            limit: 5,
        }))}&query=${encodeURIComponent(`
            query ($search: SearchInput, $limit: Int) {
                shows(search: $search, limit: $limit) {
                    edges {
                        _id
                        name
                        englishName
                        nativeName
                    }
                }
            }
        `)}`, { headers });

        const shows = response.data.data.shows.edges;
        if (shows.length > 0) {
            console.log(`FOUND: ${query} -> ID: ${shows[0]._id} (Name: ${shows[0].name})`);
            return shows[0]._id;
        } else {
            console.log(`NOT FOUND: ${query}`);
            return null;
        }
    } catch (error: any) {
        console.error(`Error searching ${query}:`, error.message);
        return null;
    }
}

async function main() {
    await search("Re:Zero 3rd Season");
    await search("Dandadan");
    await search("Bleach: Thousand-Year Blood War");
    await search("One Piece");
}

main();
