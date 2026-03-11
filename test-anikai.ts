import { AnikaiProvider } from './src/lib/providers/anikai';

async function test() {
    console.log("Testing AnikaiProvider.getHome()");
    const provider = new AnikaiProvider();
    const t = Date.now();
    try {
        const res = await provider.getHome();
        console.log(`Loaded in ${Date.now() - t}ms`);
        console.log(`Slides count: ${res.slides.length}`);
    } catch (e) {
        console.error("Error:", e);
    }
}

test();
