from fastapi import FastAPI, Query, HTTPException
from typing import Optional, List
from scrapers import (
    scrape_onoflix_search, 
    scrape_watchanimeworld, 
    scrape_watchanimeworld_az,
    scrape_watchanimeworld_info, 
    scrape_watchanimeworld_source,
    scrape_cinemacity,
    scrape_filmex,
    scrape_cinezo,
    scrape_pstream,
    scrape_justanime_search,
    scrape_justanime_info,
    scrape_justanime_source,
    scrape_animex_search,
    scrape_animex_info,
    scrape_animex_source,
    scrape_universal_search,
    scrape_universal_info,
    scrape_universal_source
)

app = FastAPI(title="ToonPlayer Scraper API")

@app.get("/search/universal")
def search_universal(q: str, site: str):
    return scrape_universal_search(site, q)

@app.get("/info/universal")
def info_universal(id: str, site: str):
    return scrape_universal_info(site, id)

@app.get("/source/universal")
def source_universal(id: str, site: str):
    return scrape_universal_source(site, id)

@app.get("/search/onoflix")
def search_onoflix(q: str):
    return scrape_onoflix_search(q)

@app.get("/search/watchanimeworld")
def search_wa(q: str):
    return scrape_watchanimeworld(query=q)

@app.get("/search/watchanimeworld_az")
def search_wa_az(letter: str, page: int = 1):
    return scrape_watchanimeworld_az(letter, page=page)

@app.get("/info/watchanimeworld")
def info_wa(id: str):
    return scrape_watchanimeworld_info(id)

@app.get("/source/watchanimeworld")
def source_wa(id: str):
    return scrape_watchanimeworld_source(id)

@app.get("/search/cinemacity")
def search_cinemacity(q: str):
    return scrape_cinemacity(q)

@app.get("/search/filmex")
def search_filmex(q: str):
    return scrape_filmex(q)

@app.get("/search/cinezo")
def search_cinezo(q: str):
    return scrape_cinezo(q)

@app.get("/search/pstream")
def search_pstream(q: str):
    return scrape_pstream(q)

@app.get("/search/justanime")
def search_ja(q: str):
    return scrape_justanime_search(q)

@app.get("/info/justanime")
def info_ja(id: str, slug: str):
    return scrape_justanime_info(id, slug)

@app.get("/source/justanime")
def source_ja(id: str):
    return scrape_justanime_source(id)

@app.get("/search/animex")
def search_ax(q: str):
    return scrape_animex_search(q)

@app.get("/info/animex")
def info_ax(id: str, slug: str):
    return scrape_animex_info(id, slug)

@app.get("/source/animex")
def source_ax(id: str):
    return scrape_animex_source(id)

@app.get("/health")
def health():
    return {"status": "ok"}
