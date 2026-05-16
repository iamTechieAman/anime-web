const axios = require('axios');
const cheerio = require('cheerio');
axios.get('https://anikai.to/az-list/a?page=1')
  .then(res => {
    const $ = cheerio.load(res.data);
    const first = $('.aitem-wrapper').first();
    console.log('HTML of first item:', first.html());
  });
