from scrapling import StealthyFetcher
import re
fetcher = StealthyFetcher()
res = fetcher.fetch('https://aniwaves.ru/watch/naruto-76396', timeout=30000)
if res:
    episodes = res.css('.episodes a, a[data-ep], a[href*="/watch/"], .ep-item a')
    print(f"Found {len(episodes)} episodes for Naruto.")
