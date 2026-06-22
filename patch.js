const fs = require('fs');
const files = [
    "src/app/api/prime/details/route.ts",
    "src/app/api/prime/movies/route.ts",
    "src/app/api/prime/search/route.ts",
    "src/app/api/prime/tv/route.ts",
    "src/app/api/prime/discover/route.ts",
    "src/app/api/prime/season/route.ts",
    "src/app/api/anime/az/route.ts",
    "src/app/api/anime/search/route.ts",
    "src/app/api/anime/source/route.ts",
    "src/app/sitemap.ts"
];

const wrapperCode = `
async function withTimeout<T>(promise: Promise<T>, ms: number = 3000): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error(\`Timeout after \${ms}ms\`)), ms))
    ]);
}
`;

files.forEach(f => {
    try {
        let content = fs.readFileSync(f, 'utf8');
        
        // Add wrapper if missing
        if (!content.includes('async function withTimeout')) {
            content = content.replace(/(import .*;\n)+/, match => match + wrapperCode);
        }
        
        // We will carefully replace `await fetch(...)` with `await withTimeout(fetch(...), 3000)`
        // avoiding nested matches
        content = content.replace(/await fetch\((.*?)\)/g, (match, group1) => {
            // Check if it's already wrapped
            if (match.includes('withTimeout')) return match;
            return `await withTimeout(fetch(${group1}), 3000)`;
        });

        fs.writeFileSync(f, content);
        console.log('Patched', f);
    } catch(e) {
        console.error('Failed on', f, e);
    }
});
