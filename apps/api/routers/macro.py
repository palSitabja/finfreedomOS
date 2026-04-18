import yfinance as yf
from fastapi import APIRouter
from typing import List, Dict

router = APIRouter(prefix="/macro", tags=["macro"])

MACRO_TICKERS = {
    "Nifty 50":    "^NSEI",
    "Sensex":      "^BSESN",
    "USD/INR":     "INR=X",
    "India VIX":   "^INDIAVIX",
    "Gold":        "GC=F",
    "Silver":      "SI=F",
    "Bitcoin":     "BTC-USD",
    "Crude Oil":   "CL=F",
}

@router.get("/")
def get_macro_signals():
    """
    Fetches intraday snapshots of major market indices and macro indicators.
    Each ticker is fetched independently so a single failure doesn't block the rest.
    """
    results = []
    try:
        tickers_str = " ".join(MACRO_TICKERS.values())
        data = yf.download(tickers_str, period="1d", interval="5m", progress=False)

        for name, ticker in MACRO_TICKERS.items():
            try:
                if data.empty or 'Close' not in data:
                    continue

                close_data = data['Close']
                if ticker in close_data.columns:
                    series = close_data[ticker].dropna()
                elif len(MACRO_TICKERS) == 1:
                    series = close_data.dropna()
                else:
                    continue

                if series.empty:
                    continue

                current_price = float(series.iloc[-1])
                prev_price    = float(series.iloc[0])  # day open for intraday % change
                change        = current_price - prev_price
                change_pct    = (change / prev_price) * 100 if prev_price > 0 else 0

                results.append({
                    "name":       name,
                    "ticker":     ticker,
                    "value":      round(current_price, 2),
                    "change":     round(change, 2),
                    "change_pct": round(change_pct, 2),
                    "trend":      [float(v) for v in series.tolist()],
                })
            except Exception as e:
                print(f"[macro] Skipping {name} ({ticker}): {e}")
                continue

        return results
    except Exception as e:
        print(f"[macro] Critical error: {e}")
        return []
