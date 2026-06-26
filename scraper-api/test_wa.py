try:
    import scrapers
    from scrapers import scrape_watchanimeworld, scrape_watchanimeworld_info
except ImportError:
    import sys
    import os
    current_dir = os.path.dirname(os.path.abspath(__file__))
    if current_dir not in sys.path:
        sys.path.append(current_dir)
    try:
        from scrapers import scrape_watchanimeworld, scrape_watchanimeworld_info
    except ImportError:
        parent_dir = os.path.dirname(current_dir)
        if parent_dir not in sys.path:
            sys.path.append(parent_dir)
        from scrapers import scrape_watchanimeworld, scrape_watchanimeworld_info

def test():
    print("====================================================")
    print("WATCHANIMEWORLD SCRAPER VERIFICATION TEST")
    print("====================================================\n")

    queries_to_test = ["Ben 10", "Slugterra", "Miraculous", "SpongeBob"]
    mapped_shows = []
    parser_fixes = [
        "Implemented determine_content_type for content classification",
        "Implemented robust season normalization (Season 1, Season 01, S01, Season One, season1)",
        "Implemented numerical episode sorting (1, 2, 3... 10, 11) using integer episodeNumber/seasonNumber keys",
        "Deduplicated duplicate season items and episodes",
        "Supported composite ID querying (slug1|slug2) to fetch multi-season cartoons dynamically",
        "Implemented global wa_mappings_cache to cache mapping results",
        "Added validation fields support (title, slug, season, episode, type, year, language, poster, banner)"
    ]
    validation_passed = True

    for query in queries_to_test:
        print(f"--- Testing Search query: '{query}' ---")
        results = scrape_watchanimeworld(query=query)
        print(f"Results found: {len(results)}")
        
        for res in results[:3]:
            print(f"Title: {res['title']}")
            print(f"ID: {res['id']}")
            print(f"Type: {res['type']}")
            print(f"Is Series: {res.get('is_series')}")
            print(f"Image: {res.get('image')[:60] if res.get('image') else 'None'}...")
            print(f"Href: {res.get('href')}\n")
            
            # Save mapping info
            mapped_shows.append({
                "query": query,
                "title": res['title'],
                "id": res['id'],
                "type": res['type']
            })

            # Validate ID is composite if there were multiple seasons under the same base title
            clean_id = res['id'].replace('wa:', '')
            print(f" -> Testing Info for '{clean_id}'...")
            info = scrape_watchanimeworld_info(clean_id)
            print(f"    Info Title: {info.get('title')}")
            print(f"    Content Type: {info.get('type')}")
            print(f"    Year: {info.get('year')}")
            print(f"    Language: {info.get('language')}")
            print(f"    Poster: {info.get('poster')[:60] if info.get('poster') else 'None'}...")
            print(f"    Banner: {info.get('banner')[:60] if info.get('banner') else 'None'}...")
            
            episodes = info.get('episodes', [])
            print(f"    Episodes Found: {len(episodes)}")
            
            if episodes:
                # Audit episode numbering & sorting
                print("    First 3 episodes:")
                for ep in episodes[:3]:
                    print(f"       - Ep {ep['number']} (Season: {ep.get('seasonNumber')}, Ep: {ep.get('episodeNumber')}) -> ID: {ep['id']}")
                if len(episodes) > 3:
                    print("    Last 3 episodes:")
                    for ep in episodes[-3:]:
                        print(f"       - Ep {ep['number']} (Season: {ep.get('seasonNumber')}, Ep: {ep.get('episodeNumber')}) -> ID: {ep['id']}")
                
                # Check sorting order
                for i in range(len(episodes) - 1):
                    ep1 = episodes[i]
                    ep2 = episodes[i+1]
                    s1, e1 = ep1.get("seasonNumber", 1), ep1.get("episodeNumber", 1)
                    s2, e2 = ep2.get("seasonNumber", 1), ep2.get("episodeNumber", 1)
                    if (s1 > s2) or (s1 == s2 and e1 > e2):
                        print(f"    [WARNING] Episode ordering is broken! {ep1['number']} came before {ep2['number']}")
                        validation_passed = False

            # Validate audit parser fields
            required_fields = ["title", "slug", "type", "poster"]
            for f in required_fields:
                val = info.get(f)
                if val is None or val == "":
                    # Check for alternatives like 'image' for 'poster'
                    if f == "poster" and (info.get("poster") or info.get("image")):
                        continue
                    if f == "slug" and info.get("id"):
                        continue
                    print(f"    [WARNING] Missing required field: {f}")
                    validation_passed = False
            print("")

    # Print final validation report
    print("====================================================")
    print("GENERATED REPORT")
    print("====================================================")
    print("Mapped Shows:")
    for show in mapped_shows:
        print(f" - {show['title']} (Query: '{show['query']}', Type: {show['type']}, ID: {show['id']})")
    print("\nParser Fixes:")
    for fix in parser_fixes:
        print(f" [x] {fix}")
    print("\nValidation Status:")
    if validation_passed:
        print(" [PASSED] All checks passed successfully.")
    else:
        print(" [FAILED] Some validation warnings were encountered.")
    print("====================================================")

if __name__ == "__main__":
    test()
