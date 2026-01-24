
import axios from 'axios';

const ALLANIME_API = "https://api.allanime.day/api";
const ALLANIME_REFR = "https://allmanga.to";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0";

const EPISODE_LIST_GQL = `
query ($showId: String!) {
    show( _id: $showId ) {
        _id name englishName nativeName thumbnail aniListId malId availableEpisodesDetail
    }
}`;

async function testProvider(id: string) {
    console.log(`Testing AllAnime Provider for ID: ${id}`);
    try {
        const response = await axios.get(ALLANIME_API, {
            params: {
                variables: JSON.stringify({ showId: id }),
                query: EPISODE_LIST_GQL
            },
            headers: { "User-Agent": USER_AGENT, Referer: ALLANIME_REFR },
            timeout: 10000
        });

        const show = response.data?.data?.show;
        if (!show) {
            console.error("Show not found in response:", response.data);
        } else {
            console.log("Success! Found show:", show.name);
            console.log("Episodes (Sub):", show.availableEpisodesDetail?.sub?.length);
        }
    } catch (error: any) {
        console.error("Request failed:", error.message);
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", error.response.data);
        }
    }
}

// Test with a known ID (e.g., One Piece or similar)
testProvider("re-zero-kara-hajimeru-isekai-seikatsu-3rd-season");
