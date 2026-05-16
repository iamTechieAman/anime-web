from scrapling import StealthyFetcher
fetcher = StealthyFetcher()
res = fetcher.fetch('https://aniwaves.ru/watch/naruto-76396/ep-1', timeout=30000)
if res:
    import re
    # find ajax urls
    urls = set(re.findall(r'/ajax/[a-zA-Z0-9_/-]+', res.text))
    print("Found AJAX URLs:", urls)
