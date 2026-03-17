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
                "id": f"on:{item_id}",
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
                "id": f"aw:{href.split('/')[-1].split('?')[0]}",
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
                "id": f"wa:{item_id}",
                "title": title,
                "image": img if img.startswith('http') else f"https:{img}" if img.startswith('//') else img,
                "type": "cartoon",
                "href": href
            })
            
    return results

def scrape_watchanimeworld_info(item_id):
    fetcher = StealthyFetcher()
    is_movie = "-movie" in item_id or "movies" in item_id
    
    # Try multiple URL patterns
    urls_to_try = [
        f"https://watchanimeworld.net/series/{item_id}/",
        f"https://watchanimeworld.net/movies/{item_id}/",
        f"https://watchanimeworld.net/{item_id}/"
    ]
    
    if is_movie:
        urls_to_try = [urls_to_try[1], urls_to_try[0], urls_to_try[2]]
        
    response = None
    for url in urls_to_try:
        try:
            temp_resp = fetcher.fetch(url)
            # Some versions of scrapling Response have status_code, others have status
            status = getattr(temp_resp, 'status_code', getattr(temp_resp, 'status', 200))
            if temp_resp and status < 400:
                response = temp_resp
                break
        except:
            continue
            
    if not response or getattr(response, 'status_code', getattr(response, 'status', 200)) >= 400:
        # Final fallback with chrome if all static failed
        response = fetcher.fetch(urls_to_try[0], engine='chrome')
    
    episodes = []
    
    # Check status again after chrome fallback
    current_status = getattr(response, 'status_code', getattr(response, 'status', 200)) if response else 404
    
    if (not response or current_status >= 400) and not is_movie:
        # SEARCH RECOVERY: Handle specific slugs and years
        # Clean title for better search: "ben-10-classic-2005-series" -> "Ben 10"
        clean_title = re.sub(r'-(series|classic|20\d\d|19\d\d)', '', item_id.lower())
        guessed_title = clean_title.replace('-', ' ').title()
        
        print(f"[Scraper] 404 on direct lookup for {item_id}. Search recovery for '{guessed_title}'...", file=sys.stderr)
        search_res = scrape_watchanimeworld(guessed_title)
        
        # If no results, try a broader search with just the first two words
        if not search_res:
            words = guessed_title.split()
            # If it looks like an episode search, strip the episode part
            if "Episode" in words:
                ep_idx = words.index("Episode")
                guessed_title = " ".join(words[:ep_idx])
                print(f"[Scraper] Stripping episode part for broader search: '{guessed_title}'", file=sys.stderr)
                search_res = scrape_watchanimeworld(guessed_title)
            
            if not search_res and len(words) > 2:
                broader_title = " ".join(words[:2])
                print(f"[Scraper] No results for '{guessed_title}'. Trying broader search for '{broader_title}'...", file=sys.stderr)
                search_res = scrape_watchanimeworld(broader_title)

        if search_res and len(search_res) > 0:
            # Pick best match (exact or first)
            best_match = None
            # Filter out original failing ID to avoid infinite recursion or re-trying same failure
            valid_results = [r for r in search_res if r['id'] != item_id]
            
            if valid_results:
                for r in valid_results:
                    if r['title'].lower() in guessed_title.lower() or guessed_title.lower() in r['title'].lower():
                        best_match = r
                        break
                
                if not best_match:
                    best_match = valid_results[0]
                
                print(f"[Scraper] Search recovery found new candidate ID: {best_match['id']}", file=sys.stderr)
                # Re-fetch with the new ID
                urls_to_try = [
                    f"https://watchanimeworld.net/series/{best_match['id']}/",
                    f"https://watchanimeworld.net/movies/{best_match['id']}/",
                    f"https://watchanimeworld.net/{best_match['id']}/"
                ]
                response = None
                for url in urls_to_try:
                    try:
                        temp_resp = fetcher.fetch(url)
                        status = getattr(temp_resp, 'status_code', getattr(temp_resp, 'status', 200))
                        if temp_resp and status < 400:
                            response = temp_resp
                            break
                    except: continue

    if not response:
        return {"id": item_id, "title": "Error: Content Not Found", "episodes": [], "type": "series"}
        
    is_movie_detected = is_movie or "/movies/" in response.url or "/movie/" in response.url
    
    if is_movie_detected:
        # Check if it's a movie page (movieDetail is the playback page)
        episodes.append({"id": item_id, "number": "1", "href": response.url})
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

    if not response:
        return {"id": item_id, "title": "Error: Content Not Found", "episodes": [], "type": "series"}
    
    title_el = response.css('h1.entry-title, .title')
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
    
    if getattr(response, 'status_code', getattr(response, 'status', 200)) >= 400:
        # Try movie URL as fallback if episode 404s
        url = f"https://watchanimeworld.net/movies/{episode_id}/"
        response = fetcher.fetch(url, engine='chrome')

    # If still 404, try searching for the episode_id
    if getattr(response, 'status_code', getattr(response, 'status', 200)) >= 400:
        # Clean title: "ben-10-classic-2005-episode-1" -> "Ben 10"
        clean_title = re.sub(r'-(episode|part)-\d+', '', episode_id.lower())
        clean_title = re.sub(r'-(series|classic|20\d\d|19\d\d)', '', clean_title)
        guessed_title = clean_title.replace('-', ' ').title()
        
        print(f"[Source Scraper] 404 for {episode_id}. Searching for '{guessed_title}'...", file=sys.stderr)
        search_res = scrape_watchanimeworld(guessed_title)
        if search_res:
            new_url = search_res[0].get('href')
            if new_url:
                print(f"[Source Scraper] Recovered new URL: {new_url}", file=sys.stderr)
                response = fetcher.fetch(new_url, engine='chrome')

    # Find all server buttons
    server_buttons = response.css('.server-list li, .server-button, .btn-server, a[data-id], .dooplay_player_option')
    sources = []
    
    # Extract from default iframe first
    iframes = response.css('iframe[src*="play."], iframe[src*="zephyr"], iframe[src*="embed"], iframe[src*="video"], iframe[src*="/v/"], iframe[src*="player"]')
    if not iframes:
        iframes = response.css('.video-player iframe, .movie-player iframe, #player iframe, iframe')
        
    default_url = iframes[0].attrib.get('src') if iframes else ""
    if default_url:
        if default_url.startswith('//'): default_url = 'https:' + default_url
        sources.append({"name": "Primary", "url": default_url})

    # Extract alternative servers from buttons
    for btn in server_buttons:
        s_name = btn.text.strip() or btn.attrib.get('data-name') or "Server"
        # Often data-src, data-id, or data-opt
        s_url = btn.attrib.get('data-src') or btn.attrib.get('data-id') or btn.attrib.get('data-opt') or btn.attrib.get('href', '')
        
        # If it's just a number or ID, it might need to be resolved via AJAX, but for now let's hope for direct URLs
        if s_url and s_url != '#' and "javascript" not in s_url:
            if s_url.startswith('//'): s_url = 'https:' + s_url
            if not s_url.startswith('http') and len(s_url) > 5: # Likely a relative path
                s_url = f"https://watchanimeworld.net{s_url if s_url.startswith('/') else '/' + s_url}"
            
            if s_url not in [s['url'] for s in sources]:
                sources.append({"name": s_name, "url": s_url})
    
    # Final check for hardcoded script URLs
    if not sources:
        scripts = response.css('script')
        for s in scripts:
            if 'iframe' in s.text and 'src=' in s.text:
                m = re.search(r'src=["\'](https?:[^"\']+)["\']', s.text)
                if m:
                    u = m.group(1)
                    if u not in [src['url'] for src in sources]:
                        sources.append({"name": "JS-Player", "url": u})

    return {
        "url": sources[0]['url'] if sources else "",
        "sources": sources
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
                "id": f"cc:{href.rstrip('/').split('/')[-1]}",
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
                "id": f"fx:{item_id}",
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
                "id": f"cz:{item_id}",
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
                "id": f"ps:{item_id}",
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
