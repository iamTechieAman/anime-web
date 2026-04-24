import json
import sys
import argparse
import re
import random
from scrapling import StealthyFetcher

def get_random_headers(referer=""):
    user_agents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Safari/605.1.15',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:98.0) Gecko/20100101 Firefox/98.0'
    ]
    headers = {
        "User-Agent": random.choice(user_agents)
    }
    if referer:
        headers["Referer"] = referer
    return headers

# Helper to ensure we only get clean embed/video URLs, not full site pages
def clean_source_url(url, provider_domain):
    if not url: return ""
    # Filter out common non-video pages
    blacklist = [
        f"https://{provider_domain}/", f"https://www. {provider_domain}/",
        f"https://{provider_domain}//", f"https://{provider_domain}/series/",
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

    # Force Chrome for WA
    response = fetcher.fetch(url, engine='chrome', wait_until='domcontentloaded', timeout=20000)
    results = []
    
    if not response: return []
    items = response.css('.result-item, article.post, article.item, .movie-item, a.item__card.lnk-blk, .items article')
    
    for item in items:
        # Try to find the link and detect type
        href = item.attrib.get('href', '')
        if not href or not href.startswith('http'):
            links = item.css('a.lnk-blk, .details a, a')
            if links:
                href = links[0].attrib.get('href', '')
        
        if not href: continue

        # Detect type from URL or labels
        item_type = "series"
        if "//" in href:
            item_type = "movie"
        elif "/series/" in href:
            item_type = "series"
        else:
            labels = item.css('.aa-lnk, .view-button')
            for lbl in labels:
                txt = lbl.text.strip()
                if "Movie" in txt:
                    item_type = "movie"
                    break
                if "Serie" in txt:
                    item_type = "series"
                    break

        # Try multiple title patterns
        title = ""
        title_tag = item.css('h2.entry-title, h2, h3, .title, .details a')
        if title_tag:
            title = title_tag[0].text.strip()
        if not title:
            # Fallback to link text
            links = item.css('a.lnk-blk, .details a, a')
            if links:
                title = links[0].text.strip()
            
        imgs = item.css('.post-thumbnail img, img')
        img = ""
        if imgs:
            # Check data-src first for lazy loading
            img = imgs[0].attrib.get('data-src') or imgs[0].attrib.get('src') or ""
        
        if title and href:
            item_id = href.rstrip('/').split('/')[-1]
            results.append({
                "id": f"wa:{item_id}",
                "title": title,
                "image": img if img.startswith('http') else f"https:{img}" if img.startswith('//') else img,
                "type": item_type,
                "href": href
            })
    return results

def scrape_watchanimeworld_az(letter, page=1):
    fetcher = StealthyFetcher()
    url = f"https://watchanimeworld.net/letter/{letter.upper()}/" if page == 1 else f"https://watchanimeworld.net/letter/{letter.upper()}/page/{page}/"
    
    response = fetcher.fetch(url, engine='chrome', wait_until='domcontentloaded')
    results = []
    
    if not response: return []
    items = response.css('.items article, a.item__card.lnk-blk, article.post')
    
    for item in items:
        links = item.css('a.lnk-blk, a')
        if not links: continue
        
        href = links[0].attrib.get('href', '')
        title_el = item.css('h2, h3, .title')
        title = title_el[0].text.strip() if title_el else ""
        imgs = item.css('img')
        img = imgs[0].attrib.get('data-src') or imgs[0].attrib.get('src') or ""
        
        if title and href:
            item_id = href.rstrip('/').split('/')[-1]
            results.append({
                "id": f"wa:{item_id}",
                "title": title,
                "image": img if img.startswith('http') else f"https:{img}" if img.startswith('//') else img,
                "type": "anime",
                "href": href
            })
    return results

def scrape_watchanimeworld_info(item_id):
    fetcher = StealthyFetcher()
    is_movie = "-movie" in item_id or "movies" in item_id
    
    # Try multiple URL patterns
    urls_to_try = [
        f"https://watchanimeworld.net/series/{item_id}/",
        f"https://watchanimeworld.net//{item_id}/",
        f"https://watchanimeworld.net/{item_id}/"
    ]
    
    if is_movie:
        urls_to_try = [urls_to_try[1], urls_to_try[0], urls_to_try[2]]
        
    response = None
    for url in urls_to_try:
        try:
            # Always use chrome for info and WAIT for DOM to ensure dynamic content loads
            temp_resp = fetcher.fetch(url, engine='chrome', wait_until='domcontentloaded', timeout=25000)
            status = getattr(temp_resp, 'status_code', getattr(temp_resp, 'status', 200))
            if temp_resp and status < 400:
                # Basic validation that we are on a valid content page
                if temp_resp.css('h1.entry-title, .title, .episodios, .aa-cnt, .item__card, .play-video'):
                    response = temp_resp
                    break
        except:
            continue
            
    # Basic chrome fallback removed as we now use it in the loop above
    status = getattr(response, 'status_code', getattr(response, 'status', 200)) if response else 404
    episodes = []
    if (not response or status >= 400) and not is_movie:
        # SEARCH RECOVERY
        clean_title = re.sub(r'-(series|classic|20\d\d|19\d\d)', '', item_id.lower())
        guessed_title = clean_title.replace('-', ' ').title()
        
        print(f"[Scraper] 404 on direct lookup for {item_id}. Search recovery for '{guessed_title}'...", file=sys.stderr)
        search_res = scrape_watchanimeworld(guessed_title)
        
        if not search_res:
            words = guessed_title.split()
            if "Episode" in words:
                ep_idx = words.index("Episode")
                guessed_title = " ".join(words[:ep_idx])
                search_res = scrape_watchanimeworld(guessed_title)
            
            if not search_res and len(words) > 2:
                short_words = words[:2]
                search_res = scrape_watchanimeworld(" ".join(short_words))

        if search_res:
            valid_results = [r for r in search_res if r['id'] != item_id]
            if valid_results:
                best_match = valid_results[0]
                for r in valid_results:
                    if r['title'].lower() in guessed_title.lower():
                        best_match = r
                        break
                
                urls_to_try = [
                    f"https://watchanimeworld.net/series/{best_match['id']}/",
                    f"https://watchanimeworld.net//{best_match['id']}/",
                    f"https://watchanimeworld.net/{best_match['id']}/"
                ]
                for url in urls_to_try:
                    try:
                        temp_resp = fetcher.fetch(url)
                        if temp_resp and getattr(temp_resp, 'status_code', 200) < 400:
                            response = temp_resp
                            break
                    except: continue

    if not response:
        return {"id": item_id, "title": "Error: Content Not Found", "episodes": [], "type": "series"}
        
    is_movie_detected = is_movie or (response and ("//" in response.url or "/movie/" in response.url))
    if response and not is_movie_detected:
        # Check for duration text or other movie indicators (Torofilm usually shows duration for movies)
        text_content = response.text.lower()
        if "duration" in text_content or "1h " in text_content or "2h " in text_content or "matsuri" in text_content:
            if not response.css('.episodios, .aa-cnt, .se-q'):
                is_movie_detected = True

    if is_movie_detected:
        episodes.append({"id": item_id, "number": "1", "href": response.url if response else ""})
    else:
        # Extract post_id and seasons for AJAX
        season_links = response.css('.aa-cnt a')
        post_id = None
        seasons = []
        for sl in season_links:
            post_id = sl.attrib.get('data-post')
            season_num = sl.attrib.get('data-season')
            if post_id and season_num:
                seasons.append(season_num)
        
        if post_id and seasons:
            for s_num in seasons:
                ajax_url = f"https://watchanimeworld.net/wp-admin/admin-ajax.php?action=action_select_season&season={s_num}&post={post_id}"
                try:
                    ajax_res = fetcher.fetch(ajax_url)
                    ep_links = ajax_res.css('.lnk-blk, a[href*="/episode/"]')
                    for link in ep_links:
                        href = link.attrib.get('href', '')
                        if "/episode/" not in href: continue
                        ep_id = href.rstrip('/').split('/')[-1]
                        num_el = link.css('.numerando, .ep')
                        text = num_el[0].text.strip() if num_el else ep_id.split('-')[-1]
                        if ep_id not in [e['id'] for e in episodes]:
                            episodes.append({"id": ep_id, "number": text, "href": href})
                except: continue
        
        if not episodes:
            ep_links = response.css('.episodios a, .lnk-blk, a[href*="/episode/"]')
            for link in ep_links:
                href = link.attrib.get('href', '')
                if not href or "/episode/" not in href: continue
                ep_id = href.rstrip('/').split('/')[-1]
                num_el = link.css('.numerando, .ep')
                text = num_el[0].text.strip() if num_el else ep_id.split('-')[-1]
                if ep_id and ep_id not in [e['id'] for e in episodes]:
                    episodes.append({"id": ep_id, "number": text, "href": href})

    title_el = response.css('h1.entry-title, .title')
    title = title_el[0].text.strip() if title_el else item_id

    return {
        "id": item_id,
        "title": title,
        "episodes": episodes,
        "type": "movie" if is_movie_detected else "series"
    }

def scrape_watchanimeworld_source(episode_id):
    fetcher = StealthyFetcher()
    url = f"https://watchanimeworld.net/episode/{episode_id}/"
    response = fetcher.fetch(url, engine='chrome')
    
    if not response or getattr(response, 'status_code', 200) >= 400:
        url = f"https://watchanimeworld.net//{episode_id}/"
        response = fetcher.fetch(url, engine='chrome')

    if not response or getattr(response, 'status_code', 200) >= 400:
        clean_title = re.sub(r'-(episode|part)-\d+', '', episode_id.lower())
        guessed_title = re.sub(r'-(series|classic|20\d\d|19\d\d)', '', clean_title).replace('-', ' ').title()
        
        search_res = scrape_watchanimeworld(guessed_title)
        if search_res:
            new_url = search_res[0].get('href')
            if new_url:
                response = fetcher.fetch(new_url, engine='chrome')

    if not response: return {"url": "", "sources": []}
    
    server_buttons = response.css('.server-list li, .server-button, .btn-server, a[data-id], .dooplay_player_option')
    sources = []
    
    iframes = response.css('iframe[src*="play."], iframe[src*="zephyr"], iframe[src*="embed"], iframe[src*="video"], iframe[src*="/v/"], iframe[src*="player"]')
    if not iframes:
        iframes = response.css('iframe::attr(src)').getall()
        for src in iframes:
            if any(x in src.lower() for x in ['vid', 'embed', 'player', 'stream', 'load']):
                sources.append({"url": src, "name": "Server"})
        
        video_srcs = response.css('video source::attr(src)').getall()
        for vsrc in video_srcs:
            sources.append({"url": vsrc, "name": "Direct"})
            
    if not sources:
        for iframe in response.css('iframe::attr(src)').getall():
            if 'http' in iframe:
                sources.append({"url": iframe, "name": "Player"})

    for btn in server_buttons:
        s_name = btn.text.strip() or btn.attrib.get('data-name') or "Server"
        s_url = btn.attrib.get('data-src') or btn.attrib.get('data-id') or btn.attrib.get('data-opt') or btn.attrib.get('href', '')
        
        if s_url and s_url != '#' and "javascript" not in s_url:
            if not s_url.startswith('http') and len(s_url) > 5:
                s_url = f"https://watchanimeworld.net{s_url if s_url.startswith('/') else '/' + s_url}"
            u = clean_source_url(s_url, "watchanimeworld.net")
            if u and u not in [s['url'] for s in sources]:
                sources.append({"name": s_name, "url": u})
    
    direct_links = extract_direct_video_links(response.text)
    for dl in direct_links:
        if dl not in [s['url'] for s in sources]:
            sources.append({"name": "Direct", "url": dl})

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
                "type": "movie" if "//" in href else "tv"
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
    title_el = response.css('h1, .title')
    title = title_el[0].text.strip() if title_el else slug.replace('-', ' ').title()
    return {"id": item_id, "title": title, "episodes": episodes, "type": "anime"}

def scrape_justanime_source(ep_id):
    fetcher = StealthyFetcher()
    url = f"https://justanime.to/watch/{ep_id}"
    response = fetcher.fetch(url, engine='chrome')
    sources = []
    if not response: return {"url": "", "sources": []}
    iframes = response.css('iframe')
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
    title_el = response.css('h1, .title')
    title = title_el[0].text.strip() if title_el else slug.replace('-', ' ').title()
    return {"id": item_id, "title": title, "episodes": episodes, "type": "anime"}

def scrape_animex_source(ep_id):
    fetcher = StealthyFetcher()
    url = f"https://animex.one/watch/{ep_id}"
    response = fetcher.fetch(url, engine='chrome')
    sources = []
    if not response: return {"url": "", "sources": []}
    iframes = response.css('iframe')
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
        title_el = item.css('.title, h3, .name')
        title = title_el[0].text.strip() if title_el else ""
        imgs = item.css('img')
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
                title_el = item.css('.title, h3, h2, b')
                title = title_el[0].text.strip() if title_el else links[0].text.strip()
                imgs = item.css('img')
                img = imgs[0].attrib.get('src') or imgs[0].attrib.get('data-src') or ""
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
    if not response or not hasattr(response, 'css'): 
        return {"id": item_id, "error": "Not found"}
    title_el = response.css('h1, .title')
    title = title_el[0].text.strip() if title_el else item_id
    episodes = []
    ep_links = response.css('a[href*="/episode/"], a[href*="-episode-"], .episode-item a')
    for link in ep_links:
        href = link.attrib.get('href', '')
        num_match = re.search(r'episode-(\d+)', href)
        num = num_match.group(1) if num_match else link.text.strip()
        episodes.append({"id": href.rstrip('/').split('/')[-1], "number": num, "href": href if href.startswith('http') else f"{site_url}{href}"})
    if not episodes: episodes.append({"id": item_id, "number": "1", "href": response.url})
    return {"id": item_id, "title": title, "episodes": episodes, "type": "movie" if "/movie/" in response.url else "tv"}

def scrape_onoflix_search(query):
    import requests
    url = f"https://onoflix.live/api/search?q={query}"
    headers = get_random_headers("https://onoflix.live/")
    try:
        resp = requests.get(url, headers=headers, timeout=15)
        if resp.status_code != 200: return []
        data = resp.json()
        
        results = []
        items = data.get('results', []) if isinstance(data, dict) else data
        for item in items:
            if not isinstance(item, dict): continue
            real_id = str(item.get('id', ''))
            title = item.get('title') or item.get('name') or "Unknown Title"
            item_type = item.get('media_type', 'movie')
            slug = title.lower().replace(' ', '-').replace(':', '').replace('--', '-')
            img = item.get('poster_path', '')
            
            # Use of:{type}:{tmdb_id} format to ensure watch page can find it
            results.append({
                "id": f"of:{item_type}:{real_id}",
                "title": title,
                "image": f"https://image.tmdb.org/t/p/w500{img}" if img else "",
                "type": "movie" if item_type == "movie" else "series",
                "slug": slug,
                "real_id": real_id
            })
        return results
    except Exception as e:
        print(f"[Onoflix] Search Error: {e}", file=sys.stderr)
        return []

def scrape_onoflix_info(item_id, item_type="movie"):
    # item_id is typically the TMDB ID
    import requests
    url = f"https://onoflix.live/en/watch/{item_type}/{item_id}"
    headers = get_random_headers("https://onoflix.live/")
    try:
        resp = requests.get(url, headers=headers, timeout=15)
        if resp.status_code != 200:
            return {"id": item_id, "error": f"HTTP {resp.status_code}"}
        
        html = resp.text
        # Extract title from <title> tag
        title_match = re.search(r'<title>(.*?) - ONOFLIX</title>', html)
        title = title_match.group(1).replace('Watch ', '').replace(' HD free', '') if title_match else item_id
        
        episodes = []
        if item_type == "series":
            # For series, we might need to find episodes in the hydration data
            # Simple fallback for now: show the main watch page
            episodes.append({"id": item_id, "number": "1", "title": title})
        else:
            episodes.append({"id": item_id, "number": "1", "title": title})
            
        return {"id": item_id, "title": title, "episodes": episodes, "type": item_type}
    except Exception as e:
        return {"id": item_id, "error": str(e)}

def scrape_onoflix_source(item_id, item_type="movie"):
    import requests
    url = f"https://onoflix.live/en/watch/{item_type}/{item_id}"
    headers = get_random_headers("https://onoflix.live/")
    try:
        resp = requests.get(url, headers=headers, timeout=15)
        if resp.status_code != 200: return {"url": "", "sources": []}
        
        html = resp.text
        sources = []
        
        # Look for standard embed providers that Onoflix is known to use
        # If we can't find them in HTML (since it's Next.js hydration), 
        # we provide the direct watch link and common fallbacks
        
        # Check for any iframe in HTML just in case
        iframes = re.findall(r'<iframe[^>]*src="([^"]+)"', html)
        for src in iframes:
            if 'http' in src:
                sources.append({"name": "Server", "url": src})
        
        # Onoflix often uses these as their backend providers
        # We can reconstruct them if we have the TMDB ID
        tmdb_id = item_id.split('/')[-1]
        
        if not sources:
            # Fallback to known providers Onoflix UI shows
            sources.append({"name": "Onoflix (Main)", "url": url})
            sources.append({"name": "VidSrc", "url": f"https://vidsrc.me/embed/{item_type}?tmdb={tmdb_id}"})
            sources.append({"name": "Peachify", "url": f"https://peachify.net/embed/{item_type}/{tmdb_id}"})
            
        return {"url": sources[0]['url'] if sources else "", "sources": sources}
    except Exception as e:
        return {"url": "", "sources": [], "error": str(e)}

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
    if not response or not hasattr(response, 'css'): 
        return {"url": "", "sources": []}
    sources = []
    iframes = response.css('iframe')
    for iframe in iframes:
        src = iframe.attrib.get('src')
        if src and "google" not in src and "facebook" not in src:
            u = clean_source_url(src, site_url.split('//')[-1])
            if u: sources.append({"name": "Server", "url": u})
    direct = extract_direct_video_links(response.text)
    for d in direct:
        if d not in [s['url'] for s in sources]: sources.append({"name": "Direct", "url": d})
    return {"url": sources[0]['url'] if sources else "", "sources": sources}

def scrape_animesalt_search(query):
    fetcher = StealthyFetcher()
    url = f"https://animesalt.ac/?s={query}"
    response = fetcher.fetch(url, engine='chrome')
    results = []
    if not response: return []
    
    items = response.css('article.post')
    for item in items:
        link_el = item.css('a')
        if not link_el: continue
        href = link_el[0].attrib.get('href', '')
        title_el = item.css('.title, h2')
        title = title_el[0].text.strip() if title_el else ""
        img_el = item.css('img')
        img = img_el[0].attrib.get('src') or img_el[0].attrib.get('data-src') or ""
        
        if href and title:
            item_id = href.rstrip('/').split('/')[-1]
            results.append({
                "id": f"as:{item_id}",
                "title": title,
                "image": img if img.startswith('http') else f"https://animesalt.ac{img}" if img.startswith('/') else img,
                "href": href,
                "type": "movie" if "/movies/" in href else "series"
            })
    return results

def scrape_animesalt_info(item_id):
    fetcher = StealthyFetcher()
    urls = [f"https://animesalt.ac/series/{item_id}/", f"https://animesalt.ac/movies/{item_id}/", f"https://animesalt.ac/{item_id}/"]
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
    ep_links = response.css('a[href*="/episode/"]')
    for link in ep_links:
        href = link.attrib.get('href', '')
        num_match = re.search(r'-(\d+)x(\d+)', href)
        ep_num = num_match.group(2) if num_match else href.rstrip('/').split('-')[-1]
            
        ep_id = href.rstrip('/').split('/')[-1]
        if ep_id not in [e['id'] for e in episodes]:
            episodes.append({"id": ep_id, "number": ep_num, "href": href})
    
    if not episodes:
        episodes.append({"id": item_id, "number": "1", "href": response.url})
        
    return {"id": item_id, "title": title, "episodes": episodes, "type": "movie" if "/movies/" in response.url else "series"}

def scrape_aniwaves_search(query):
    fetcher = StealthyFetcher()
    url = f"https://aniwaves.ru/search?keyword={query}"
    response = fetcher.fetch(url, engine='chrome')
    results = []
    if not response: return []
    items = response.css('a[href*="/watch/"]')
    seen_ids = set()
    for item in items:
        href = item.attrib.get('href', '')
        match = re.search(r'/watch/([^/]+)', href)
        if match:
            item_id = match.group(1)
            if item_id in seen_ids: continue
            seen_ids.add(item_id)
            title_el = item.css('.name, .title, h3')
            title = title_el[0].text.strip() if title_el else item_id.replace('-', ' ').title()
            img_el = item.css('img')
            img = img_el[0].attrib.get('src') or img_el[0].attrib.get('data-src') or ""
            results.append({
                "id": f"anw:{item_id}",
                "title": title,
                "image": img if img.startswith('http') else f"https://aniwaves.ru{img}",
                "type": "anime",
                "href": href
            })
    return results

def scrape_aniwaves_info(item_id):
    fetcher = StealthyFetcher()
    url = f"https://aniwaves.ru/watch/{item_id}"
    response = fetcher.fetch(url, engine='chrome')
    episodes = []
    if not response: return {"id": item_id, "episodes": []}
    
    ep_links = response.css('.episodes a, a[data-ep], a[href*="/watch/"]')
    for link in ep_links:
        href = link.attrib.get('href', '')
        if item_id not in href: continue
        ep_id = href.split('/')[-1]
        ep_num = link.attrib.get('data-ep') or link.text.strip()
        if ep_num and ep_num.isdigit():
            episodes.append({"id": ep_id, "number": ep_num, "href": href})
            
    title_el = response.css('h1, .title')
    title = title_el[0].text.strip() if title_el else item_id.replace('-', ' ').title()
    return {"id": item_id, "title": title, "episodes": episodes, "type": "anime"}

def scrape_aniwaves_source(ep_id):
    fetcher = StealthyFetcher()
    url = f"https://aniwaves.ru/watch/{ep_id}"
    response = fetcher.fetch(url, engine='chrome')
    sources = []
    if not response: return {"url": "", "sources": []}
    
    iframes = response.css('iframe')
    for iframe in iframes:
        src = iframe.attrib.get('src')
        if src and not src.startswith('#'):
              u = clean_source_url(src, "aniwaves.ru")
              if u: sources.append({"name": "Server", "url": u})
              
    direct = extract_direct_video_links(response.text)
    for d in direct:
        if d not in [s['url'] for s in sources]: sources.append({"name": "Direct", "url": d})
        
    return {"url": sources[0]['url'] if sources else "", "sources": sources}

def scrape_aniwaves_home():
    fetcher = StealthyFetcher()
    url = "https://aniwaves.ru/home"
    response = fetcher.fetch(url, engine='chrome')
    results = {"slides": [], "latest": [], "trending": []}
    if not response: return results
    # Generic selectors based on common styles
    items = response.css('.flw-item, .item, .swiper-slide')
    for item in items:
        title_el = item.css('.name, .title, .film-name')
        title = title_el[0].text.strip() if title_el else ""
        href = item.css('a').attrib.get('href', '')
        if "/watch/" not in href: continue
        item_id = href.split('/')[-1]
        img_el = item.css('img')
        img = img_el[0].attrib.get('src') or img_el[0].attrib.get('data-src') or ""
        if title and item_id:
            results["latest"].append({
                "id": f"anw:{item_id}",
                "title": title,
                "image": img if img.startswith('http') else f"https://aniwaves.ru{img}",
                "type": "anime"
            })
    return results

def scrape_aniwaves_az(letter, page=1):
    fetcher = StealthyFetcher()
    path = letter.lower()
    if path == '0-9': path = 'other'
    url = f"https://aniwaves.ru/az-list/{path}?page={page}" if path != 'all' else f"https://aniwaves.ru/az-list?page={page}"
    response = fetcher.fetch(url, engine='chrome')
    results = []
    if not response: return []
    items = response.css('.flw-item')
    for item in items:
        title = item.css('.film-name').text.strip()
        href = item.css('a').attrib.get('href', '')
        item_id = href.split('/')[-1] if href else ""
        img = item.css('img').attrib.get('src') or item.css('img').attrib.get('data-src') or ""
        if title and item_id:
            results.append({
                "id": f"anw:{item_id}",
                "title": title,
                "image": img if img.startswith('http') else f"https://aniwaves.ru{img}",
                "type": "anime"
            })
    return results

async def open_claw_engine(url):
    import pyppeteer
    import logging
    from bs4 import BeautifulSoup
    import random
    import requests
    import time
    import asyncio
    
    logging.basicConfig(filename='openclaw.log', level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
    logging.info(f"OpenClaw Engine starting on {url}")
    
    try:
        browser = await pyppeteer.launch(headless=True, args=[
            '--disable-setuid-sandbox', '--no-sandbox',
            f'user-agent=Mozilla/5.0 (Windows NT {random.randint(10,12)}.{random.randint(3,9)}) AppleWebKit/{random.randint(607,618)}.36'
        ])
        
        page = await browser.newPage()
        await page.setViewport({'width': 1920, 'height': 1080})
        
        # Intercept network requests to find the getVideo POST
        found_source = {"url": None}
        async def intercept_response(response):
            if 'getVideo' in response.url and response.request.method == 'POST':
                try:
                    data = await response.json()
                    if data.get('videoSource'):
                        found_source["url"] = data['videoSource']
                        logging.info(f"OpenClaw intercepted source: {found_source['url']}")
                except: pass

        page.on('response', lambda res: asyncio.ensure_future(intercept_response(res)))
        
        try:
            await page.goto(url, {'timeout': 45000, 'waitUntil': 'networkidle2'})
            # Give it a bit more time for AJAX
            await asyncio.sleep(2)
        except Exception as e:
            logging.error(f"OpenClaw navigation error: {e}")
            
        if found_source["url"]:
            return {"url": found_source["url"], "sources": [{"name": "OpenClaw High-Speed", "url": found_source["url"], "hls": True}]}

        # Fallback to interactive extraction
        html_content = await page.content()
        soup = BeautifulSoup(html_content, 'html.parser')
        iframes = soup.find_all('iframe')
        video_srcs = [i.get('src') for i in iframes if i.get('src') and any(x in i.get('src').lower() for x in ['vid', 'embed', 'player', 'm3u8'])]
        
        if video_srcs:
            return {"url": video_srcs[0], "sources": [{"name": "OpenClaw Found", "url": s} for s in video_srcs]}
            
        return {"url": url, "content": "No direct source intercepted"}
            
    finally:
        await browser.close()

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
    parser.add_argument("--wa_az_letter", help="Letter for WatchAnimeWorld A-Z")
    parser.add_argument("--wa_az_page", type=int, default=1, help="Page for WatchAnimeWorld A-Z")
    parser.add_argument("--of_info", help="Onoflix info ID")
    parser.add_argument("--of_type", default="series", help="Onoflix item type (movie/series)")
    parser.add_argument("--of_source", help="Onoflix source ID")
    parser.add_argument("--anw_query", help="Aniwaves search query")
    parser.add_argument("--anw_info", help="Aniwaves info ID")
    parser.add_argument("--anw_source", help="Aniwaves source ID")
    parser.add_argument("--anw_home", action="store_true", help="Fetch Aniwaves home")
    parser.add_argument("--anw_az", help="Aniwaves A-Z letter")
    parser.add_argument("--anw_page", type=int, default=1, help="Aniwaves page number")
    parser.add_argument("--adaptive", help="Use adaptive pyppeteer unblocking on specific URL")
    
    args = parser.parse_args()
    output = {"onoflix": [], "watchanimeworld": [], "cinemacity": [], "filmex": [], "cinezo": [], "pstream": [], "wa_info": {}, "wa_source": {}, "aniwatch": [], "universal_search": [], "universal_info": {}, "universal_source": {}, "animesalt": [], "aniwaves": []}
    
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
    if args.anw_query: output["aniwaves"] = scrape_aniwaves_search(args.anw_query)
    if args.anw_info: output["anw_info"] = scrape_aniwaves_info(args.anw_info)
    if args.anw_source: output["anw_source"] = scrape_aniwaves_source(args.anw_source)
    if args.anw_home: output["anw_home"] = scrape_aniwaves_home()
    if args.anw_az: output["anw_az"] = scrape_aniwaves_az(args.anw_az, args.anw_page)
    
    if args.slug and "as:" in str(args.slug): # Custom check for animesalt info
        output["as_info"] = scrape_animesalt_info(args.slug.replace("as:", ""))
    elif args.slug and "as-ep:" in str(args.slug): # Custom check for animesalt source
        import asyncio
        url = f"https://animesalt.ac/episode/{args.slug.replace('as-ep:', '')}/"
        output["as_source"] = asyncio.get_event_loop().run_until_complete(open_claw_engine(url))
    
    if args.cartoon_query: output["watchanimeworld"] = scrape_watchanimeworld(query=args.cartoon_query)
    if args.cartoon_category: output["watchanimeworld"] = scrape_watchanimeworld(category=args.cartoon_category)
    if args.wa_info: output["wa_info"] = scrape_watchanimeworld_info(args.wa_info)
    if args.wa_source: output["wa_source"] = scrape_watchanimeworld_source(args.wa_source)
    if args.aniwatch_page: output["aniwatch"] = scrape_aniwatch_tv_list(args.aniwatch_page)
    
    if args.wa_az_letter: output["watchanimeworld"] = scrape_watchanimeworld_az(args.wa_az_letter, args.wa_az_page)
    
    if args.of_info: output["of_info"] = scrape_onoflix_info(args.of_info, args.of_type)
    if args.of_source: output["of_source"] = scrape_onoflix_source(args.of_source, args.of_type)
    
    if args.adaptive:
        import asyncio
        output["adaptive_scrape"] = asyncio.get_event_loop().run_until_complete(open_claw_engine(args.adaptive))
        
    print(json.dumps(output))
