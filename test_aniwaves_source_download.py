from scrapling import StealthyFetcher
import re, json, base64
fetcher = StealthyFetcher()
res = fetcher.fetch('https://aniwaves.ru/watch/naruto-76396/ep-1', timeout=30000)
if res:
    elements = res.css('[download-data]')
    print(f"Found {len(elements)} download-data elements")
    if elements:
        data = elements[0].attrib.get('download-data')
        if data:
            decoded = base64.b64decode(data).decode('utf-8')
            print(decoded)
