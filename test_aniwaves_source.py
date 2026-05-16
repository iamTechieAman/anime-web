from scrapling import StealthyFetcher
fetcher = StealthyFetcher()
res = fetcher.fetch('https://aniwaves.ru/watch/naruto-76396/ep-1', timeout=30000)
if res:
    iframes = res.css('iframe')
    print(f"Found {len(iframes)} iframes")
    for iframe in iframes:
        src = iframe.attrib.get('src')
        if src and not src.startswith('#'):
            print("Iframe Src:", src)
