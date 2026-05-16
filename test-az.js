const axios = require('axios');
axios.get('http://localhost:3000/api/anime/az?letter=a&tab=anime')
  .then(res => console.log(JSON.stringify(res.data, null, 2)))
  .catch(err => console.error(err.response ? err.response.data : err.message));
