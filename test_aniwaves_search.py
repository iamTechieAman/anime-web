from scrapling import StealthyFetcher
fetcher = StealthyFetcher()
res = fetcher.fetch('https://aniwaves.ru/filter?keyword=Naruto', timeout=30000)
if res:
    print("STATUS filter:", res.status)
else:
    print("Failed to fetch filter")
