from scrapling import StealthyFetcher
fetcher = StealthyFetcher()
res = fetcher.fetch('https://aniwaves.ru/watch/naruto-76396', timeout=30000)
if res:
    episodes = res.css('.episodes a, a[data-ep], a[href*="/watch/"], .ep-item a')
    if episodes:
        print("EPISODE 1 HTML:", episodes[0].extract())
