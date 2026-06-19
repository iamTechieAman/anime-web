import requests
import json
import sys
import argparse
import re
import os
from bs4 import BeautifulSoup

# Wrapper classes to make ScrapingBee responses behave exactly like Scrapling responses
class BSWrapper:
    def __init__(self, el):
        self.el = el
        self.tag = el.name
        self.attrib = el.attrs if el.attrs else {}
        
    @property
    def text(self):
        return self.el.get_text()
        
    def css(self, selector):
        return [BSWrapper(item) for item in self.el.select(selector)]
        
    def string(self):
        return self.el.string or self.el.get_text() or ""

class ScrapingBeeResponse:
    def __init__(self, content):
        self.content = content
        self.text = content.decode('utf-8', errors='ignore') if isinstance(content, bytes) else str(content)
        self.soup = BeautifulSoup(self.text, 'lxml')
        
    def css(self, selector):
        return [BSWrapper(item) for item in self.soup.select(selector)]
        
    @property
    def status_code(self):
        return 200

# Intercepts Scrapling's StealthyFetcher and routes requests through ScrapingBee if API key is present
class StealthyFetcher:
    def __init__(self, *args, **kwargs):
        self.real_fetcher = None
        
    def fetch(self, url, *args, **kwargs):
        scrapingbee_key = os.environ.get("SCRAPINGBEE_API_KEY")
        if scrapingbee_key:
            print(f"[Scraper API] Routing through ScrapingBee: {url}")
            try:
                from scrapingbee import ScrapingBeeClient
                client = ScrapingBeeClient(api_key=scrapingbee_key)
                
                engine = kwargs.get('engine', 'chrome')
                wait_until = kwargs.get('wait_until', 'domcontentloaded')
                
                # Configure ScrapingBee request parameters
                params = {
                    'premium_proxy': True,      # Use premium residential proxies to bypass tough anti-bots
                    'country_code': 'us',       # Route through US coordinates by default
                    'device': 'desktop',        # Spoof desktop viewport
                }
                
                # Render JS dynamically for Chrome engine or specific wait-until conditions
                if engine == 'chrome' or wait_until == 'networkidle' or 'wait_until' in kwargs:
                    params['render_js'] = True
                    params['wait'] = "2000"     # Wait 2 seconds for JS execution
                    
                resp = client.get(url, params=params)
                if resp.ok:
                    return ScrapingBeeResponse(resp.content)
                else:
                    print(f"[Scraper API] ScrapingBee request failed with status {resp.status_code}, falling back to local Scrapling...")
            except Exception as e:
                print(f"[Scraper API] ScrapingBee exception: {e}, falling back to local Scrapling...")
                
        # Fall back to local Scrapling fetcher
        if not self.real_fetcher:
            from scrapling import StealthyFetcher as RealFetcher # type: ignore
            self.real_fetcher = RealFetcher()
        return self.real_fetcher.fetch(url, *args, **kwargs)

# Helper to ensure we only get clean embed/video URLs, not full site pages
def clean_source_url(url, provider_domain):
    if not url: return ""
    # Filter out common non-video pages more aggressively
    blacklist = [
        f"https://{provider_domain}/", f"https://www. {provider_domain}/",
        f"https://{provider_domain}/movies/", f"https://{provider_domain}/series/",
        "/category/", "/genre/", "/tag/", "/search/", "/contact-us/", "/dmca/",
        "/about-us/", "/privacy-policy/", "/terms-and-conditions/"
    ]
    
    # White-list of known embed/video patterns
    whitelist = [
        '.m3u8', '.mp4', 'embed', 'player', '/v/', 'zephyr', 'zplayer', 
        'vidsrc', 'upstream', 'streamwish', 'vidmoly', 'dood', 'mixdrop',
        'multiembed', 'rabbitstream', 'megacloud', 'streamlare', 'filemoon'
    ]
    
    # If the URL is just the base page, it's definitely not a source
    if url.rstrip('/') == f"https://{provider_domain}" or url.rstrip('/') == f"http://{provider_domain}":
        return ""
        
    if any(b in url for b in blacklist) and not any(w in url.lower() for w in whitelist):
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
    response = fetcher.fetch(url, wait_until='networkidle', timeout=25000)
    
    if not response or not response.css('div.grid, a[href*="/movie/"]'):
        response = fetcher.fetch(url, engine='chrome', wait_until='networkidle', timeout=25000)
    
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
    response = fetcher.fetch(url, wait_until='domcontentloaded', timeout=20000)
    
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
    url = "https://watchanimeworld.net/"
    if query:
        url = f"https://watchanimeworld.net/?s={query}"
    elif category:
        url = f"https://watchanimeworld.net/category/{category}/"
    
    # Force Chrome engine for better bypass and JS rendering
    response = fetcher.fetch(url, engine='chrome', wait_until='domcontentloaded', timeout=20000)
    results = []
    
    if not response: return []
    # Hybrid selector for different page structures (Home, Search, A-Z)
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
        if "/movies/" in href:
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
    # Pattern discovered: /letter/{LETTER}/page/{PAGE}/
    url = f"https://watchanimeworld.net/letter/{letter.upper()}/" if page == 1 else f"https://watchanimeworld.net/letter/{letter.upper()}/page/{page}/"
    
    # Enforcement: Always use chrome for WA as it's heavily dynamic/protected
    response = fetcher.fetch(url, engine='chrome', wait_until='domcontentloaded')
    results = []
    
    if not response: return []
    # Hybrid selector for different page structures
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
        if "/movies/" in href:
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

def scrape_watchanimeworld_info(item_id):
    fetcher = StealthyFetcher()
    is_movie = "-movie" in item_id or "movies" in item_id
    
    # Research showed better patterns for direct links
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
                # Use a explicit slice to satisfy IDE type checkers
                title_slice = list(title_words)[0:2] # type: ignore
                search_res = scrape_watchanimeworld(" ".join(title_slice))

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
    urls = [url, f"https://watchanimeworld.net/watch/{episode_id}/", f"https://watchanimeworld.net/{episode_id}/"]
    response = None
    
    for u in urls:
        try:
            temp = fetcher.fetch(u, engine='chrome', timeout=30000, wait_until='networkidle')
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
    
    if response and hasattr(response, 'text'):
        # 1. Look for zephyrflick player
        zephyr_match = re.search(r'https://play\.zephyrflick\.top/video/([a-zA-Z0-9]+)', response.text) # type: ignore
        if zephyr_match:
            sources.append({"name": "Zephyr Player", "url": zephyr_match.group(0)})

    # Direct iframe extraction
    iframes = response.css('iframe[src*="play."], iframe[src*="zephyr"], iframe[src*="embed"], iframe[src*="video"], iframe[src*="/v/"], iframe[src*="player"], .video-iframe iframe') if response else []
    if not iframes and response:
        iframes = response.css('.video-player iframe, .movie-player iframe, #player iframe, iframe')

    for iframe in iframes:
        src = iframe.attrib.get('src') or iframe.attrib.get('data-src') or iframe.attrib.get('data-lazy-src') # type: ignore
        if src and "google" not in src and "facebook" not in src and "twitter" not in src:
            target_domain = "watchanimeworld.net" # Fix undefined url shadowing
            u = clean_source_url(src, target_domain)
            if u and u not in [s['url'] for s in sources]: 
                sources.append({"name": "Server", "url": u})

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
            if u and u not in [s['url'] for s in sources] and u != f"https://watchanimeworld.net{s_url}" if s_url.startswith('/') else True:
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
    response = fetcher.fetch(url, engine='chrome', timeout=25000, wait_until='networkidle')
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
    response = fetcher.fetch(url, engine='chrome', timeout=25000, wait_until='networkidle')
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
    response = fetcher.fetch(url, engine='chrome', timeout=25000, wait_until='networkidle')
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
    response = fetcher.fetch(url, engine='chrome', timeout=25000, wait_until='networkidle')
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
    # Force chrome for info
    response = None
    for url in urls:
        try:
            temp_resp = fetcher.fetch(url, engine='chrome', wait_until='domcontentloaded')
            status = getattr(temp_resp, 'status_code', getattr(temp_resp, 'status', 200))
            if temp_resp and status < 400:
                response = temp_resp
                break
        except:
            continue
    if not response or not hasattr(response, 'css'): return {"id": item_id, "error": "Not found"}
    title_el = response.css('h1, .title') # type: ignore
    title = title_el[0].text.strip() if title_el else item_id
    episodes = []
    # Ensure response is treated as non-Optional by IDE
    ep_links = response.css('a[href*="/episode/"], a[href*="-episode-"], .episode-item a') # type: ignore
    for link in ep_links:
        href = link.attrib.get('href', '')
        num_match = re.search(r'episode-(\d+)', href)
        num = num_match.group(1) if num_match else link.text.strip()
        episodes.append({"id": href.rstrip('/').split('/')[-1], "number": num, "href": href if href.startswith('http') else f"{site_url}{href}"})
    if not episodes and response and hasattr(response, 'url'): 
        episodes.append({"id": item_id, "number": "1", "href": response.url}) # type: ignore
    
    return {
        "id": item_id, 
        "title": title, 
        "episodes": episodes, 
        "type": "movie" if (response and "/movie/" in response.url) else "tv"
    }

def scrape_onoflix_search(query):
    import requests
    url = f"https://onoflix.live/api/search?q={query}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Referer": "https://onoflix.live/"
    }
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
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Referer": "https://onoflix.live/"
    }
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
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Referer": "https://onoflix.live/"
    }
    try:
        resp = requests.get(url, headers=headers, timeout=15)
        if resp.status_code != 200: return {"url": "", "sources": []}
        
        html = resp.text
        sources = []
        
        # Look for standard embed providers that Onoflix is known to use
        # If we can't find them in HTML (since it's Next.js hydration), 
        # we provide the direct watch link and fallbacks
        
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

def scrape_onoflix_info(item_id, item_type="series"):
    fetcher = StealthyFetcher()
    # item_id is slug/id
    url = f"https://onoflix.live/en/{item_type}/{item_id}"
    response = fetcher.fetch(url, engine='chrome', wait_until='domcontentloaded')
    if not response: return {"id": item_id, "error": "Content Not Found"}
    
    title_el = response.css('h1, .title')
    title = title_el[0].text.strip() if title_el else item_id.split('/')[0].replace('-', ' ').title()
    
    episodes = []
    if item_type == "series":
        # Need to go to watch page for episodes
        watch_url = f"https://onoflix.live/en/watch/series/{item_id}"
        watch_resp = fetcher.fetch(watch_url, engine='chrome', wait_until='domcontentloaded')
        if watch_resp:
            # Episode buttons have aria-label="Episode n: Title"
            ep_buttons = watch_resp.css("button[aria-label*='Episode']")
            for btn in ep_buttons:
                label = btn.attrib.get('aria-label', '')
                # Extract number from "Episode n: Title"
                num_match = re.search(r'Episode (\d+)', label)
                num = num_match.group(1) if num_match else "1"
                # The episode href/id structure on Onoflix is usually query params: ?season=1&episode=1
                # But for our internal ID we can use season_episode
                episodes.append({
                    "id": f"{item_id}?season=1&episode={num}", # Simplified for now
                    "number": num,
                    "title": label
                })
    else:
        # Movie
        episodes.append({
            "id": f"{item_id}",
            "number": "1",
            "title": title
        })
        
    return {
        "id": item_id,
        "title": title,
        "episodes": episodes,
        "type": item_type
    }

def scrape_onoflix_source(item_id, item_type="movie"):
    fetcher = StealthyFetcher()
    # item_id may contain query params for series
    # item_id might be "slug/id"
    if item_type == 'movie':
        url = f"https://onoflix.live/en/watch/movie/{item_id}"
    else:
        # series item_id is slug/id?season=X&episode=Y
        url = f"https://onoflix.live/en/watch/series/{item_id}"
        
    response = fetcher.fetch(url, engine='chrome', wait_until='networkidle', timeout=60000)
    sources = []
    if not response: return {"url": "", "sources": []}
    
    # Look for iframe or source tags
    iframes = response.css('iframe::attr(src)').getall()
    for src in iframes:
        if any(x in src.lower() for x in ['vid', 'embed', 'player', 'stream', 'load']):
            sources.append({"url": src, "name": "Server"})
    
    # Also look for direct video links if any
    video_srcs = response.css('video source::attr(src)').getall()
    for vsrc in video_srcs:
        sources.append({"url": vsrc, "name": "Direct"})
        
    if not sources:
        # Final fallback - just grab any iframe that looks like a player
        for iframe in response.css('iframe::attr(src)').getall():
            if 'http' in iframe:
                sources.append({"url": iframe, "name": "Player"})
            
    return {"url": sources[0]['url'] if sources else "", "sources": sources}

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
    
    # Existing iframe extraction
    iframes = response.css('iframe') if response else []
    for iframe in iframes:
        src = iframe.attrib.get('src') or iframe.attrib.get('data-src') or iframe.attrib.get('data-lazy-src') # type: ignore
        if src and "google" not in src and "facebook" not in src and "twitter" not in src:
            target_domain = site_url.split('//')[-1] if '//' in site_url else site_url
            u = clean_source_url(src, target_domain)
            if u and u not in [s['url'] for s in sources]: 
                sources.append({"name": "Server", "url": u})
            if u and u not in [s['url'] for s in sources]: 
                sources.append({"name": "Server", "url": u})
    
    if response and hasattr(response, 'text'):
        direct = extract_direct_video_links(response.text) # type: ignore
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
    parser.add_argument("--of_info", help="Onoflix info ID")
    parser.add_argument("--of_type", default="series", help="Onoflix item type (movie/series)")
    parser.add_argument("--of_source", help="Onoflix source ID")
    
    args = parser.parse_args()
    output = {"onoflix": [], "of_info": {}, "of_source": {}, "watchanimeworld": [], "cinemacity": [], "filmex": [], "cinezo": [], "pstream": [], "wa_info": {}, "wa_source": {}, "aniwatch": [], "universal_search": [], "universal_info": {}, "universal_source": {}}
    
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
    
    if args.of_info: output["of_info"] = scrape_onoflix_info(args.of_info, args.of_type)
    if args.of_source: output["of_source"] = scrape_onoflix_source(args.of_source, args.of_type)
    
    print(json.dumps(output))
