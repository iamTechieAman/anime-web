const axios = require('axios');
const cheerio = require('cheerio');
axios.get('https://anikai.to/az-list/a?page=1')
  .then(res => {
    const $ = cheerio.load(res.data);
    console.log('Title:', $('title').text());
    console.log('Any item-like classes:', $('div[class*="item"]').slice(0, 5).attr('class'));
  });
