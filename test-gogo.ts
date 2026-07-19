import axios from 'axios';

async function checkGogoIframe(episodeSlug: string) {
    const embedUrl = `https://embtaku.pro/streaming.php?id=${episodeSlug}`;
    console.log("Checking:", embedUrl);
    try {
        const res = await axios.get(embedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
                'Referer': 'https://anitaku.pe/'
            }
        });
        console.log("Status:", res.status);
        console.log("Length:", res.data.length);
        if (res.data.includes('CryptoJS')) {
            console.log("It's a valid Gogoanime player page with AES encryption.");
        }
    } catch (e: any) {
        console.error("Error:", e.message);
    }
}

checkGogoIframe("naruto-shippuden-episode-1");
