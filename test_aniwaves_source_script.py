from scrapling import StealthyFetcher
import re
fetcher = StealthyFetcher()
res = fetcher.fetch('https://aniwaves.ru/watch/naruto-76396/ep-1', timeout=30000)
if res:
    print(res.text[:1000])
    scripts = res.css('script')
    for s in scripts:
        t = s.text or ''
        if 'server' in t.lower() or 'file' in t.lower() or 'url' in t.lower():
            print("FOUND SCRIPT:", t[:500])
