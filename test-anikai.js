const axios = require('axios');
const cheerio = require('cheerio');
const BASE_URL = 'https://anikai.to';
axios.get(`${BASE_URL}/az-list/a?page=1`)
  .then(res => {
    const $ = cheerio.load(res.data);
    const results = [];
    $('.flw-item').each((i, el) => {
        results.push({
            title: $(el).find('.film-name a').text().trim()
        });
    });
    console.log(results.length > 0 ? 'Success: ' + results.length : 'No results found. HTML length: ' + res.data.length);
  })
  .catch(err => console.error(err.message));
