const axios = require('axios');

const providerLink = 'https://megacloud.blog';
const embedType = '2';
const eNumber = '1';
const sourceId = 'hNecV2ucjXFT';
const referer = 'https://megacloud.blog/embed-2/v3/e-1/hNecV2ucjXFT?k=1';

const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
    'X-Requested-With': 'XMLHttpRequest',
    'Referer': referer
};

async function testUrl(url) {
    console.log(`Testing: ${url}`);
    try {
        const response = await axios.get(url, { headers, params: { id: sourceId } });
        console.log(`SUCCESS [${response.status}]:`, JSON.stringify(response.data).slice(0, 100));
        return true;
    } catch (error) {
        console.log(`FAILED [${error.response?.status || error.message}]`);
        return false;
    }
}

async function run() {
    // Original pattern
    await testUrl(`${providerLink}/embed-${embedType}/ajax/e-${eNumber}/getSources`);

    // v3 pattern
    await testUrl(`${providerLink}/embed-${embedType}/v3/ajax/e-${eNumber}/getSources`);
}

run();
