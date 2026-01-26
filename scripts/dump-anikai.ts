
import axios from 'axios';

async function dump() {
    try {
        const res = await axios.get('https://anikai.to/search?keyword=One+Piece', {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        console.log(res.data);
    } catch (e) {
        console.error(e);
    }
}
dump();
