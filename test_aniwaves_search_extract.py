from scrapling import StealthyFetcher
import re
fetcher = StealthyFetcher()
res = fetcher.fetch('https://aniwaves.ru/filter?keyword=Naruto', timeout=30000)
if res:
    items = res.css('div.item, .flw-item')
    print(f"Found {len(items)} items")
    for item in items[:2]:
        href_el = item.css('a.item-link, a')
        href = href_el[0].attrib.get('href', '') if href_el else ""
        title_el = item.css('.name, .title, .film-name')
        title = title_el[0].text.strip() if title_el else ""
        print("Title:", title, "Href:", href)
        
        # Sub/Dub indicators
        sub = item.css('.tick-sub')
        dub = item.css('.tick-dub')
        print("Sub:", sub[0].text.strip() if sub else "None", "Dub:", dub[0].text.strip() if dub else "None")
