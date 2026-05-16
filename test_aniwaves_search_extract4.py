from scrapling import StealthyFetcher
fetcher = StealthyFetcher()
res = fetcher.fetch('https://aniwaves.ru/filter?keyword=Naruto', timeout=30000)
if res:
    items = res.css('div.item, .flw-item')
    if items:
        # get raw inner html
        print("HTML excerpt:", items[0].extract())
