from fastapi import FastAPI, Query, HTTPException
from typing import Optional, List
from scrapers import (
    scrape_onoflix_search, 
    scrape_watchanimeworld, 
    scrape_watchanimeworld_info, 
    scrape_watchanimeworld_source,
    scrape_cinemacity,
    scrape_filmex,
    scrape_cinezo,
    scrape_pstream
)

app = FastAPI(title="ToonPlayer Scraper API")

@app.get("/search/onoflix")
def search_onoflix(q: str):
    return scrape_onoflix_search(q)

@app.get("/search/watchanimeworld")
def search_wa(q: str):
    return scrape_watchanimeworld(query=q)

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

@app.get("/health")
def health():
    return {"status": "ok"}
