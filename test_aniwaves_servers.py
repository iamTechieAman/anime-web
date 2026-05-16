from scrapling import StealthyFetcher
import re
fetcher = StealthyFetcher()
res = fetcher.fetch('https://aniwaves.ru/watch/naruto-76396/ep-1', timeout=30000)
if res:
    server_links = res.css('.servers .server-item, .ps_-list .server-item, .server')
    print(f"Found {len(server_links)} servers")
    for s in server_links:
        print("Server:", s.attrib.get('data-id'), s.text.strip())
