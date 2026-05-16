import re

with open('src/lib/python/scrapling_sync.py', 'r') as f:
    content = f.read()

# Fix search endpoint if not already fixed
content = content.replace('/search?keyword=', '/filter?keyword=')

# Enhance info scraper to count sub/dub
info_func = """def scrape_aniwaves_info(item_id):
    fetcher = StealthyFetcher()
    url = f"https://aniwaves.ru/watch/{item_id}"
    response = fetcher.fetch(url, timeout=30000)
    episodes = []
    sub_count = 0
    dub_count = 0
    if not response: return {"id": item_id, "episodes": []}
    
    ep_links = response.css('.episodes a, a[data-ep], a[href*="/watch/"], .ep-item a')
    for link in ep_links:
        href = link.attrib.get('href', '')
        if item_id not in href: continue
        ep_id = href.split('/')[-1]
        ep_num = link.attrib.get('data-ep') or link.text.strip()
        
        is_sub = link.attrib.get('data-sub') == '1'
        is_dub = link.attrib.get('data-dub') == '1'
        if is_sub: sub_count += 1
        if is_dub: dub_count += 1
        
        if ep_num and (ep_num.isdigit() or 'Episode' in ep_num):
            num = re.search(r'\d+', ep_num)
            clean_num = num.group(0) if num else ep_num
            episodes.append({
                "id": ep_id, 
                "number": clean_num, 
                "href": href,
                "isSub": is_sub,
                "isDub": is_dub
            })
            
    title_el = response.css('h1, .title, .film-name')
    title = title_el[0].text.strip() if title_el else item_id.replace('-', ' ').title()
    image_el = response.css('.film-poster img, .img img')
    image = image_el[0].attrib.get('src') or image_el[0].attrib.get('data-src') if image_el else ""

    return {
        "id": item_id, 
        "title": title, 
        "image": image if image.startswith('http') else f"https://aniwaves.ru{image}" if image else "",
        "episodes": episodes, 
        "type": "anime",
        "subOrDub": {"sub": sub_count, "dub": dub_count}
    }"""

content = re.sub(r'def scrape_aniwaves_info\(item_id\):.*?return \{.*?"type": "anime"\n\s*\}', info_func, content, flags=re.DOTALL)

with open('src/lib/python/scrapling_sync.py', 'w') as f:
    f.write(content)
