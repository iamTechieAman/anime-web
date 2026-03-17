import json
import sys
import argparse
import re
from scrapling import StealthyFetcher

def scrape_onoflix_search(query):
    fetcher = StealthyFetcher()
    url = f"https://onoflix.live/en/search?q={query}"
    response = fetcher.fetch(url)
    
    if not response.css('div.grid, a[href*="/movie/"]'):
        response = fetcher.fetch(url, engine='chrome')
    
    results = []
    items = response.css('.movie-item, a[href*="/movie/"], a[href*="/series/"]')
    
    for item in items:
        if item.tag == 'a':
            href = item.attrib.get('href', '')
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

def scrape_watchanimeworld(query=None, category=None):
    fetcher = StealthyFetcher()
    if query:
        url = f"https://watchanimeworld.net/?s={query}"
    elif category:
        url = f"https://watchanimeworld.net/category/{category}/"
    else:
        url = "https://watchanimeworld.net/"

    response = fetcher.fetch(url)
    if not response.css('article.post, article.item, .result-item, .movie-item'):
        response = fetcher.fetch(url, engine='chrome')
    results = []
    
    items = response.css('article.post, article.item, .result-item, .movie-item')
    
    for item in items:
        links = item.css('h2.entry-title a, h2 a, h3 a, a.lnk-blk')
        if not links:
            links = item.css('a')
            
        if not links: continue
        
        href = links[0].attrib.get('href', '')
        title = links[0].text.strip() if links[0].text else ""
        if not title:
            title_el = item.css('h2.entry-title, h3, .title')
            title = title_el[0].text.strip() if title_el else ""
            
        imgs = item.css('.post-thumbnail img, img')
        img = "(empty)"
        if imgs:
            img = imgs[0].attrib.get('src') or imgs[0].attrib.get('data-src') or ""
        
        if title and href:
            item_id = href.rstrip('/').split('/')[-1]
            results.append({
                "id": item_id,
                "title": title,
                "image": img if img.startswith('http') else f"https:{img}" if img.startswith('//') else img,
                "type": "cartoon",
                "href": href
            })
            
    return results

def scrape_watchanimeworld_info(item_id):
    fetcher = StealthyFetcher()
    # Check if it's a movie or series
    is_movie = "-movie" in item_id or "movies" in item_id
    url = f"https://watchanimeworld.net/series/{item_id}/"
    if is_movie:
        url = f"https://watchanimeworld.net/movies/{item_id}/"
        
    response = fetcher.fetch(url, engine='chrome')
    
    episodes = []
    
    if is_movie:
        # Check if it's a movie page (movieDetail is the playback page)
        episodes.append({"id": item_id, "number": "1", "href": url})
    else:
        # 1. Extract post_id and seasons for AJAX
        season_links = response.css('.aa-cnt a')
        post_id = None
        seasons = []
        for sl in season_links:
            post_id = sl.attrib.get('data-post')
            season_num = sl.attrib.get('data-season')
            if post_id and season_num:
                seasons.append(season_num)
        
        # 2. Iterate through seasons using AJAX if found
        if post_id and seasons:
            for s_num in seasons:
                ajax_url = f"https://watchanimeworld.net/wp-admin/admin-ajax.php?action=action_select_season&season={s_num}&post={post_id}"
                try:
                    # AJAX might return HTML snippets
                    ajax_res = fetcher.fetch(ajax_url)
                    ep_links = ajax_res.css('.lnk-blk, a[href*="/episode/"]')
                    for link in ep_links:
                        href = link.attrib.get('href', '')
                        if "/episode/" not in href: continue
                        ep_id = href.rstrip('/').split('/')[-1]
                        num_el = link.css('.numerando, .ep')
                        text = num_el[0].text.strip() if num_el else ep_id.split('-')[-1]
                        if ep_id not in [e['id'] for e in episodes]:
                            episodes.append({
                                "id": ep_id,
                                "number": text,
                                "href": href
                            })
                except Exception as e:
                    print(f"Error fetching season {s_num}: {e}", file=sys.stderr)
        
        # Fallback to current page episodes if no AJAX results
        if not episodes:
            ep_links = response.css('.episodios a, .lnk-blk, a[href*="/episode/"]')
            for link in ep_links:
                href = link.attrib.get('href', '')
                if not href or "/episode/" not in href: continue
                ep_id = href.rstrip('/').split('/')[-1]
                num_el = link.css('.numerando, .ep')
                text = num_el[0].text.strip() if num_el else ep_id.split('-')[-1]
                if ep_id and ep_id not in [e['id'] for e in episodes]:
                    episodes.append({
                        "id": ep_id,
                        "number": text,
                        "href": href
                    })

    title_el = response.css('h1, .entry-title')
    title = title_el[0].text.strip() if title_el else item_id

    return {
        "id": item_id,
        "title": title,
        "episodes": episodes,
        "type": "movie" if is_movie else "series"
    }

def scrape_watchanimeworld_source(episode_id):
    fetcher = StealthyFetcher()
    # Try episode URL or movie URL (movie detail page itself)
    url = f"https://watchanimeworld.net/episode/{episode_id}/"
    response = fetcher.fetch(url, engine='chrome')
    
    if not response.css('iframe'):
        # Maybe it's a movie
        url = f"https://watchanimeworld.net/movies/{episode_id}/"
        response = fetcher.fetch(url, engine='chrome')

    # Find the player iframe
    iframes = response.css('iframe[src*="play."], iframe[src*="zephyr"], iframe[src*="embed"], iframe[src*="video"]')
    if not iframes:
        iframes = response.css('iframe')
        
    source_url = iframes[0].attrib.get('src') if iframes else ""
    
    # Check for direct video links in script if possible
    # (Optional: Advanced extraction if iframe fails)
    
    return {
        "url": source_url,
        "is_iframe": True
    }

def scrape_cinemacity(query):
    fetcher = StealthyFetcher()
    url = f"https://cinemacity.cc/index.php?do=search&subaction=search&story={query}"
    response = fetcher.fetch(url, engine='chrome')
    results = []
    items = response.css('.dar-short_item, .sect-item')
    for item in items:
        title_el = item.css('.dar-short_title, .title')
        title = title_el[0].text.strip() if title_el else ""
        links = item.css('a')
        href = links[0].attrib.get('href', '') if links else ""
        imgs = item.css('img')
        img = imgs[0].attrib.get('src', '') if imgs else ""
        if title and href:
            results.append({
                "id": href.rstrip('/').split('/')[-1],
                "title": title,
                "image": f"https://cinemacity.cc{img}" if img.startswith('/') else img,
                "url": href,
                "type": "movie" if "/movies/" in href else "tv"
            })
    return results

def scrape_filmex(query):
    fetcher = StealthyFetcher()
    url = f"https://filmex.to/search?q={query}"
    response = fetcher.fetch(url, engine='chrome')
    results = []
    items = response.css('.grid a, .item')
    for item in items:
        title_el = item.css('.title, h3')
        title = title_el[0].text.strip() if title_el else ""
        href = item.attrib.get('href', '')
        imgs = item.css('img')
        img = imgs[0].attrib.get('src', '') if imgs else ""
        if title and href:
            item_id = href.rstrip('/').split('/')[-1]
            results.append({
                "id": item_id,
                "title": title,
                "image": img,
                "url": f"https://filmex.to{href}" if href.startswith('/') else href,
                "type": "movie" if "/movie/" in href else "tv"
            })
    return results

def scrape_cinezo(query):
    fetcher = StealthyFetcher()
    url = f"https://www.cinezo.net/search?q={query}"
    response = fetcher.fetch(url, engine='chrome')
    results = []
    items = response.css('a[href^="/movie/"], a[href^="/tv/"]')
    for item in items:
        href = item.attrib.get('href', '')
        title_el = item.css('.title, h3')
        title = title_el[0].text.strip() if title_el else ""
        imgs = item.css('img')
        img = imgs[0].attrib.get('src', '') if imgs else ""
        if href:
            item_id = href.split('/')[-1]
            results.append({
                "id": item_id,
                "title": title,
                "image": img,
                "url": f"https://www.cinezo.net{href}" if href.startswith('/') else href,
                "type": "movie" if "/movie/" in href else "tv"
            })
    return results

def scrape_pstream(query):
    fetcher = StealthyFetcher()
    url = f"https://pstream.net/search/{query}"
    response = fetcher.fetch(url, engine='chrome')
    results = []
    items = response.css('a[href^="/media/"]')
    for item in items:
        href = item.attrib.get('href', '')
        title_el = item.css('.title, h3, .name')
        title = title_el[0].text.strip() if title_el else ""
        imgs = item.css('img')
        img = imgs[0].attrib.get('src', '') if imgs else ""
        if href:
            item_id = href.split('/')[-1]
            results.append({
                "id": item_id,
                "title": title or item_id.replace('-', ' ').title(),
                "image": img,
                "url": f"https://pstream.net{href}" if href.startswith('/') else href,
                "type": "movie" if "tmdb-movie" in href else "tv"
            })
    return results

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--query", help="Search query")
    parser.add_argument("--aniwatch_page", type=int, help="Page number for AniWatch TV list")
    parser.add_argument("--cartoon_query", help="Search specifically for cartoons")
    parser.add_argument("--cartoon_category", help="Fetch from a cartoon category")
    parser.add_argument("--wa_info", help="Get info for WatchAnimeWorld item")
    parser.add_argument("--wa_source", help="Get source for WatchAnimeWorld episode")
    
    args = parser.parse_args()
    
    output = {
        "onoflix": [],
        "watchanimeworld": [],
        "cinemacity": [],
        "filmex": [],
        "cinezo": [],
        "pstream": [],
        "wa_info": {},
        "wa_source": {},
        "aniwatch": []
    }
    if args.query:
        output["onoflix"] = scrape_onoflix_search(args.query)
        output["watchanimeworld"] = scrape_watchanimeworld(query=args.query)
        output["cinemacity"] = scrape_cinemacity(args.query)
        output["filmex"] = scrape_filmex(args.query)
        output["cinezo"] = scrape_cinezo(args.query)
        output["pstream"] = scrape_pstream(args.query)
    
    if args.cartoon_query:
        output["watchanimeworld"] = scrape_watchanimeworld(query=args.cartoon_query)
        
    if args.cartoon_category:
        output["watchanimeworld"] = scrape_watchanimeworld(category=args.cartoon_category)
        
    if args.wa_info:
        output["wa_info"] = scrape_watchanimeworld_info(args.wa_info)
        
    if args.wa_source:
        output["wa_source"] = scrape_watchanimeworld_source(args.wa_source)
    
    if args.aniwatch_page:
        output["aniwatch"] = scrape_aniwatch_tv_list(args.aniwatch_page)
        
    print(json.dumps(output))
