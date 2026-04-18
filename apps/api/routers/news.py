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

async def batch_analyze_sentiment(items: List[Dict[str, Any]], provider: str = None) -> List[Dict[str, Any]]:
    """
    Analyzes news sentiment for multiple items in a single LLM call to reduce latency and rate limiting.
    """
    if not items:
        return []
        
    try:
        from llm_provider import async_chat_complete
        
        # Prepare batch context
        context = "\n".join([
            f"ID: {i} | Ticker: {item['ticker']} | Headline: {item['title']}"
            for i, item in enumerate(items)
        ])
        
        system_prompt = "You are a Wealth Intelligence AI that analyzes financial news in batches."
        user_prompt = f"""Analyze these {len(items)} news headlines and provide sentiment metadata for each.
Return ONLY a valid JSON array of objects, with NO markdown, matching the ID provided.

Headlines:
{context}

JSON Structure:
[
  {{
    "id": int,
    "sentiment": "Bullish" | "Bearish" | "Neutral",
    "impact": "1-sentence summary",
    "score": float (-1.0 to 1.0),
    "action": "Buy" | "Sell" | "Hold",
    "target": "N/A"
  }},
  ...
]"""

        response_text = await async_chat_complete(
            system=system_prompt,
            user=user_prompt,
            provider=provider
        )
        
        content = response_text
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]
            
        batch_results = json.loads(content.strip())
        
        # Map results back to items
        for res in batch_results:
            idx = res.get("id")
            if idx is not None and idx < len(items):
                items[idx].update({
                    "sentiment": res.get("sentiment", "Neutral"),
                    "impact":    res.get("impact", "N/A"),
                    "score":     res.get("score", 0.0),
                    "action":    res.get("action", "Hold"),
                    "target":    res.get("target", "N/A")
                })
        return items
    except Exception as e:
        print(f"Batch sentiment analysis failed ({provider}): {e}")
        # Fill with fallbacks if batch fails
        for item in items:
            if "sentiment" not in item:
                item.update({"sentiment": "Neutral", "impact": "Analysis unavailable", "score": 0.0, "action": "Hold", "target": "N/A"})
        return items

@router.get("/")
@router.get("")
async def get_portfolio_news():
    """
    Fetches the latest news for portfolio holdings.
    Distributes batch sentiment analysis between providers to avoid rate limits.
    """
    import asyncio
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT ticker FROM stock_holdings")
    rows = cursor.fetchall()
    conn.close()
    
    raw_tickers = list(set([r['ticker'] for r in rows]))
    yf_tickers  = [format_ticker_for_yf(t) for t in raw_tickers]
    
    key = _cache_key(yf_tickers)
    cached = _get_cached(key)
    if cached is not None:
        return cached
    
    print(f"[news] Cache miss — fetching live news for {len(yf_tickers)} tickers")
    
    all_raw_news = []
    seen_links   = set()
    seen_titles  = set()
    
    for ticker in yf_tickers:
        try:
            t = yf.Ticker(ticker)
            news_items = t.news or []
            for item in news_items[:4]:
                content_block = item.get("content", item)
                link  = (content_block.get("canonicalUrl", {}) or {}).get("url") \
                        or item.get("link", "")
                title = content_block.get("title") or item.get("title", "")
                publisher = (content_block.get("provider", {}) or {}).get("displayName") \
                            or item.get("publisher", "Unknown")
                pub_time  = content_block.get("pubDate") or item.get("providerPublishTime")
                
                if isinstance(pub_time, str):
                    try: pub_time = int(datetime.datetime.fromisoformat(pub_time.replace("Z", "+00:00")).timestamp())
                    except Exception: pub_time = 0
                elif not isinstance(pub_time, int): pub_time = 0
                
                thumbnail = None
                thumb_list = (content_block.get("thumbnail", {}) or {}).get("resolutions", [])
                if thumb_list: thumbnail = thumb_list[0].get("url")
                
                if not title or (link and link in seen_links) or title in seen_titles:
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
        except Exception: continue
            
    all_raw_news.sort(key=lambda x: x.get("provider_publish_time") or 0, reverse=True)
    
    # Dynamic batching and provider distribution
    BATCH_SIZE = 6
    MAX_ITEMS  = 24  # Limit to 24 items to prevent prompt explosion
    top_news   = all_raw_news[:MAX_ITEMS]
    
    # Chunk news into batches of 6
    batches = [top_news[i:i + BATCH_SIZE] for i in range(0, len(top_news), BATCH_SIZE)]
    
    # Round-robin distribution between GitHub and Groq
    providers = ["github", "groq"]
    tasks = []
    for i, batch in enumerate(batches):
        target_provider = providers[i % len(providers)]
        tasks.append(batch_analyze_sentiment(batch, provider=target_provider))
    
    await asyncio.gather(*tasks)
    
    _set_cache(key, top_news)
    return top_news


@router.delete("/cache")
def clear_news_cache():
    """Force-clear the news cache (useful after portfolio changes)."""
    _NEWS_CACHE.clear()
    return {"status": "Cache cleared"}
