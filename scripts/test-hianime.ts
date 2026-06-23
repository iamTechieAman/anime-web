import axios from 'axios';

async function testWebId() {
    const domain = 'https://sankanime.web.id';
    const paths = [
        `${domain}/top-search`,
        `${domain}/search?keyword=naruto`,
        `${domain}/info?id=naruto`,
        `${domain}/schedule?date=2026-06-23`
    ];

    for (const url of paths) {
        console.log(`\nTesting URL: ${url} ...`);
        try {
            const res = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json'
                },
                timeout: 5000
            });
            console.log(`  Success! Status: ${res.status}`);
            console.log(`  Content-Type: ${res.headers['content-type']}`);
            console.log(`  Response Preview: ${JSON.stringify(res.data).substring(0, 500)}`);
        } catch (e: any) {
            console.log(`  Failed: ${e.message}`);
            if (e.response) {
                console.log(`    Status: ${e.response.status}`);
                console.log(`    Content-Type: ${e.response.headers['content-type']}`);
                console.log(`    Response Preview: ${String(e.response.data).substring(0, 300)}`);
            }
        }
    }
}

testWebId();
