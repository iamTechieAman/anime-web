const https = require('https');
const http = require('http');

const servers = [
    { name: "ToonPlayer-VIP", url: "https://peachify.top/?type=movie&id=799882" },
    { name: "Embed", url: "https://embed.su/embed/movie/799882" },
    { name: "VidLink", url: "https://vidlink.pro/movie/799882" },
    { name: "EmbedMaster", url: "https://embedmaster.link/movie/799882" },
    { name: "AutoEmbed", url: "https://player.autoembed.cc/embed/movie/799882" },
    { name: "VidSrc", url: "https://vidsrc.net/embed/movie/799882" },
    { name: "VidFast", url: "https://vidfast.pro/movie/799882" },
    { name: "Vidify", url: "https://player.vidify.top/embed/movie/799882" },
    { name: "VidRock", url: "https://vidrock.net/movie/799882" },
    { name: "Multi", url: "https://multiembed.mov/?video_id=799882&tmdb=1" }
];

async function checkURL(urlStr) {
    return new Promise((resolve) => {
        const req = https.get(urlStr, { timeout: 5000, headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            resolve(res.statusCode);
        }).on('error', (e) => {
            resolve(e.message);
        }).on('timeout', () => {
            resolve('timeout');
        });
    });
}

async function run() {
    for (const s of servers) {
        const code = await checkURL(s.url);
        console.log(`${s.name}: ${code}`);
    }
}

run();
