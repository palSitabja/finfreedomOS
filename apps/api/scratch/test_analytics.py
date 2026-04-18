import yfinance as yf
import json

def test_sector_info():
    tickers = ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS"]
    results = {}
    for t in tickers:
        ticker = yf.Ticker(t)
        # We can use info but info can be slow. 
        # Alternatively, we can use FastInfo in newer yfinance versions
        info = ticker.info
        results[t] = {
            "sector": info.get("sector"),
            "industry": info.get("industry"),
            "marketCap": info.get("marketCap")
        }
    print(json.dumps(results, indent=2))

if __name__ == "__main__":
    test_sector_info()
