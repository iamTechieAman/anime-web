import os
import re

files_to_patch = [
    "src/app/api/prime/details/route.ts",
    "src/app/api/prime/movies/route.ts",
    "src/app/api/prime/search/route.ts",
    "src/app/api/prime/tv/route.ts",
    "src/app/api/prime/discover/route.ts",
    "src/app/api/anime/az/route.ts",
    "src/app/api/anime/search/route.ts",
    "src/app/api/prime/season/route.ts",
    "src/app/sitemap.ts"
]

wrapper_code = """
async function withTimeout<T>(promise: Promise<T>, ms: number = 3000): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms))
    ]);
}
"""

def patch_file(filepath):
    if not os.path.exists(filepath): return
    with open(filepath, 'r') as f:
        content = f.read()

    # Skip if already patched
    if 'withTimeout' in content:
        return

    # Add withTimeout
    lines = content.split('\n')
    imports_end = 0
    for i, line in enumerate(lines):
        if line.startswith('import '):
            imports_end = i
    
    lines.insert(imports_end + 1, wrapper_code)
    
    # Replace await fetch( with await withTimeout(fetch(
    new_content = '\n'.join(lines)
    
    # This is slightly dangerous with regex but let's do a simple replace
    # We replace await fetch(...) with await withTimeout(fetch(...), 3000)
    # We will use regex to capture everything inside the fetch call
    
    def replacer(match):
        args = match.group(1)
        return f"await withTimeout(fetch({args}), 3000)"

    new_content = re.sub(r'await\s+fetch\s*\((.*?)\)', replacer, new_content, flags=re.DOTALL)
    
    with open(filepath, 'w') as f:
        f.write(new_content)
    
    print(f"Patched {filepath}")

for f in files_to_patch:
    patch_file(os.path.join("/Users/amankumar/Desktop/anime-web", f))

