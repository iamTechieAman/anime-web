from scrapling import StealthyFetcher
fetcher = StealthyFetcher()
res = fetcher.fetch('https://aniwaves.ru/filter?keyword=Naruto', timeout=30000)
if res:
    items = res.css('div.item, .flw-item')
    for item in items[:2]:
        print("HTML excerpt:", str(item.root)[:500])
