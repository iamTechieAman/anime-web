import json
import sys
import argparse
import re
from scrapling import StealthyFetcher

# Helper to ensure we only get clean embed/video URLs, not full site pages
def clean_source_url(url, provider_domain):
    if not url: return ""
    # Filter out common non-video pages
    blacklist = [
        f"https://{provider_domain}/", f"https://www. {provider_domain}/",
        f"https://{provider_domain}/movies/", f"https://{provider_domain}/series/",
        "/category/", "/genre/", "/tag/", "/search/", "/contact-us/", "/dmca/"
    ]
    if any(b in url for b in blacklist) and not any(ext in url for ext in ['.m3u8', '.mp4', 'embed', 'player', '/v/']):
        return ""
    
    # Ensure protocol
    if url.startswith('//'): url = 'https:' + url
    return url

def extract_direct_video_links(text):
    # Regex for common stream formats
    patterns = [
        r'https?://[^\s"\']+\.m3u8[^\s"\']*',
        r'https?://[^\s"\']+\.mp4[^\s"\']*',
        r'https?://(?:www\.)?googlevideo\.com/[^\s"\']+',
        r'https?://(?:www\.)?(?:upstream|streamwish|vidmoly|dood|mixdrop|vidsrc|multiembed|rabbitstream|megacloud)[^\s"\']+'
    ]
    links = []
    for p in patterns:
        found = re.findall(p, text)
        links.extend(found)
    return list(set(links))

def scrape_onoflix_search(query):
    fetcher = StealthyFetcher()
    url = f"https://onoflix.live/en/search?q={query}"
    response = fetcher.fetch(url)
    
    if not response or not response.css('div.grid, a[href*="/movie/"]'):
        response = fetcher.fetch(url, engine='chrome')
    
    results = []
    if not response: return []
    items = response.css('.movie-item, a[href*="/movie/"], a[href*="/series/"]') if response else []
    
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
    if not response: return []
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
    if not response or not response.css('article.post, article.item, .result-item, .movie-item'):
        response = fetcher.fetch(url, engine='chrome')
    results = []
    
    if not response: return []
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
            
        imgs = item.css('.post-thumbnail img, img') if item else []
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
    
    # Try multiple URL patterns to avoid "Content Not Found"
    urls_to_try = [
        f"https://watchanimeworld.net/series/{item_id}/",
        f"https://watchanimeworld.net/movies/{item_id}/",
        f"https://watchanimeworld.net/{item_id}/",
        f"https://watchanimeworld.net/anime/{item_id}/",
        f"https://watchanimeworld.net/cartoon/{item_id}/"
    ]
    
    if is_movie:
        urls_to_try = [urls_to_try[1], urls_to_try[0], urls_to_try[2], urls_to_try[3], urls_to_try[4]]
        
    response = None
    for url in urls_to_try:
        try:
            # Configure fetcher for better bypass - use 15s (15000ms)
            temp_resp = fetcher.fetch(url, timeout=15000)
            status = getattr(temp_resp, 'status_code', getattr(temp_resp, 'status', 200))
            if temp_resp and status < 400:
                # Check if it's a real page, not a parked site or error page that returns 200
                if temp_resp.css('h1.entry-title, .title, .episodios, .aa-cnt'):
                    response = temp_resp
                    break
        except:
            continue
            
    if not response:
        # Final fallback with chrome if all static failed
        try:
            response = fetcher.fetch(urls_to_try[0], engine='chrome', timeout=30000)
        except: pass
    
    episodes = []
    
    # Check status again after chrome fallback
    current_status = getattr(response, 'status_code', getattr(response, 'status', 200)) if response else 404
    
    # SEARCH RECOVERY - If content still not found, search for it
    if (not response or current_status >= 400 or not response.css('h1.entry-title, .title')) and not is_movie:
        clean_title = re.sub(r'-(series|classic|20\d\d|19\d\d|full|multi|hd|720p|1080p)', '', item_id.lower())
        guessed_title = clean_title.replace('-', ' ').title()
        
        print(f"[Scraper] 404 or empty on direct lookup for {item_id}. Search recovery for '{guessed_title}'...", file=sys.stderr)
        search_res = scrape_watchanimeworld(guessed_title)
        
        if not search_res:
            title_words = list(guessed_title.split())
            if len(title_words) > 2:
                search_res = scrape_watchanimeworld(" ".join(title_words[:2]))

        if search_res:
            # Filter results to find the best match that isn't the broken ID
            valid_results = [r for r in search_res if r['id'] != item_id]
            if not valid_results: valid_results = search_res # fallback if only one result
            
            if valid_results:
                best_match = valid_results[0]
                # Try to find one that exactly matches the slug
                for r in valid_results:
                    if item_id in r['id'] or r['id'] in item_id:
                        best_match = r
                        break
                
                print(f"[Scraper] Recovery found match: {best_match['id']}", file=sys.stderr)
                match_id = best_match['id'].replace('wa:', '')
                refetch_urls = [
                    f"https://watchanimeworld.net/series/{match_id}/",
                    f"https://watchanimeworld.net/movies/{match_id}/",
                    f"https://watchanimeworld.net/{match_id}/"
                ]
                for url in refetch_urls:
                    try:
                        temp_resp = fetcher.fetch(url)
                        if temp_resp and getattr(temp_resp, 'status_code', 200) < 400 and temp_resp.css('h1.entry-title, .title'):
                            response = temp_resp
                            item_id = match_id # Update item_id to the working one
                            break
                    except: continue

    if not response or not response.css('h1.entry-title, .title'):
        return {"id": item_id, "title": "Error: Content Not Found", "episodes": [], "type": "series", "error": "connectivity_issue"}
        
    is_movie_detected = is_movie or (response and ("/movies/" in response.url or "/movie/" in response.url))
    
    if is_movie_detected:
        episodes.append({"id": item_id, "number": "1", "href": response.url if response else ""})
    else:
        # Extract post_id and seasons for AJAX
        season_links = response.css('.aa-cnt a, .se-q') if response else []
        post_id = None
        seasons = []
        for sl in season_links:
            post_id = sl.attrib.get('data-post') or sl.attrib.get('data-id')
            season_num = sl.attrib.get('data-season') or sl.text.strip()
            if post_id and season_num:
                seasons.append(season_num)
        
        if post_id and seasons:
            for s_num in seasons:
                ajax_url = f"https://watchanimeworld.net/wp-admin/admin-ajax.php?action=action_select_season&season={s_num}&post={post_id}"
                try:
                    ajax_res = fetcher.fetch(ajax_url)
                    ep_links = ajax_res.css('.lnk-blk, a[href*="/episode/"], a[href*="/watch/"]') if ajax_res else []
                    for link in ep_links:
                        href = link.attrib.get('href', '')
                        if "/episode/" not in href and "/watch/" not in href: continue
                        ep_id = href.rstrip('/').split('/')[-1]
                        num_el = link.css('.numerando, .ep, .num-ep')
                        text = num_el[0].text.strip() if num_el else ep_id.split('-')[-1]
                        if ep_id not in [e['id'] for e in episodes]:
                            episodes.append({"id": ep_id, "number": text, "href": href})
                except: continue
        # Fallback if AJAX failed or no seasons found
        if not episodes and response:
            ep_links = response.css('.episodios a, .lnk-blk, a[href*="/episode/"], a[href*="/watch/"]')
            for link in ep_links:
                href = link.attrib.get('href', '')
                if not href or ("/episode/" not in href and "/watch/" not in href): continue
                ep_id = href.rstrip('/').split('/')[-1]
                num_el = link.css('.numerando, .ep, .num-ep')
                text = num_el[0].text.strip() if num_el and num_el[0].text else ep_id.split('-')[-1].replace('x', '.')
                if ep_id and ep_id not in [e['id'] for e in episodes]:
                    episodes.append({"id": ep_id, "number": text, "href": href})

    title_el = response.css('h1.entry-title, .title, .name h1') if response else []
    title = title_el[0].text.strip() if title_el and title_el[0].text else item_id.replace('-', ' ').title()

    return {
        "id": item_id,
        "title": title,
        "episodes": episodes,
        "type": "movie" if is_movie_detected else "series"
    }

def scrape_watchanimeworld_source(episode_id):
    fetcher = StealthyFetcher()
    url = f"https://watchanimeworld.net/episode/{episode_id}/"
    
    # Try multiple URL patterns for episodes too
    urls = [url, f"https://watchanimeworld.net/watch/{episode_id}/", f"https://watchanimeworld.net/{episode_id}/"]
    response = None
    
    for u in urls:
        try:
            temp = fetcher.fetch(u, engine='chrome', timeout=25000)
            if temp and getattr(temp, 'status_code', 200) < 400 and temp.css('iframe, .video-player, .movie-player'):
                response = temp
                break
        except: continue

    if not response:
        # Search recovery for sources too
        clean_title = re.sub(r'-(episode|part)-\d+', '', episode_id.lower())
        guessed_title = re.sub(r'-(series|classic|20\d\d|19\d\d)', '', clean_title).replace('-', ' ').title()
        
        search_res = scrape_watchanimeworld(guessed_title)
        if search_res:
            new_url = search_res[0].get('href')
            if new_url:
                try:
                    response = fetcher.fetch(new_url, engine='chrome', timeout=30)
                except: pass

    if not response: return {"url": "", "sources": [], "error": "connectivity_issue"}
    
    server_buttons = response.css('.server-list li, .server-button, .btn-server, a[data-id], .dooplay_player_option, .play-video') if response else []
    sources = []
    
    # Direct iframe extraction
    iframes = response.css('iframe[src*="play."], iframe[src*="zephyr"], iframe[src*="embed"], iframe[src*="video"], iframe[src*="/v/"], iframe[src*="player"], .video-iframe iframe') if response else []
    if not iframes and response:
        iframes = response.css('.video-player iframe, .movie-player iframe, #player iframe, iframe')
        
    for iframe in iframes:
        src = iframe.attrib.get('src') or iframe.attrib.get('data-src')
        u = clean_source_url(src, "watchanimeworld.net")
        if u:
            sources.append({"name": "Primary", "url": u})

    # Data attribute extraction from buttons
    for btn in server_buttons:
        s_name = btn.text.strip() or btn.attrib.get('data-name') or btn.attrib.get('title') or "Server"
        s_url = btn.attrib.get('data-src') or btn.attrib.get('data-id') or btn.attrib.get('data-opt') or btn.attrib.get('href', '')
        
        if s_url and s_url != '#' and "javascript" not in s_url:
            if not s_url.startswith('http') and len(s_url) > 5:
                # Some might be base64 or relative
                if s_url.startswith('/'):
                    s_url = f"https://watchanimeworld.net{s_url}"
                elif not s_url.startswith('//') and '.' not in s_url[:10]:
                    # Likely a data-id, might need AJAX or more complex extraction
                    continue
            
            u = clean_source_url(s_url, "watchanimeworld.net")
            if u and u not in [s['url'] for s in sources]:
                sources.append({"name": s_name, "url": u})
    
    # Background text search for hidden links
    direct_links = extract_direct_video_links(response.text)
    for dl in direct_links:
        if dl not in [s['url'] for s in sources]:
            sources.append({"name": "Direct Link", "url": dl})

    return {
        "url": sources[0]['url'] if sources else "",
        "sources": sources
    }

def scrape_cinemacity(query):
    fetcher = StealthyFetcher()
    url = f"https://cinemacity.cc/index.php?do=search&subaction=search&story={query}"
    response = fetcher.fetch(url, engine='chrome')
    results = []
    if not response: return []
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
    if not response: return []
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
    if not response: return []
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

def scrape_justanime_search(query):
    fetcher = StealthyFetcher()
    url = f"https://justanime.to/search?keyword={query}"
    response = fetcher.fetch(url, engine='chrome')
    results = []
    if not response: return []
    items = response.css('a[href*="/anime/"]')
    seen_ids = set()
    for item in items:
        href = item.attrib.get('href', '')
        match = re.search(r'/anime/(\d+)/([^/]+)', href)
        if match:
            item_id = match.group(1)
            slug = match.group(2)
            if item_id in seen_ids: continue
            seen_ids.add(item_id)
            title = item.text.strip() if item.text else slug.replace('-', ' ').title()
            img_el = item.css('img')
            img = img_el[0].attrib.get('src') or img_el[0].attrib.get('data-src') or ""
            results.append({
                "id": f"ja:{item_id}",
                "title": title,
                "image": img if img.startswith('http') else f"https://justanime.to{img}",
                "type": "anime",
                "slug": slug
            })
    return results

def scrape_justanime_info(item_id, slug):
    fetcher = StealthyFetcher()
    url = f"https://justanime.to/anime/{item_id}/{slug}"
    response = fetcher.fetch(url, engine='chrome')
    episodes = []
    if not response: return {"id": item_id, "episodes": []}
    ep_links = response.css('a[href*="/watch/"]')
    for link in ep_links:
        href = link.attrib.get('href', '')
        num_match = re.search(r'episode-(\d+)', href)
        if num_match:
            ep_num = num_match.group(1)
            ep_id = href.split('/')[-1]
            episodes.append({"id": ep_id, "number": ep_num, "href": href if href.startswith('http') else f"https://justanime.to{href}"})
    title_el = response.css('h1, .title') if response else []
    title = title_el[0].text.strip() if title_el else slug.replace('-', ' ').title()
    return {"id": item_id, "title": title, "episodes": episodes, "type": "anime"}

def scrape_justanime_source(ep_id):
    fetcher = StealthyFetcher()
    url = f"https://justanime.to/watch/{ep_id}"
    response = fetcher.fetch(url, engine='chrome')
    sources = []
    if not response: return {"url": "", "sources": []}
    iframes = response.css('iframe') if response else []
    for iframe in iframes:
        src = iframe.attrib.get('src')
        if src and not src.startswith('#'):
             u = clean_source_url(src, "justanime.to")
             if u: sources.append({"name": "Server", "url": u})
    direct = extract_direct_video_links(response.text)
    for d in direct:
        if d not in [s['url'] for s in sources]: sources.append({"name": "Direct", "url": d})
    return {"url": sources[0]['url'] if sources else "", "sources": sources}

def scrape_animex_search(query):
    fetcher = StealthyFetcher()
    url = f"https://animex.one/search?q={query}"
    response = fetcher.fetch(url, engine='chrome')
    results = []
    if not response: return []
    items = response.css('a[href*="/anime/"]')
    seen_ids = set()
    for item in items:
        href = item.attrib.get('href', '')
        match = re.search(r'/anime/([^/]+)-(\d+)$', href)
        if match:
            slug = match.group(1)
            item_id = match.group(2)
            if item_id in seen_ids: continue
            seen_ids.add(item_id)
            title = item.text.strip() if item.text else slug.replace('-', ' ').title()
            img_el = item.css('img')
            img = img_el[0].attrib.get('src') or img_el[0].attrib.get('data-src') or ""
            results.append({"id": f"ax:{item_id}", "title": title, "image": img if img.startswith('http') else f"https://animex.one{img}", "type": "anime", "slug": slug})
    return results

def scrape_animex_info(item_id, slug):
    fetcher = StealthyFetcher()
    url = f"https://animex.one/anime/{slug}-{item_id}"
    response = fetcher.fetch(url, engine='chrome')
    episodes = []
    if not response: return {"id": item_id, "episodes": []}
    ep_links = response.css('a[href*="/watch/"]')
    for link in ep_links:
        href = link.attrib.get('href', '')
        ep_match = re.search(r'episode-(\d+)', href)
        if ep_match:
            ep_num = ep_match.group(1)
            ep_id = href.split('/')[-1]
            episodes.append({"id": ep_id, "number": ep_num, "href": href if href.startswith('http') else f"https://animex.one{href}"})
    title_el = response.css('h1, .title') if response else []
    title = title_el[0].text.strip() if title_el else slug.replace('-', ' ').title()
    return {"id": item_id, "title": title, "episodes": episodes, "type": "anime"}

def scrape_animex_source(ep_id):
    fetcher = StealthyFetcher()
    url = f"https://animex.one/watch/{ep_id}"
    response = fetcher.fetch(url, engine='chrome')
    sources = []
    if not response: return {"url": "", "sources": []}
    iframes = response.css('iframe') if response else []
    for iframe in iframes:
        src = iframe.attrib.get('src')
        if src and not src.startswith('#'):
             u = clean_source_url(src, "animex.one")
             if u: sources.append({"name": "Server", "url": u})
    direct = extract_direct_video_links(response.text)
    for d in direct:
        if d not in [s['url'] for s in sources]: sources.append({"name": "Direct", "url": d})
    return {"url": sources[0]['url'] if sources else "", "sources": sources}

def scrape_pstream(query):
    fetcher = StealthyFetcher()
    url = f"https://pstream.net/search/{query}"
    response = fetcher.fetch(url, engine='chrome')
    results = []
    if not response: return []
    items = response.css('a[href^="/media/"]')
    for item in items:
        href = item.attrib.get('href', '')
        title_el = item.css('.title, h3, .name') if item else []
        title = title_el[0].text.strip() if title_el else ""
        imgs = item.css('img') if item else []
        img = imgs[0].attrib.get('src', '') if imgs else ""
        if href:
            item_id = href.split('/')[-1]
            results.append({"id": f"ps:{item_id}", "title": title or item_id.replace('-', ' ').title(), "image": img, "url": f"https://pstream.net{href}" if href.startswith('/') else href, "type": "movie" if "tmdb-movie" in href else "tv"})
    return results

def scrape_universal_search(site_url, query):
    fetcher = StealthyFetcher()
    urls = [f"{site_url}/?s={query}", f"{site_url}/search?q={query}", f"{site_url}/search/{query}"]
    results = []
    for url in urls:
        try:
            response = fetcher.fetch(url, engine='chrome')
            if not response: continue
            items = response.css('.movie-item, .item, article, .post, a[href*="/movie/"], a[href*="/tv/"], a[href*="/series/"]')
            for item in items:
                links = item.css('a') if item.tag != 'a' else [item]
                if not links: continue
                href = links[0].attrib.get('href', '')
                title_el = item.css('.title, h3, h2, b') if item else []
                title = title_el[0].text.strip() if title_el else (links[0].text.strip() if links else "")
                imgs = item.css('img') if item else []
                img = (imgs[0].attrib.get('src') or imgs[0].attrib.get('data-src') or "") if imgs else ""
                if href and title:
                    item_id = href.rstrip('/').split('/')[-1]
                    results.append({"id": f"un:{site_url}:{item_id}", "title": title, "image": img if img.startswith('http') else f"{site_url}{img}" if img.startswith('/') else img, "href": href if href.startswith('http') else f"{site_url}{href}", "type": "movie" if "/movie/" in href else "tv"})
            if results: break
        except: continue
    return results

def scrape_universal_info(site_url, item_id):
    fetcher = StealthyFetcher()
    urls = [f"{site_url}/movie/{item_id}", f"{site_url}/tv/{item_id}", f"{site_url}/series/{item_id}", f"{site_url}/{item_id}"]
    response = None
    for url in urls:
        try:
            temp = fetcher.fetch(url, engine='chrome')
            if temp and getattr(temp, 'status_code', 200) < 400:
                response = temp
                break
        except: continue
    if not response: return {"id": item_id, "error": "Not found"}
    title_el = response.css('h1, .title')
    title = title_el[0].text.strip() if title_el else item_id
    episodes = []
    ep_links = response.css('a[href*="/episode/"], a[href*="-episode-"], .episode-item a')
    for link in ep_links:
        href = link.attrib.get('href', '')
        num_match = re.search(r'episode-(\d+)', href)
        num = num_match.group(1) if num_match else link.text.strip()
        episodes.append({"id": href.rstrip('/').split('/')[-1], "number": num, "href": href if href.startswith('http') else f"{site_url}{href}"})
    if not episodes and response: 
        episodes.append({"id": item_id, "number": "1", "href": response.url})
    
    return {
        "id": item_id, 
        "title": title, 
        "episodes": episodes, 
        "type": "movie" if (response and "/movie/" in response.url) else "tv"
    }

def scrape_universal_source(site_url, ep_id):
    fetcher = StealthyFetcher()
    urls = [f"{site_url}/watch/{ep_id}", f"{site_url}/episode/{ep_id}", f"{site_url}/{ep_id}"]
    response = None
    for url in urls:
        try:
            temp = fetcher.fetch(url, engine='chrome')
            if temp and getattr(temp, 'status_code', 200) < 400:
                response = temp
                break
        except: continue
    if not response: return {"url": "", "sources": []}
    sources = []
    iframes = response.css('iframe') if response else []
    for iframe in iframes:
        src = iframe.attrib.get('src')
        if src and "google" not in src and "facebook" not in src:
            target_domain = site_url.split('//')[-1] if '//' in site_url else site_url
            u = clean_source_url(src, target_domain)
            if u: sources.append({"name": "Server", "url": u})
    
    if response:
        direct = extract_direct_video_links(response.text)
        for d in direct:
            if d not in [s['url'] for s in sources]: sources.append({"name": "Direct", "url": d})
    return {"url": sources[0]['url'] if sources else "", "sources": sources}

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--query", help="Search query")
    parser.add_argument("--aniwatch_page", type=int, help="Page number for AniWatch TV list")
    parser.add_argument("--cartoon_query", help="Search specifically for cartoons")
    parser.add_argument("--cartoon_category", help="Fetch from a cartoon category")
    parser.add_argument("--wa_info", help="Get info for WatchAnimeWorld item")
    parser.add_argument("--wa_source", help="Get source for WatchAnimeWorld episode")
    parser.add_argument("--universal_site", help="Universal site base URL")
    parser.add_argument("--universal_item", help="Universal item ID for info")
    parser.add_argument("--universal_ep", help="Universal episode ID for source")
    parser.add_argument("--ja_query", help="JustAnime search query")
    parser.add_argument("--ja_info", help="JustAnime info ID")
    parser.add_argument("--ja_source", help="JustAnime source ID")
    parser.add_argument("--ax_query", help="Animex search query")
    parser.add_argument("--ax_info", help="Animex info ID")
    parser.add_argument("--ax_source", help="Animex source ID")
    parser.add_argument("--slug", help="Slug for anime info")
    
    args = parser.parse_args()
    output = {"onoflix": [], "watchanimeworld": [], "cinemacity": [], "filmex": [], "cinezo": [], "pstream": [], "wa_info": {}, "wa_source": {}, "aniwatch": [], "universal_search": [], "universal_info": {}, "universal_source": {}}
    
    if args.universal_site:
        if args.query: output["universal_search"] = scrape_universal_search(args.universal_site, args.query)
        if args.universal_item: output["universal_info"] = scrape_universal_info(args.universal_site, args.universal_item)
        if args.universal_ep: output["universal_source"] = scrape_universal_source(args.universal_site, args.universal_ep)
    
    if args.query:
        output["onoflix"] = scrape_onoflix_search(args.query)
        output["watchanimeworld"] = scrape_watchanimeworld(query=args.query)
        output["cinemacity"] = scrape_cinemacity(args.query)
        output["filmex"] = scrape_filmex(args.query)
        output["cinezo"] = scrape_cinezo(args.query)
        output["pstream"] = scrape_pstream(args.query)
    
    if args.ja_query: output["justanime"] = scrape_justanime_search(args.ja_query)
    if args.ja_info: output["ja_info"] = scrape_justanime_info(args.ja_info, args.slug)
    if args.ja_source: output["ja_source"] = scrape_justanime_source(args.ja_source)
    if args.ax_query: output["animex"] = scrape_animex_search(args.ax_query)
    if args.ax_info: output["ax_info"] = scrape_animex_info(args.ax_info, args.slug)
    if args.ax_source: output["ax_source"] = scrape_animex_source(args.ax_source)
    
    if args.cartoon_query: output["watchanimeworld"] = scrape_watchanimeworld(query=args.cartoon_query)
    if args.cartoon_category: output["watchanimeworld"] = scrape_watchanimeworld(category=args.cartoon_category)
    if args.wa_info: output["wa_info"] = scrape_watchanimeworld_info(args.wa_info)
    if args.wa_source: output["wa_source"] = scrape_watchanimeworld_source(args.wa_source)
    if args.aniwatch_page: output["aniwatch"] = scrape_aniwatch_tv_list(args.aniwatch_page)
    
    print(json.dumps(output))
