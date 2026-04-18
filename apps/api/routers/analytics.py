import yfinance as yf
from fastapi import APIRouter
from database import get_db_connection
from routers.stocks import get_stocks, format_ticker_for_yf
from sheet_parser import get_year_data
import datetime
from typing import List, Dict, Any

router = APIRouter(prefix="/analytics", tags=["analytics"])

def get_ticker_metadata(ticker_yf: str) -> Dict[str, Any]:
    """
    Fetches meta-data from local cache or yfinance if missing.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM ticker_metadata WHERE ticker = ?", (ticker_yf,))
    row = cursor.fetchone()
    
    # Cache hit and fresh (last 30 days)
    if row:
        last_updated = datetime.datetime.fromisoformat(row['last_updated'])
        if (datetime.datetime.now() - last_updated).days < 30:
            conn.close()
            return dict(row)
            
    # Cache miss or stale -> fetch from yfinance
    try:
        t = yf.Ticker(ticker_yf)
        info = t.info
        meta = {
            "ticker": ticker_yf,
            "sector": info.get("sector", "Other"),
            "industry": info.get("industry", "Other"),
            "market_cap": info.get("marketCap", 0)
        }
        
        cursor.execute('''
            INSERT INTO ticker_metadata (ticker, sector, industry, market_cap, last_updated)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(ticker) DO UPDATE SET
                sector=excluded.sector,
                industry=excluded.industry,
                market_cap=excluded.market_cap,
                last_updated=excluded.last_updated
        ''', (meta['ticker'], meta['sector'], meta['industry'], meta['market_cap'], datetime.datetime.now().isoformat()))
        conn.commit()
        conn.close()
        return meta
    except Exception as e:
        print(f"Error fetching metadata for {ticker_yf}: {e}")
        conn.close()
        return {"ticker": ticker_yf, "sector": "Other", "industry": "Other", "market_cap": 0}

@router.get("/allocation")
def get_portfolio_allocation():
    """
    Returns portfolio breakdown by Sector and Market Cap.
    """
    stocks = get_stocks()
    if not stocks:
        return {"sectors": [], "market_cap": []}
        
    sector_map = {}
    total_val = sum(s['current_value'] for s in stocks)
    
    for s in stocks:
        meta = get_ticker_metadata(format_ticker_for_yf(s['ticker']))
        sector = meta['sector'] or "Other"
        sector_map[sector] = sector_map.get(sector, 0) + s['current_value']
        
    sector_list = [
        {"name": name, "value": val, "percent": (val / total_val) * 100}
        for name, val in sector_map.items()
    ]
    
    return {
        "sectors": sorted(sector_list, key=lambda x: x['value'], reverse=True),
        "total_equity_value": total_val
    }

@router.get("/performance")
def get_benchmark_comparison():
    """
    Compares portfolio return (CAGR) against Nifty 50.
    """
    try:
        # Get portfolio CAGR from the latest year's assets in sheet
        # For simplicity, we'll use 2026 or the latest available
        year_data = get_year_data("2026")
        assets = year_data.get("assets", [])
        
        portfolio_cagr = 0
        if assets:
            # Calculate weighted average CAGR or just use the first for now
            # In a real app, we'd calculate portfolio-level CAGR
            portfolio_cagr = sum(a['cagr'] for a in assets) / len(assets)
            
        # Fetch Nifty 50 (^NSEI) for comparison
        nifty = yf.Ticker("^NSEI")
        # Get trailing 1 year return approx
        hist = nifty.history(period="1y")
        nifty_1y_return = ((hist['Close'].iloc[-1] - hist['Close'].iloc[0]) / hist['Close'].iloc[0]) * 100
        
        return {
            "portfolio_cagr": round(portfolio_cagr, 2),
            "nifty_1y_return": round(nifty_1y_return, 2),
            "status": "Outperforming" if portfolio_cagr > nifty_1y_return else "Underperforming"
        }
    except Exception as e:
        print(f"Error in benchmark comparison: {e}")
        return {"portfolio_cagr": 0, "nifty_1y_return": 0, "status": "N/A"}

@router.get("/risk")
def get_risk_metrics():
    """
    Calculates concentration risk.
    """
    stocks = get_stocks()
    if not stocks:
        return {"concentration_alerts": [], "max_position_pct": 0, "hhi": 0}
        
    total_val = sum(s['current_value'] for s in stocks)
    alerts = []
    max_pct = 0
    hhi = 0
    
    for s in stocks:
        pct = (s['current_value'] / total_val) * 100
        if pct > max_pct:
            max_pct = pct
        
        hhi += (pct ** 2)
        
        if pct > 15: # Industry standard limit
            alerts.append({
                "ticker": s['ticker'],
                "pct": round(pct, 2),
                "severity": "High" if pct > 25 else "Medium"
            })
            
    return {
        "alerts": alerts,
        "max_position_pct": round(max_pct, 2),
        "hhi": round(hhi, 0), # Hhi < 1500 is good, > 2500 is high concentration
        "diversification_status": "Well Diversified" if hhi < 2000 else "Concentrated"
    }
