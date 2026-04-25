const https = require('https');

const ENDPOINTS = [
  { name: 'Prime API (Trending)', url: 'https://toonplayer.in/api/prime?category=trending' },
  { name: 'Anime Home API', url: 'https://toonplayer.in/api/anime/home' },
  { name: 'Anime Search API', url: 'https://toonplayer.in/api/anime/search?query=naruto' }
];

console.log("=====================================");
console.log("🚀 ToonPlayer Health Check Started");
console.log("=====================================\n");

async function checkEndpoint(endpoint) {
  return new Promise((resolve) => {
    const start = Date.now();
    https.get(endpoint.url, (res) => {
      const ms = Date.now() - start;
      let statusIcon = res.statusCode === 200 ? '✅' : '❌';
      
      console.log(`${statusIcon} ${endpoint.name}`);
      console.log(`   URL: ${endpoint.url}`);
      console.log(`   Status: ${res.statusCode}`);
      console.log(`   Latency: ${ms}ms\n`);
      
      resolve({
        name: endpoint.name,
        success: res.statusCode === 200,
        ms,
        status: res.statusCode
      });
    }).on('error', (err) => {
      console.log(`❌ ${endpoint.name}`);
      console.log(`   URL: ${endpoint.url}`);
      console.log(`   Error: ${err.message}\n`);
      resolve({
        name: endpoint.name,
        success: false,
        error: err.message
      });
    });
  });
}

async function runHealthCheck() {
  let allHealthy = true;
  for (const endpoint of ENDPOINTS) {
    const result = await checkEndpoint(endpoint);
    if (!result.success) allHealthy = false;
  }

  console.log("=====================================");
  if (allHealthy) {
    console.log("🌟 All systems operational!");
  } else {
    console.log("⚠️ Some systems are experiencing issues.");
  }
  console.log("=====================================");
}

runHealthCheck();
