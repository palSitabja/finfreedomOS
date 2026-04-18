import yfinance as yf
import json

def test_mf_info():
    # Example: Axis Bluechip Fund Direct Growth
    # Ticker usually ends in .BO or .NS for MFs on Yahoo
    # But often users just put names.
    ticker = yf.Ticker("0P0000XW7U.BO") 
    try:
        info = ticker.info
        print(f"Name: {info.get('longName')}")
        print(f"Sector Weights: {info.get('sectorWeightings')}")
        print(f"Holdings: {info.get('holdings')}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_mf_info()
