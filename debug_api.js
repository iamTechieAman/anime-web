const axios = require('axios');

async function testApi(params) {
    const url = 'http://localhost:3000/api/anime/source';
    console.log(`Testing ${url} with params:`, params);
    try {
        const res = await axios.get(url, { params });
        console.log('SUCCESS:', JSON.stringify(res.data, null, 2));
    } catch (err) {
        console.log('ERROR:', err.response?.status, err.response?.data);
    }
}

async function run() {
    // Test AllAnime
    await testApi({ id: 'PEQjWP25keRPXEt4f', ep: '1', mode: 'sub', provider: 'allanime' });

    // Test HiAnime
    await testApi({ id: 'one-piece-100', ep: '1', mode: 'sub', provider: 'hianime' });
}

run();
