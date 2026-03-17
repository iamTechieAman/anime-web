import json
import sys
import argparse
from scrapling import StealthyFetcher

def scrape_onoflix_search(query):
    # Use browser engine for Onoflix as it might need JS rendering or better stealth
    fetcher = StealthyFetcher()
    url = f"https://onoflix.live/en/search?q={query}"
    # Valid engines: 'chrome' (uses patchright), 'async_chrome', etc.
    response = fetcher.fetch(url) # Default is static, but let's try with browser if needed
    
    # Check if we got anything. If not, try with browser engine
    if not response.css('div.grid, a[href*="/movie/"]'):
        response = fetcher.fetch(url, engine='chrome')
    
    results = []
    # Use response as it is also a selector
    # Use specific selector for movie items as found in search results
    items = response.css('.movie-item, a[href*="/movie/"], a[href*="/series/"]')
    
    for item in items:
        # Scrapling selects elements; if it's the <a> tag itself
        if item.tag == 'a':
            href = item.attrib.get('href', '')
            # Title might be inside or in the text
            titles = item.css('h3, .title, b')
            title = titles[0].text.strip() if titles else item.text.strip()
        else:
            links = item.css('a')
            if not links: continue
            href = links[0].attrib.get('href', '')
            titles = item.css('h3, .title, b, .movie-title')
            title = titles[0].text.strip() if titles else ""
            
        imgs = item.css('img')
        img = imgs[0].attrib.get('src', '') if imgs else ""
        
        if title and href:
            is_movie = "/movie/" in href
            # Extract ID from absolute or relative URL
            item_id = href.rstrip('/').split('/')[-1]
            results.append({
                "id": item_id,
                "title": title,
                "image": img if img.startswith('http') else f"https://onoflix.live{img}",
                "type": "movie" if is_movie else "tv",
                "href": href if href.startswith('http') else f"https://onoflix.live{href}"
            })
    
    return results

def scrape_aniwatch_tv_list(page=17):
    fetcher = StealthyFetcher()
    url = f"https://aniwatchtv.to/tv?page={page}"
    response = fetcher.fetch(url)
    
    results = []
    items = response.css('.flw-item')
    
    for item in items:
        titles = item.css('.film-name a')
        if not titles: continue
        
        try:
            title = titles[0].text.strip()
        except:
            title = titles[0].string().strip()
            
        href = titles[0].attrib.get('href', '')
        
        imgs = item.css('.film-poster img')
        img = imgs[0].attrib.get('data-src', '') if imgs else ""
        
        if title and href:
            results.append({
                "id": href.split('/')[-1].split('?')[0],
                "title": title,
                "image": img,
                "type": "anime"
            })
            
    return results

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--query", help="Search query for Onoflix")
    parser.add_argument("--aniwatch_page", type=int, help="Page number for AniWatch TV list")
    
    args = parser.parse_args()
    
    output = {}
    if args.query:
        output["onoflix"] = scrape_onoflix_search(args.query)
    
    if args.aniwatch_page:
        output["aniwatch"] = scrape_aniwatch_tv_list(args.aniwatch_page)
        
    print(json.dumps(output))
