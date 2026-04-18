import yfinance as yf
from fastapi import APIRouter
from typing import List, Dict, Any
import datetime
import time
from llm_provider import chat_complete
import json
import os
from database import get_db_connection

router = APIRouter(prefix="/news", tags=["news"])

# ── 6-hour in-memory cache ──────────────────────────────────────────────────
_NEWS_CACHE: Dict[str, Any] = {}   # { cache_key: {"ts": epoch, "data": [...]} }
CACHE_TTL_SECONDS = 6 * 60 * 60   # 6 hours

def _cache_key(tickers: List[str]) -> str:
    return ",".join(sorted(tickers))

def _get_cached(key: str):
    entry = _NEWS_CACHE.get(key)
    if entry and (time.time() - entry["ts"]) < CACHE_TTL_SECONDS:
        return entry["data"]
    return None

def _set_cache(key: str, data: list):
    _NEWS_CACHE[key] = {"ts": time.time(), "data": data}

# ────────────────────────────────────────────────────────────────────────────

def format_ticker_for_yf(raw_ticker: str) -> str:
    ticker = raw_ticker.upper().strip()
    if ticker.startswith("NSE:"):
        ticker = ticker.replace("NSE:", "") + ".NS"
    elif ticker.startswith("BSE:"):
        ticker = ticker.replace("BSE:", "") + ".BO"
    elif not ticker.endswith(".NS") and not ticker.endswith(".BO"):
        ticker = ticker + ".NS"
    return ticker

def analyze_news_sentiment(ticker: str, title: str) -> Dict[str, Any]:
    """Analyzes news sentiment via the configured LLM provider."""
    try:
        response_text = chat_complete(
            system="You are a Wealth Intelligence AI that analyzes financial news.",
            user=f"""Analyze this news headline for {ticker}:
Headline: "{title}"

Provide ONLY valid JSON (no markdown, no extra text):
{{
  "sentiment": "Bullish" | "Bearish" | "Neutral",
  "impact": "1-sentence summary of why this matters for the stock",
  "score": float between -1.0 and 1.0,
  "action": "Buy" | "Sell" | "Hold",
  "target": "price target if mentioned, else N/A"
}}""",
        )
        content = response_text
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]
            
        return json.loads(content.strip())
    except Exception as e:
        print(f"Sentiment analysis failed for {ticker}: {e}")
        return {
            "sentiment": "Neutral",
            "impact": "Market fluctuations being monitored.",
            "score": 0.0,
            "action": "Hold",
            "target": "N/A"
        }

@router.get("/")
def get_portfolio_news():
    """
    Fetches the latest news for portfolio holdings.
    Results are cached for 6 hours per unique portfolio composition.
    Cache auto-invalidates when stocks are added or removed.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT ticker FROM stock_holdings")
    rows = cursor.fetchall()
    conn.close()
    
    raw_tickers = list(set([r['ticker'] for r in rows]))
    yf_tickers  = [format_ticker_for_yf(t) for t in raw_tickers]
    
    # Check cache first
    key = _cache_key(yf_tickers)
    cached = _get_cached(key)
    if cached is not None:
        print(f"[news] Serving {len(cached)} items from cache (key={key[:40]}...)")
        return cached
    
    print(f"[news] Cache miss — fetching live news for {len(yf_tickers)} tickers")
    
    all_raw_news = []
    seen_links   = set()
    seen_titles  = set()
    
    for ticker in yf_tickers:
        try:
            t = yf.Ticker(ticker)
            news_items = t.news or []
            for item in news_items[:4]:           # up to 4 per ticker
                # yfinance ≥ 0.2.x returns dicts; older returns dicts too
                # Content may be nested under 'content' key in newer versions
                content_block = item.get("content", item)
                
                link  = (content_block.get("canonicalUrl", {}) or {}).get("url") \
                        or content_block.get("clickThroughUrl", {}).get("url") \
                        or item.get("link", "")
                title = content_block.get("title") or item.get("title", "")
                publisher = (content_block.get("provider", {}) or {}).get("displayName") \
                            or item.get("publisher", "Unknown")
                pub_time  = content_block.get("pubDate") or item.get("providerPublishTime")
                
                # Normalise pub_time to epoch int
                if isinstance(pub_time, str):
                    try:
                        pub_time = int(datetime.datetime.fromisoformat(pub_time.replace("Z", "+00:00")).timestamp())
                    except Exception:
                        pub_time = 0
                elif not isinstance(pub_time, int):
                    pub_time = 0
                
                # Thumbnail
                thumbnail = None
                thumb_list = (content_block.get("thumbnail", {}) or {}).get("resolutions", [])
                if thumb_list:
                    thumbnail = thumb_list[0].get("url")
                if not thumbnail:
                    thumb_list = (item.get("thumbnail", {}) or {}).get("resolutions", [])
                    if thumb_list:
                        thumbnail = thumb_list[0].get("url")
                
                # Skip missing / duplicates
                if not title:
                    continue
                if link and link in seen_links:
                    continue
                if title in seen_titles:
                    continue
                
                seen_links.add(link)
                seen_titles.add(title)
                
                all_raw_news.append({
                    "ticker":                ticker.replace(".NS", "").replace(".BO", ""),
                    "title":                 title,
                    "publisher":             publisher,
                    "link":                  link or f"https://finance.yahoo.com/quote/{ticker}/news/",
                    "provider_publish_time": pub_time,
                    "thumbnail":             thumbnail,
                })
        except Exception as e:
            print(f"[news] Error fetching news for {ticker}: {e}")
            continue
            
    # Sort newest-first
    all_raw_news.sort(key=lambda x: x.get("provider_publish_time") or 0, reverse=True)
    
    # AI sentiment for top 12
    top_news = all_raw_news[:12]
    for item in top_news:
        ai_data = analyze_news_sentiment(item['ticker'], item['title'])
        item.update(ai_data)
    
    # Store in cache
    _set_cache(key, top_news)
    return top_news

@router.delete("/cache")
def clear_news_cache():
    """Force-clear the news cache (useful after portfolio changes)."""
    _NEWS_CACHE.clear()
    return {"status": "Cache cleared"}
