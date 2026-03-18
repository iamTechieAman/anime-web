import asyncio
from playwright.async_api import async_playwright
import os

async def take_screenshot(url, name, search_query=None):
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36")
        page = await context.new_page()
        
        try:
            print(f"Navigating to {url}...")
            await page.goto(url, wait_until="networkidle")
            
            if search_query:
                # Try common search selectors
                search_selectors = ['input[name="q"]', 'input[name="keyword"]', 'input[placeholder*="Search"]', 'input[type="text"]']
                found = False
                for sel in search_selectors:
                    try:
                        if await page.is_visible(sel):
                            await page.fill(sel, search_query)
                            await page.press(sel, "Enter")
                            await page.wait_for_load_state("networkidle")
                            found = True
                            print(f"Searched using {sel}")
                            break
                    except: continue
                
                if not found:
                    print(f"Could not find search box for {url}")

            path = f"tmp-screenshot-{name}.png"
            await page.screenshot(path=path, full_page=True)
            print(f"Saved screenshot to {path}")
            
            # Save final URL after potential redirect/search
            print(f"Final URL: {page.url}")
            
        except Exception as e:
            print(f"Error probing {url}: {e}")
        finally:
            await browser.close()

async def main():
    sites = [
        ("https://animex.one/home", "animex"),
        ("https://kaa.lt/", "kaa"),
        ("https://animetsu.net/", "animetsu"),
        ("https://www.animerealms.org/en", "animerealms")
    ]
    
    for url, name in sites:
        await take_screenshot(url, name, "one piece")
        print("-" * 40)

if __name__ == "__main__":
    asyncio.run(main())
