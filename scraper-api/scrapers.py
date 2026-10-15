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
                import importlib
                scrapingbee_mod = importlib.import_module("scrapingbee")
                ScrapingBeeClient = getattr(scrapingbee_mod, "ScrapingBeeClient")
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

def scrape_onoflix_search_fallback(query):
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
            slug = title.lower().replace(' ', '-').replace(':', '').replace('--', '-')
            results.append({
                "id": f"of:{'movie' if is_movie else 'tv'}:{item_id}",
                "title": title,
                "image": img if img.startswith('http') else f"https://onoflix.live{img}",
                "type": "movie" if is_movie else "series",
                "slug": slug,
                "real_id": item_id,
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

wa_mappings_cache = {}

def determine_content_type(title, slug, url="", page_text="", episodes=None):
    t_lower = title.lower() if title else ""
    s_lower = slug.lower() if slug else ""
    u_lower = url.lower() if url else ""
    txt_lower = page_text.lower() if page_text else ""
    
    # Priority 1: OVA / Special / Mini Series
    if re.search(r'\bova\b', t_lower) or re.search(r'\bova\b', s_lower):
        return "ova"
    if re.search(r'\bona\b', t_lower) or re.search(r'\bona\b', s_lower):
        return "ona"
    if re.search(r'\bspecial\b', t_lower) and re.search(r'\bspecial\b', s_lower):
        return "special"
    if "mini series" in t_lower or "miniseries" in t_lower or "mini-series" in s_lower:
        return "mini-series"

    # Priority 2: Movie classification — require URL path confirmation, not just keyword in title
    # A title like "Movie Arc" or "Movie Magic" should NOT be classified as a movie
    is_movie = False
    if "/movies/" in u_lower or "/movie/" in u_lower or "-movie" in s_lower:
        is_movie = True
    elif re.search(r'\bthe movie\b', t_lower) or re.search(r'\bfilm\b', t_lower):
        # Only classify as movie if explicit "The Movie" suffix or no episode indicators
        is_movie = True
    
    if "duration" in txt_lower or re.search(r'\b[12]h\s+\d+m\b', txt_lower) or re.search(r'\b[12]h\b', txt_lower):
        if not episodes or len(episodes) <= 1:
            is_movie = True

    # Series indicators
    has_series_indicator = False
    for indicator in ["season", "s01", "s02", "s03", "s04", "s05", "s06", "s07", "s08", "s09", "s10", "episode", "ep", "e01", "e02", "e03", "e04", "e05"]:
        pattern = r'\b' + re.escape(indicator) + r'\b'
        if re.search(pattern, t_lower) or re.search(pattern, s_lower):
            has_series_indicator = True
            break

    if episodes and len(episodes) > 1:
        has_series_indicator = True

    # Priority 3: Anime — require URL path or page category, NOT just keyword in title
    # This prevents shows like "Beyblade", "My Anime" from being mis-tagged
    is_anime = False
    if "/anime/" in u_lower or re.search(r'\banime\b', s_lower) or "category/anime" in txt_lower:
        is_anime = True
    elif "category: anime" in txt_lower or "genre: anime" in txt_lower:
        is_anime = True
    # Sub/Dub language markers are strong anime indicators if combined with animation signals
    elif (re.search(r'\b(subbed|dubbed)\b', txt_lower) and re.search(r'\b(japanese|english dub)\b', txt_lower)):
        is_anime = True

    # Cartoon — require URL path or page category
    is_cartoon = False
    if "/cartoon/" in u_lower or re.search(r'\bcartoon\b', s_lower) or "category/cartoon" in txt_lower:
        is_cartoon = True
    elif "category: cartoon" in txt_lower or "genre: cartoon" in txt_lower:
        is_cartoon = True

    # Decision logic
    if is_movie and not has_series_indicator:
        return "movie"
    if is_anime and not is_cartoon:
        return "anime"
    if is_cartoon:
        return "cartoon"
    if has_series_indicator:
        return "series"
    if is_movie:
        return "movie"
    return "series"

def parse_season_info(title_str, slug_str=""):
    title_lower = title_str.lower() if title_str else ""
    slug_lower = slug_str.lower() if slug_str else ""
    
    number_words = {
        "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
        "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
        "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14,
        "fifteen": 15, "sixteen": 16, "seventeen": 17, "eighteen": 18,
        "nineteen": 19, "twenty": 20
    }
    
    # 1. Word representation of seasons
    for word, num in number_words.items():
        pattern = r'\bseason\s+' + word + r'\b'
        if re.search(pattern, title_lower):
            base = re.sub(pattern, '', title_lower).strip()
            base = re.sub(r'[\s\-:]+$', '', base).strip()
            return base.title(), num
        if re.search(pattern, slug_lower):
            base_t = re.sub(pattern, '', title_lower).strip()
            base_t = re.sub(r'[\s\-:]+$', '', base_t).strip()
            return base_t.title(), num

    # 2. Numeric season representation
    patterns = [
        r'\bseason\s*[:\-]?\s*(\d+)\b',
        r'\bs(\d+)\b',
        r'\bseason(\d+)\b',
    ]
    for pattern in patterns:
        match = re.search(pattern, title_lower)
        if match:
            num = int(match.group(1))
            base = re.sub(pattern, '', title_lower).strip()
            base = re.sub(r'[\s\-:]+$', '', base).strip()
            return base.title(), num
            
        match_s = re.search(pattern, slug_lower)
        if match_s:
            num = int(match_s.group(1))
            base_t = re.sub(pattern, '', title_lower).strip()
            base_t = re.sub(r'[\s\-:]+$', '', base_t).strip()
            return base_t.title(), num

    # 3. Fallback for slug formats like "season-1" or "s1"
    match_fallback = re.search(r'\bseason[-_]?(\d+)\b', slug_lower) or re.search(r'\bs(\d+)\b', slug_lower)
    if match_fallback:
        num = int(match_fallback.group(1))
        clean_title = re.sub(r'\bseason\s*\d+\b', '', title_str, flags=re.IGNORECASE)
        clean_title = re.sub(r'\bs\d+\b', '', clean_title, flags=re.IGNORECASE)
        clean_title = re.sub(r'[\s\-:]+$', '', clean_title).strip()
        return clean_title.title(), num
            
    return title_str.strip(), 1

def parse_episode_info(ep_text, ep_slug, default_season=1):
    t = ep_text.lower().strip() if ep_text else ""
    s = ep_slug.lower().strip() if ep_slug else ""
    
    # 1. Match patterns like "1x12", "s01e12", "1.12"
    match1 = re.search(r'\b(\d+)\s*x\s*(\d+)\b', t) or re.search(r'\b(\d+)\s*x\s*(\d+)\b', s) or re.search(r'\b(\d+)\.(\d+)\b', t) or re.search(r'\b(\d+)\.(\d+)\b', s)
    if match1:
        return int(match1.group(1)), int(match1.group(2))
        
    # 2. Match patterns like "s01e12", "s1e12"
    match2 = re.search(r'\bs(\d+)\s*[-_]?\s*e(\d+)\b', t) or re.search(r'\bs(\d+)\s*[-_]?\s*e(\d+)\b', s)
    if match2:
        return int(match2.group(1)), int(match2.group(2))
        
    # 3. Match patterns like "episode 12", "ep12", "e12", "episode 012"
    match3 = re.search(r'\b(?:episode|ep|e)\s*[-_]?\s*(\d+)\b', t) or re.search(r'\b(?:episode|ep|e)\s*[-_]?\s*(\d+)\b', s)
    if match3:
        season_match = re.search(r'\b(?:season|s)\s*[-_]?\s*(\d+)\b', s) or re.search(r'\b(?:season|s)\s*[-_]?\s*(\d+)\b', t)
        season_num = int(season_match.group(1)) if season_match else default_season
        return season_num, int(match3.group(1))
        
    # 4. Match trailing number in title/slug (e.g. "Ben 10 - 12")
    match4 = re.search(r'\b(\d+)\b$', t) or re.search(r'\b(\d+)\b$', s)
    if match4:
        season_match = re.search(r'\b(?:season|s)\s*[-_]?\s*(\d+)\b', s) or re.search(r'\b(?:season|s)\s*[-_]?\s*(\d+)\b', t)
        season_num = int(season_match.group(1)) if season_match else default_season
        return season_num, int(match4.group(1))

    # 5. Fallback: match any number ONLY if the slug/title has an episode-like keyword nearby
    # Prevents "ben-10-series" → episode 10 false positives
    has_ep_keyword = re.search(r'\b(episode|ep|part|pt)\b', s) or re.search(r'\b(episode|ep|part|pt)\b', t)
    if has_ep_keyword:
        match5 = re.search(r'(\d+)', s) or re.search(r'(\d+)', t)
        if match5:
            return default_season, int(match5.group(1))
        
    return default_season, 1

def group_watchanimeworld_results(results):
    grouped = {}
    for res in results:
        slug = res['id'].replace("wa:", "")
        base_title, season_num = parse_season_info(res['title'], slug)
        key = base_title.lower().strip()
        key = re.sub(r'\s+', ' ', key)
        if not key:
            continue
        if key not in grouped:
            grouped[key] = {
                "base_title": base_title,
                "seasons": {},
                "image": res['image'],
                "type": res['type']
            }
        if season_num not in grouped[key]["seasons"]:
            grouped[key]["seasons"][season_num] = res
            
    grouped_list = []
    for key, data in grouped.items():
        seasons_dict = data["seasons"]
        sorted_season_nums = sorted(seasons_dict.keys())
        slugs = [seasons_dict[s_num]["id"].replace("wa:", "") for s_num in sorted_season_nums]
        combined_id = "wa:" + "|".join(slugs)
        
        # Safely get first_href — guard against missing href key
        first_season_entry = seasons_dict.get(sorted_season_nums[0], {})
        first_href = first_season_entry.get("href", "")
        item_type = determine_content_type(data["base_title"], combined_id, first_href)
        
        grouped_list.append({
            "id": combined_id,
            "title": data["base_title"],
            "image": data["image"],
            "type": item_type,
            "is_series": item_type != "movie",
            "href": first_href
        })
        
    return grouped_list


def scrape_watchanimeworld(query=None, category=None):
    fetcher = StealthyFetcher()
    url = "https://watchanimeworld.net/"
    if query == "cartoon" or category == "cartoon":
        url = "https://watchanimeworld.net/category/cartoon/"
    elif query:
        url = f"https://watchanimeworld.net/?s={query}"
    elif category:
        url = f"https://watchanimeworld.net/category/{category}/"
    
    response = fetcher.fetch(url, engine='chrome', wait_until='domcontentloaded', timeout=20000)
    results = []
    
    if not response: return []
    items = response.css('.result-item, article.post, article.item, .movie-item, a.item__card.lnk-blk, .items article')
    
    for item in items:
        href = item.attrib.get('href', '')
        if not href or not href.startswith('http'):
            links = item.css('a.lnk-blk, .details a, a')
            if links:
                href = links[0].attrib.get('href', '')
        
        if not href: continue

        title = ""
        title_tag = item.css('h2.entry-title, h2, h3, .title, .details a')
        if title_tag:
            title = title_tag[0].text.strip()
        if not title:
            links = item.css('a.lnk-blk, .details a, a')
            if links:
                title = links[0].text.strip()
            
        imgs = item.css('.post-thumbnail img, img')
        img = ""
        if imgs:
            img = imgs[0].attrib.get('data-src') or imgs[0].attrib.get('src') or ""
        
        if title and href:
            item_id = href.rstrip('/').split('/')[-1]
            item_type = determine_content_type(title, item_id, href)
            results.append({
                "id": f"wa:{item_id}",
                "title": title,
                "image": img if img.startswith('http') else f"https:{img}" if img.startswith('//') else img,
                "type": item_type,
                "href": href
            })
    return group_watchanimeworld_results(results)

def scrape_watchanimeworld_az(letter, page=1):
    fetcher = StealthyFetcher()
    url = f"https://watchanimeworld.net/letter/{letter.upper()}/" if page == 1 else f"https://watchanimeworld.net/letter/{letter.upper()}/page/{page}/"
    
    response = fetcher.fetch(url, engine='chrome', wait_until='domcontentloaded')
    results = []
    
    if not response: return []
    items = response.css('.result-item, article.post, article.item, .movie-item, a.item__card.lnk-blk, .items article')
    
    for item in items:
        href = item.attrib.get('href', '')
        if not href or not href.startswith('http'):
            links = item.css('a.lnk-blk, .details a, a')
            if links:
                href = links[0].attrib.get('href', '')
        
        if not href: continue

        title = ""
        title_tag = item.css('h2.entry-title, h2, h3, .title, .details a')
        if title_tag:
            title = title_tag[0].text.strip()
        if not title:
            links = item.css('a.lnk-blk, .details a, a')
            if links:
                title = links[0].text.strip()
            
        imgs = item.css('.post-thumbnail img, img')
        img = ""
        if imgs:
            img = imgs[0].attrib.get('data-src') or imgs[0].attrib.get('src') or ""
        
        if title and href:
            item_id = href.rstrip('/').split('/')[-1]
            item_type = determine_content_type(title, item_id, href)
            results.append({
                "id": f"wa:{item_id}",
                "title": title,
                "image": img if img.startswith('http') else f"https:{img}" if img.startswith('//') else img,
                "type": item_type,
                "href": href
            })
    return group_watchanimeworld_results(results)

def scrape_single_slug_info(slug, fetcher):
    is_movie = "-movie" in slug or "movies" in slug
    urls_to_try = [
        f"https://watchanimeworld.net/series/{slug}/",
        f"https://watchanimeworld.net/movies/{slug}/",
        f"https://watchanimeworld.net/{slug}/",
        f"https://watchanimeworld.net/anime/{slug}/",
        f"https://watchanimeworld.net/cartoon/{slug}/"
    ]
    if is_movie:
        urls_to_try = [urls_to_try[1], urls_to_try[0], urls_to_try[2], urls_to_try[3], urls_to_try[4]]
        
    response = None
    for url in urls_to_try:
        try:
            temp_resp = fetcher.fetch(url, engine='chrome', wait_until='domcontentloaded', timeout=25000)
            status = getattr(temp_resp, 'status_code', getattr(temp_resp, 'status', 200))
            if temp_resp and status < 400:
                if temp_resp.css('h1.entry-title, .title, .episodios, .aa-cnt, .item__card, .play-video'):
                    response = temp_resp
                    break
        except:
            continue
            
    current_status = getattr(response, 'status_code', getattr(response, 'status', 200)) if response else 404
    if (not response or current_status >= 400 or not response.css('h1.entry-title, .title')) and not is_movie:
        clean_title = re.sub(r'-(series|classic|20\d\d|19\d\d|full|multi|hd|720p|1080p)', '', slug.lower())
        guessed_title = clean_title.replace('-', ' ').title()
        
        print(f"[Scraper] 404 or empty on direct lookup for {slug}. Search recovery for '{guessed_title}'...", file=sys.stderr)
        search_res = scrape_watchanimeworld(guessed_title)
        
        if not search_res:
            title_words = list(guessed_title.split())
            if len(title_words) > 2:
                title_slice = list(title_words)[0:2] # type: ignore
                search_res = scrape_watchanimeworld(" ".join(title_slice))
                
        if search_res:
            valid_results = [r for r in search_res if r['id'].replace('wa:', '') != slug]
            if not valid_results: valid_results = search_res
            if valid_results:
                best_match = valid_results[0]
                for r in valid_results:
                    match_sub = r['id'].replace('wa:', '')
                    if slug in match_sub or match_sub in slug:
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
                            slug = match_id
                            break
                    except:
                        continue
                        
    if not response or not response.css('h1.entry-title, .title'):
        return {"id": slug, "title": "Error: Content Not Found", "episodes": [], "type": "series", "error": "connectivity_issue"}
        
    episodes = []
    
    # Safely get the response URL — BSWrapper may not have a .url attribute
    response_url = getattr(response, 'url', '') or ''
    is_movie_detected = is_movie or ("/movies/" in response_url or "/movie/" in response_url)
    if response and not is_movie_detected:
        text_content = response.text.lower()
        if "duration" in text_content or "1h " in text_content or "2h " in text_content or "matsuri" in text_content:
            if not response.css('.episodios, .aa-cnt, .se-q'):
                is_movie_detected = True
                
    if is_movie_detected:
        episodes.append({"id": slug, "number": "1", "href": response.url if response else ""})
    else:
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
                        if "/episode/" not in href and "/watch/" not in href:
                            continue
                        ep_id = href.rstrip('/').split('/')[-1]
                        num_el = link.css('.numerando, .ep, .num-ep')
                        text = num_el[0].text.strip() if num_el else ep_id.split('-')[-1]
                        if ep_id not in [e['id'] for e in episodes]:
                            episodes.append({"id": ep_id, "number": text, "href": href})
                except:
                    continue
                    
        if not episodes and response:
            ep_links = response.css('.episodios a, .lnk-blk, a[href*="/episode/"], a[href*="/watch/"]')
            for link in ep_links:
                href = link.attrib.get('href', '')
                if not href or ("/episode/" not in href and "/watch/" not in href):
                    continue
                ep_id = href.rstrip('/').split('/')[-1]
                num_el = link.css('.numerando, .ep, .num-ep')
                text = num_el[0].text.strip() if num_el and num_el[0].text else ep_id.split('-')[-1].replace('x', '.')
                if ep_id and ep_id not in [e['id'] for e in episodes]:
                    episodes.append({"id": ep_id, "number": text, "href": href})
                    
    title_el = response.css('h1.entry-title, .title, .name h1') if response else []
    title = title_el[0].text.strip() if title_el and title_el[0].text else slug.replace('-', ' ').title()
    
    # Year
    year = None
    year_el = response.css('.released, .date, .year, span.date, span.year, .meta-info a[href*="/release/"]') if response else []
    if year_el:
        year_text = year_el[0].text.strip()
        year_match = re.search(r'\b(19\d\d|20\d\d)\b', year_text)
        if year_match:
            year = int(year_match.group(1))
    if not year and response:
        year_match = re.search(r'Released:\s*(19\d\d|20\d\d)', response.text, re.IGNORECASE) or re.search(r'\b(19\d\d|20\d\d)\b', title)
        if year_match:
            year = int(year_match.group(1))
            
    # Language
    language = "English"
    if response:
        text_content = response.text.lower()
        if "dual audio" in text_content or "dual-audio" in text_content:
            language = "Dual Audio"
        elif "hindi" in text_content:
            language = "Hindi"
        elif "japanese" in text_content or "subbed" in text_content:
            language = "Japanese"
        elif "dubbed" in text_content:
            language = "English (Dub)"
        lang_el = response.css('.language, .audio, span.language, span.audio')
        # Only override auto-detected language if the element has non-empty text
        if lang_el:
            lang_text = lang_el[0].text.strip()
            if lang_text:
                language = lang_text
            
    # Poster
    poster = None
    if response:
        poster_el = response.css('.poster img, .post-thumbnail img, img[itemprop="image"]')
        if poster_el:
            poster = poster_el[0].attrib.get('data-src') or poster_el[0].attrib.get('src')
        if not poster:
            for img in response.css('img'):
                src = img.attrib.get('src') or img.attrib.get('data-src') or ""
                if src and "/uploads/" in src and "logo" not in src.lower():
                    poster = src
                    break
    if poster:
        if poster.startswith('//'):
            poster = f"https:{poster}"
        elif not poster.startswith('http'):
            poster = f"https://watchanimeworld.net{poster}"
            
    # Banner
    banner = None
    if response:
        banner_el = response.css('.banner img, .backdrop img, .background img, .backdrop-wrapper')
        if banner_el:
            style = banner_el[0].attrib.get('style') or ""
            if "background" in style:
                bg_match = re.search(r'url\([\'"]?(https?:[^\'"]+)', style)
                if bg_match:
                    banner = bg_match.group(1)
            else:
                banner = banner_el[0].attrib.get('data-src') or banner_el[0].attrib.get('src')
        if not banner:
            style_match = re.search(r'background(?:-image)?\s*:\s*url\([\'"]?([^\'"\)]+)', response.text)
            if style_match:
                banner = style_match.group(1)
    if banner:
        if banner.startswith('//'):
            banner = f"https:{banner}"
        elif not banner.startswith('http'):
            banner = f"https://watchanimeworld.net{banner}"
            
    content_type = determine_content_type(title, slug, response_url, response.text if response else "", episodes)
    
    # Extract genres from page metadata
    genres = []
    if response:
        genre_els = response.css('.genres a, .genre a, span.genres, .category a, a[rel="category tag"]')
        for gel in genre_els:
            g = gel.text.strip()
            if g and g not in genres:
                genres.append(g)
    
    # Extract rating from page metadata
    rating = None
    if response:
        rating_el = response.css('.rating, .score, span.rating, .imdb-rating, .vote-average')
        if rating_el:
            rating_text = rating_el[0].text.strip()
            rating_match = re.search(r'([\d.]+)', rating_text)
            if rating_match:
                try:
                    rating = float(rating_match.group(1))
                except ValueError:
                    pass
    
    # Extract duration from page metadata
    duration = None
    if response:
        dur_el = response.css('.runtime, .duration, span.runtime, span.duration, .time')
        if dur_el:
            dur_text = dur_el[0].text.strip()
            dur_match = re.search(r'(\d+)\s*min', dur_text, re.IGNORECASE)
            if dur_match:
                duration = int(dur_match.group(1))
    
    return {
        "id": slug,
        "title": title,
        "episodes": episodes,
        "type": content_type,
        "year": year,
        "language": language,
        "poster": poster,
        "banner": banner or poster,
        "genres": genres,
        "rating": rating,
        "duration": duration
    }

def scrape_watchanimeworld_info(item_id):
    if item_id in wa_mappings_cache:
        return wa_mappings_cache[item_id]
        
    slugs = item_id.split('|')
    all_episodes = []
    show_title = None
    show_type = None
    show_poster = None
    show_banner = None
    show_year = None
    show_language = None
    
    fetcher = StealthyFetcher()
    
    for slug in slugs:
        try:
            slug_info = scrape_single_slug_info(slug, fetcher)
            if not slug_info or slug_info.get("error") == "connectivity_issue":
                continue
                
            if not show_title:
                parsed_title, _ = parse_season_info(slug_info["title"], slug)
                show_title = parsed_title
            if not show_type:
                show_type = slug_info.get("type")
            if not show_poster:
                show_poster = slug_info.get("poster")
            if not show_banner:
                show_banner = slug_info.get("banner")
            if not show_year:
                show_year = slug_info.get("year")
            if not show_language:
                show_language = slug_info.get("language")
                
            _, season_num = parse_season_info(slug_info["title"], slug)
            
            for ep in slug_info.get("episodes", []):
                ep_season_num, ep_num = parse_episode_info(ep.get("number"), ep.get("id"), default_season=season_num)
                ep["seasonNumber"] = ep_season_num
                ep["episodeNumber"] = ep_num
                ep["season_number"] = ep_season_num
                ep["episode_number"] = ep_num
                ep["number"] = f"{ep_season_num}x{ep_num}"
                all_episodes.append(ep)
        except Exception as e:
            print(f"[Scraper] Error scraping slug {slug}: {e}", file=sys.stderr)
            continue
            
    if not all_episodes:
        guessed_title, _ = parse_season_info(slugs[0].replace('-', ' ').title(), slugs[0])
        # Use determine_content_type instead of blindly trusting slug count
        fallback_type = determine_content_type(guessed_title, item_id)
        return {
            "id": item_id,
            "title": guessed_title,
            "episodes": [],
            "type": fallback_type,
            "year": None,
            "language": "English",
            "poster": None,
            "banner": None,
            "genres": [],
            "rating": None,
            "duration": None,
            "slug": item_id
        }
        
    seen = set()
    deduped_episodes = []
    for ep in all_episodes:
        key = (ep["seasonNumber"], ep["episodeNumber"])
        if key not in seen:
            seen.add(key)
            deduped_episodes.append(ep)
            
    deduped_episodes.sort(key=lambda x: (x["seasonNumber"], x["episodeNumber"]))
    
    # Determine final type using classification rather than slug count
    if not show_type:
        show_type = determine_content_type(show_title or "", item_id)
    
    result = {
        "id": item_id,
        "title": show_title or "Unknown Show",
        "episodes": deduped_episodes,
        "type": show_type,
        "year": show_year,
        "language": show_language or "English",
        "poster": show_poster,
        "banner": show_banner or show_poster,
        "genres": [],
        "rating": None,
        "duration": None,
        "slug": item_id
    }
    
    wa_mappings_cache[item_id] = result
    return result

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
    session = requests.Session()
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://onoflix.live/"
    }
    try:
        resp = session.get(url, headers=headers, timeout=8)
        if resp.status_code == 200:
            data = resp.json()
            items = data.get('contentList') or data.get('results') or []
            if isinstance(items, list) and len(items) > 0:
                results = []
                for item in items:
                    if not isinstance(item, dict): continue
                    real_id = str(item.get('id', ''))
                    title = item.get('title') or item.get('name') or item.get('original_title') or "Unknown Title"
                    raw_media_type = item.get('media_type', '')
                    if not raw_media_type:
                        if item.get('number_of_seasons') or item.get('number_of_episodes') or item.get('first_air_date'):
                            raw_media_type = 'tv'
                        else:
                            raw_media_type = 'movie'
                    item_type = raw_media_type
                    slug = title.lower().replace(' ', '-').replace(':', '').replace('--', '-')
                    poster = item.get('poster_path', '')
                    if poster and not poster.startswith('http'):
                        poster = f"https://image.tmdb.org/t/p/w500{poster}"
                    
                    results.append({
                        "id": f"of:{item_type}:{real_id}",
                        "title": title,
                        "image": poster or "",
                        "type": "movie" if item_type == "movie" else "series",
                        "slug": slug,
                        "real_id": real_id,
                        "rating": item.get('vote_average', 0),
                        "year": (item.get('release_date') or item.get('first_air_date') or '')[:4],
                        "overview": item.get('overview', '')
                    })
                if results:
                    return results
    except Exception as e:
        print(f"[Onoflix API Search] Error: {e}, falling back to Scrapling DOM...", file=sys.stderr)

    # Fallback to Scrapling StealthyFetcher
    try:
        return scrape_onoflix_search_fallback(query)
    except Exception as e:
        print(f"[Onoflix Scrapling Fallback] Error: {e}", file=sys.stderr)
        return []

def scrape_onoflix_info(item_id, item_type="series"):
    import requests
    session = requests.Session()
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://onoflix.live/"
    }

    # Normalize item_id & type (e.g., 'of:movie:414906', 'of:series:1396', '1396', 'slug/1396')
    raw_id = str(item_id).strip()
    detected_type = item_type
    if raw_id.startswith("of:"):
        parts = raw_id.split(":")
        if len(parts) >= 3:
            detected_type = parts[1]
            raw_id = parts[2]
        elif len(parts) == 2:
            raw_id = parts[1]
    elif "/" in raw_id:
        raw_id = raw_id.split("/")[-1]

    num_match = re.search(r'\d+', raw_id)
    num_id = num_match.group(0) if num_match else raw_id
    is_movie = detected_type in ["movie", "movies"]

    # 1. Query Onoflix TMDB API
    try:
        if is_movie:
            api_url = f"https://onoflix.live/api/tmdb/movie/{num_id}"
            resp = session.get(api_url, headers=headers, timeout=8)
            if resp.status_code == 200:
                data = resp.json()
                title = data.get('title') or data.get('name') or "Unknown Movie"
                poster = data.get('poster_path', '')
                if poster and not poster.startswith('http'):
                    poster = f"https://image.tmdb.org/t/p/w500{poster}"
                backdrop = data.get('backdrop_path', '')
                if backdrop and not backdrop.startswith('http'):
                    backdrop = f"https://image.tmdb.org/t/p/w1280{backdrop}"
                return {
                    "id": f"of:movie:{num_id}",
                    "title": title,
                    "description": data.get('overview', ''),
                    "poster": poster,
                    "backdrop": backdrop,
                    "year": (data.get('release_date') or '')[:4],
                    "rating": data.get('vote_average', 0),
                    "genres": [g.get('name') for g in data.get('genres', []) if isinstance(g, dict)],
                    "type": "movie",
                    "episodes": [{
                        "id": f"{num_id}",
                        "number": "1",
                        "title": title
                    }]
                }
        else:
            api_url = f"https://onoflix.live/api/tmdb/series/{num_id}"
            resp = session.get(api_url, headers=headers, timeout=8)
            if resp.status_code == 200:
                data = resp.json()
                title = data.get('name') or data.get('title') or "Unknown Series"
                poster = data.get('poster_path', '')
                if poster and not poster.startswith('http'):
                    poster = f"https://image.tmdb.org/t/p/w500{poster}"
                backdrop = data.get('backdrop_path', '')
                if backdrop and not backdrop.startswith('http'):
                    backdrop = f"https://image.tmdb.org/t/p/w1280{backdrop}"

                episodes = []
                seasons = [s for s in data.get('seasons', []) if s.get('season_number', 0) > 0]
                if not seasons:
                    seasons = [{"season_number": 1}]

                # Fetch episodes for seasons (limit to first 10 seasons for speed)
                for s in seasons[:10]:
                    s_num = s.get('season_number', 1)
                    try:
                        s_resp = session.get(f"https://onoflix.live/api/tmdb/season/{num_id}/{s_num}", headers=headers, timeout=6)
                        if s_resp.status_code == 200:
                            s_data = s_resp.json()
                            for ep in s_data.get('episodes', []):
                                ep_num = ep.get('episode_number', 1)
                                episodes.append({
                                    "id": f"{num_id}?season={s_num}&episode={ep_num}",
                                    "number": str(ep_num),
                                    "season": s_num,
                                    "title": ep.get('name') or f"Episode {ep_num}",
                                    "overview": ep.get('overview', ''),
                                    "still_path": ep.get('still_path', '')
                                })
                    except Exception as ep_err:
                        print(f"[Onoflix Season Error] {num_id} S{s_num}: {ep_err}", file=sys.stderr)

                if not episodes:
                    episodes.append({
                        "id": f"{num_id}?season=1&episode=1",
                        "number": "1",
                        "season": 1,
                        "title": "Episode 1"
                    })

                return {
                    "id": f"of:tv:{num_id}",
                    "title": title,
                    "description": data.get('overview', ''),
                    "poster": poster,
                    "backdrop": backdrop,
                    "year": (data.get('first_air_date') or '')[:4],
                    "rating": data.get('vote_average', 0),
                    "genres": [g.get('name') for g in data.get('genres', []) if isinstance(g, dict)],
                    "type": "tv",
                    "seasons": seasons,
                    "episodes": episodes
                }
    except Exception as e:
        print(f"[Onoflix TMDB Info] Error: {e}, falling back to Scrapling DOM...", file=sys.stderr)

    # 2. Fallback to Scrapling DOM Scraping
    fetcher = StealthyFetcher()
    url = f"https://onoflix.live/en/{detected_type}/{raw_id}"
    response = fetcher.fetch(url, engine='chrome', wait_until='domcontentloaded')
    if not response:
        return {"id": item_id, "error": "Content Not Found"}
    
    title_el = response.css('h1, .title')
    title = title_el[0].text.strip() if title_el else raw_id.replace('-', ' ').title()
    
    episodes = []
    if not is_movie:
        watch_url = f"https://onoflix.live/en/watch/series/{raw_id}"
        watch_resp = fetcher.fetch(watch_url, engine='chrome', wait_until='domcontentloaded')
        if watch_resp:
            ep_buttons = watch_resp.css("button[aria-label*='Episode']")
            for btn in ep_buttons:
                label = btn.attrib.get('aria-label', '')
                num_match = re.search(r'Episode (\d+)', label)
                num = num_match.group(1) if num_match else "1"
                episodes.append({
                    "id": f"{raw_id}?season=1&episode={num}",
                    "number": num,
                    "title": label
                })
    else:
        episodes.append({
            "id": f"{raw_id}",
            "number": "1",
            "title": title
        })
        
    return {
        "id": item_id,
        "title": title,
        "episodes": episodes,
        "type": detected_type
    }

def scrape_onoflix_source(item_id, item_type="movie"):
    raw_id = str(item_id).strip()
    detected_type = item_type

    # Extract season and episode if present
    season = "1"
    episode = "1"
    if "season=" in raw_id and "episode=" in raw_id:
        s_match = re.search(r'season=(\d+)', raw_id)
        e_match = re.search(r'episode=(\d+)', raw_id)
        if s_match: season = s_match.group(1)
        if e_match: episode = e_match.group(1)
        raw_id = raw_id.split("?")[0]

    if raw_id.startswith("of:"):
        parts = raw_id.split(":")
        if len(parts) >= 3:
            detected_type = parts[1]
            raw_id = parts[2]
        elif len(parts) == 2:
            raw_id = parts[1]
    elif "/" in raw_id:
        raw_id = raw_id.split("/")[-1]

    num_match = re.search(r'\d+', raw_id)
    id_clean = num_match.group(0) if num_match else raw_id
    is_movie = detected_type in ["movie", "movies"]

    # Active verified server collection from Onoflix
    if is_movie:
        sources = [
            {"name": "Peachify (VIP)", "url": f"https://peachify.top/?type=movie&id={id_clean}&autoplay=1", "badge": "VIP"},
            {"name": "VidCore", "url": f"https://vidcore.net/movie/{id_clean}", "badge": "Core HD"},
            {"name": "EmbedMaster", "url": f"https://embedmaster.link/movie/{id_clean}", "badge": "Master"},
            {"name": "VidFast", "url": f"https://vidfast.pro/movie/{id_clean}?autoPlay=true&title=true&poster=true", "badge": "Fast"},
            {"name": "VidNest", "url": f"https://vidnest.fun/movie/{id_clean}", "badge": "Nest"},
            {"name": "VidRock", "url": f"https://vidrock.net/movie/{id_clean}", "badge": "Rock"},
            {"name": "VidLink", "url": f"https://vidlink.pro/movie/{id_clean}?primaryColor=7C3AED&autoplay=true", "badge": "Link"},
            {"name": "VidSrc", "url": f"https://vidsrc-embed.ru/embed/movie?tmdb={id_clean}&autoplay=1&ds_lang=en", "badge": "VidSrc"},
            {"name": "Vidify", "url": f"https://player.vidify.top/embed/movie/{id_clean}", "badge": "Vidify"},
            {"name": "VixSrc", "url": f"https://vixsrc.to/movie/{id_clean}", "badge": "Vix"},
            {"name": "Videasy", "url": f"https://player.videasy.net/movie/{id_clean}", "badge": "Easy"},
            {"name": "VidKing", "url": f"https://www.vidking.net/embed/movie/{id_clean}", "badge": "King"},
            {"name": "Smashy", "url": f"https://player.smashystream.com/movie/{id_clean}", "badge": "Smashy"},
            {"name": "Vidora", "url": f"https://vidora.su/movie/{id_clean}", "badge": "Vidora"},
            {"name": "Movies111", "url": f"https://111movies.com/movie/{id_clean}", "badge": "111"}
        ]
    else:
        sources = [
            {"name": "Peachify (VIP)", "url": f"https://peachify.top/?type=tv&id={id_clean}&s={season}&e={episode}&autoplay=1", "badge": "VIP"},
            {"name": "VidCore", "url": f"https://vidcore.net/tv/{id_clean}/{season}/{episode}", "badge": "Core HD"},
            {"name": "EmbedMaster", "url": f"https://embedmaster.link/tv/{id_clean}/{season}/{episode}", "badge": "Master"},
            {"name": "VidFast", "url": f"https://vidfast.pro/tv/{id_clean}/{season}/{episode}?autoPlay=true&title=true&poster=true&nextButton=true", "badge": "Fast"},
            {"name": "VidNest", "url": f"https://vidnest.fun/tv/{id_clean}/{season}/{episode}", "badge": "Nest"},
            {"name": "VidRock", "url": f"https://vidrock.net/tv/{id_clean}/{season}/{episode}", "badge": "Rock"},
            {"name": "VidLink", "url": f"https://vidlink.pro/tv/{id_clean}/{season}/{episode}?primaryColor=7C3AED&autoplay=true", "badge": "Link"},
            {"name": "VidSrc", "url": f"https://vidsrc-embed.ru/embed/tv?tmdb={id_clean}&season={season}&episode={episode}&autoplay=1&ds_lang=en", "badge": "VidSrc"},
            {"name": "Vidify", "url": f"https://player.vidify.top/embed/tv/{id_clean}/{season}/{episode}", "badge": "Vidify"},
            {"name": "VixSrc", "url": f"https://vixsrc.to/tv/{id_clean}/{season}/{episode}", "badge": "Vix"},
            {"name": "Videasy", "url": f"https://player.videasy.net/tv/{id_clean}/{season}/{episode}", "badge": "Easy"},
            {"name": "VidKing", "url": f"https://www.vidking.net/embed/tv/{id_clean}/{season}/{episode}", "badge": "King"},
            {"name": "Smashy", "url": f"https://player.smashystream.com/show/{id_clean}/{season}/{episode}", "badge": "Smashy"},
            {"name": "Vidora", "url": f"https://vidora.su/tv/{id_clean}/{season}/{episode}", "badge": "Vidora"},
            {"name": "Movies111", "url": f"https://111movies.com/tv/{id_clean}/{season}/{episode}", "badge": "111"}
        ]

    primary_url = sources[0]["url"] if sources else ""
    return {"url": primary_url, "sources": sources}

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
    
    # Iframe extraction (deduplicated — single check)
    iframes = response.css('iframe') if response else []
    for iframe in iframes:
        src = iframe.attrib.get('src') or iframe.attrib.get('data-src') or iframe.attrib.get('data-lazy-src') # type: ignore
        if src and "google" not in src and "facebook" not in src and "twitter" not in src:
            target_domain = site_url.split('//')[-1] if '//' in site_url else site_url
            u = clean_source_url(src, target_domain)
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
