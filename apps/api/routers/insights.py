import litellm
from litellm import completion, suppress_debug_info
from fastapi import APIRouter
from sheet_parser import get_all_time_stats, get_year_data
from routers.stocks import get_stocks
from llm_provider import chat_complete
from typing import Dict, Any, Optional
import datetime
import threading

# Mute LiteLLM spam
suppress_debug_info = True

router = APIRouter(prefix="/portfolio", tags=["portfolio"])

import asyncio
# ── Permanent in-memory cache (no TTL — cleared only by user action) ─────────
_INSIGHT_CACHE: Optional[Dict[str, Any]] = None
_INSIGHT_LOCK  = asyncio.Lock()   # prevents duplicate concurrent LLM calls

@router.delete("/cache")
def clear_insight_cache():
    """Force-clear the AI portfolio commentary cache."""
    global _INSIGHT_CACHE
    _INSIGHT_CACHE = None
    return {"status": "Insight cache cleared"}

@router.get("/analysis")
@router.get("/analysis/")
@router.get("")
@router.get("/")
async def get_portfolio_analysis(force: bool = False):
    """
    Generates AI intelligence insights for the overall portfolio.
    Result is cached indefinitely until the user triggers a manual recalibration
    (which calls DELETE /portfolio/cache then re-fetches this endpoint).
    Pass ?force=true to bypass the cache without clearing it.
    """
    global _INSIGHT_CACHE

    # Fast path: serve from cache without acquiring the lock
    if _INSIGHT_CACHE is not None and not force:
        print("[insights] Serving from cache")
        return _INSIGHT_CACHE

    # Slow path: acquire lock so only one thread calls the LLM
    async with _INSIGHT_LOCK:
        # Re-check after acquiring lock — another thread may have filled the cache
        if _INSIGHT_CACHE is not None and not force:
            print("[insights] Serving from cache (post-lock)")
            return _INSIGHT_CACHE

        print("[insights] Cache miss — generating fresh AI commentary")
    try:
        # 1. Gather context
        # Run these in threads to avoid blocking the event loop
        all_time, stocks_data = await asyncio.gather(
            asyncio.to_thread(get_all_time_stats),
            asyncio.to_thread(get_stocks)
        )
        
        # Calculate key metrics
        total_income = all_time.get("total_income", 0)
        total_expenses = all_time.get("total_expenses", 0)
        net_savings = all_time.get("net_savings", 0)
        investments = all_time.get("investments", 0)
        
        # 2. Risk Heuristics
        e_i_ratio = total_expenses / total_income if total_income > 0 else 1
        lifestyle_risk = "High" if e_i_ratio > 0.8 else "Moderate" if e_i_ratio > 0.5 else "Low"
        
        stock_ratio = investments / net_savings if net_savings > 0 else 0
        investment_risk = "Aggressive" if stock_ratio > 0.7 else "Moderate" if stock_ratio > 0.3 else "Conservative"
        
        risk_level = "High" if lifestyle_risk == "High" else investment_risk
        health_status = "Excellent" if net_savings > total_expenses * 2 else "Stable" if net_savings > 0 else "Review Needed"
        
        # Extract holdings list from the new metadata-wrapped response
        stocks_list = stocks_data.get("holdings", []) if isinstance(stocks_data, dict) else stocks_data
        
        holdings_summary = [
            f"{s['ticker']}: ₹{s['current_value']:,.0f} ({s['percent_change']:.1f}% return)"
            for s in stocks_list
        ]
        holdings_str = "\n".join(holdings_summary)
        
        # 3. Build Prompt
        prompt = f"""
        You are the Wealth Intelligence Oracle. Analyze this financial profile:
        - Portfolio Health: {health_status}
        - Combined Risk Profile: {risk_level} (Lifestyle: {lifestyle_risk}, Investment: {investment_risk})
        - Savings Rate: {((1 - e_i_ratio) * 100):.1f}%
        - Stock Holdings Performance:
        {holdings_str if holdings_str else "No stock holdings yet."}
        
        Provide 3 concise, actionable insights for the upcoming week. 
        Identify if the user is over-leveraged or has too much cash drag.
        
        Keep it professional, helpful, and under 150 words.
        """
        
        # 4. Call LLM via configured provider
        from llm_provider import async_chat_complete
        analysis = await async_chat_complete(
            system="You are the Wealth Intelligence Oracle, a professional financial advisor AI.",
            user=prompt,
        )
        
        result = {
            "timestamp": datetime.datetime.now().isoformat(),
            "analysis": analysis,
            "status": health_status,
            "risk_level": risk_level,
            "cached": False
        }

        # Store in cache
        _INSIGHT_CACHE = {**result, "cached": True}
        return result

    except Exception as e:
        print(f"Error generating AI analysis: {e}")
        fallback = {
            "analysis": "Oracle is currently unavailable. Manual check: Ensure your expense ratio remains below 50%.",
            "status": "Stable",
            "risk_level": "Moderate",
            "timestamp": datetime.datetime.now().isoformat(),
            "cached": False
        }
        return fallback
