const axios = require('axios');

async function test() {
    try {
        console.log("Testing AniList batch query...");
        const idsToFetch = [113415, 21, 1]; // dummy ids
        const startTime = Date.now();
        const alRes = await axios.post('https://graphql.anilist.co', {
            query: `query($ids: [Int]) { Page(page: 1, perPage: 50) { media(id_in: $ids) { id bannerImage coverImage{extraLarge} averageScore seasonYear genres format } } }`,
            variables: { ids: idsToFetch }
        });
        console.log(`Success in ${Date.now() - startTime}ms`);
        console.log("Data:", JSON.stringify(alRes.data.data.Page.media, null, 2).substring(0, 200) + "...");
    } catch (e) {
        console.error("Error:", e.message);
        if (e.response) {
            console.error("Response data:", e.response.data);
        }
    }
}
test();
