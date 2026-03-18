try:
    # Try direct import first for standard execution
    import scrapers # type: ignore
    from scrapers import scrape_watchanimeworld, scrape_watchanimeworld_info # type: ignore
except ImportError:
    # Fallback for IDEs and scripts run from different working directories
    import sys
    import os
    current_dir = os.path.dirname(os.path.abspath(__file__))
    if current_dir not in sys.path:
        sys.path.append(current_dir)
    try:
        from scrapers import scrape_watchanimeworld, scrape_watchanimeworld_info # type: ignore
    except ImportError:
        # Final fallback for cases where scraper-api is the parent
        parent_dir = os.path.dirname(current_dir)
        if parent_dir not in sys.path:
            sys.path.append(parent_dir)
        from scrapers import scrape_watchanimeworld, scrape_watchanimeworld_info # type: ignore

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
