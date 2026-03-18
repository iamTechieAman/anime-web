
import json
from scrapling import StealthyFetcher

def probe(url):
    print(f"Probing homepage {url}...")
    try:
        fetcher = StealthyFetcher()
        response = fetcher.fetch(url, engine='chrome')
        print(f"Status: {getattr(response, 'status', 'unknown')}")
        
        # Look for search form/input
        forms = response.css('form')
        for f in forms:
            action = f.attrib.get('action', '')
            method = f.attrib.get('method', 'GET')
            inputs = f.css('input')
            print(f"  Form: {action} ({method}) -> Inputs: {[i.attrib.get('name') for i in inputs]}")
            
    except Exception as e:
        print(f"Error probing {url}: {e}")

def probe_search(url, search_url_pattern, query):
    print(f"Searching {url} for '{query}'...")
    try:
        fetcher = StealthyFetcher()
        search_url = search_url_pattern.replace("{query}", query.replace(" ", "%20"))
        # Use chrome engine for potential SPAs
        response = fetcher.fetch(search_url, engine='chrome')
        print(f"Search Status: {getattr(response, 'status', 'unknown')}")
        
        content = response.text or ""
        if not content and response.body:
             content = response.body.decode('utf-8', errors='ignore')

        # Save HTML for analysis
        filename = f"tmp-search-{url.split('//')[1].replace('/', '').replace('.', '_')}.html"
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Saved HTML ({len(content)} bytes) to {filename}")

        # Look for result list
        results = response.css('a[href*="/anime/"], a[href*="/watch/"]')
        print(f"Found {len(results)} potential results.")
        for i, r in enumerate(results[:15]):
            text = r.text.strip() if r.text else "NO_TEXT"
            href = r.attrib.get('href', 'NO_HREF')
            print(f"  {i}: {text} -> {href}")
            
    except Exception as e:
        print(f"Error searching {url}: {e}")

search_configs = [
    ("https://justanime.to/", "https://justanime.to/search?keyword={query}"),
    ("https://kaa.lt/", "https://kaa.lt/search?q={query}"),
    ("https://animex.one/", "https://animex.one/search?q={query}")
]

search_configs = [
    ("https://kaa.lt/", "https://kaa.lt/api/show/search?q={query}"),
    ("https://animetsu.net/", "https://animetsu.net/search?keyword={query}"),
    ("https://animex.one/", "https://animex.one/search?q={query}"),
    ("https://www.animerealms.org/", "https://www.animerealms.org/en/search?keyword={query}")
]

for url, pattern in search_configs:
    probe_search(url, pattern, "one piece")
    print("-" * 40)
