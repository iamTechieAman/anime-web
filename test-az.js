const { HiAnimeProvider } = require('./src/lib/providers/hianime.ts');
const { AnikaiProvider } = require('./src/lib/providers/anikai.ts');
require('ts-node').register();

async function run() {
    const hianime = new (require('./src/lib/providers/hianime.ts').HiAnimeProvider)();
    try {
        const res = await hianime.getAZList('A', 1);
        console.log('HiAnime:', res.length);
    } catch(e) { console.log('HiAnime error', e.message); }
    
    const anikai = new (require('./src/lib/providers/anikai.ts').AnikaiProvider)();
    try {
        const res2 = await anikai.getAZList('A', 1);
        console.log('Anikai:', res2.length);
    } catch(e) { console.log('Anikai error', e.message); }
}
run();
