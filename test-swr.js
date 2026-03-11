const axios = require('axios');
async function test() {
  const t0 = Date.now();
  try {
    const res = await axios.get('http://localhost:3000/api/anime/home');
    console.log("Loaded API home in " + (Date.now() - t0) + "ms. Slides count:", res.data.slides?.length);
  } catch(e) { console.error("API Error", e.message); }
}
test();
