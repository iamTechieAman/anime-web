import json
from scrapers import scrape_watchanimeworld, scrape_watchanimeworld_info

def test():
    print("Testing Search for 'Solo Leveling'...")
    search_results = scrape_watchanimeworld(query="Solo Leveling")
    print(f"Search Results: {len(search_results)}")
    for res in search_results[:3]:
        print(f" - {res['title']} ({res['id']})")

    if search_results:
        first_id = search_results[0]['id'].replace('wa:', '')
        print(f"\nTesting Info for '{first_id}'...")
        info = scrape_watchanimeworld_info(first_id)
        print(f"Info Title: {info.get('title')}")
        print(f"Episodes Found: {len(info.get('episodes', []))}")
        for ep in info.get('episodes', [])[:3]:
            print(f" - Ep {ep['number']}: {ep['id']}")

if __name__ == "__main__":
    test()
