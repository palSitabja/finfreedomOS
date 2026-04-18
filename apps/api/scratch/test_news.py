import yfinance as yf
import json

def test_news():
    ticker = yf.Ticker("RELIANCE.NS")
    news = ticker.news
    print(json.dumps(news[:3], indent=2))

if __name__ == "__main__":
    test_news()
