from scrapling import StealthyFetcher
fetcher = StealthyFetcher()
res = fetcher.fetch('https://aniwaves.ru/home', timeout=30000)
if res:
    with open('aniwaves_home.html', 'w') as f:
        f.write(res.text)
