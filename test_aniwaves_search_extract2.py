from scrapling import StealthyFetcher
import re
fetcher = StealthyFetcher()
res = fetcher.fetch('https://aniwaves.ru/filter?keyword=Naruto', timeout=30000)
if res:
    with open('aniwaves_search.html', 'w') as f:
        f.write(res.text)
