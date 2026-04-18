import yfinance as yf
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import get_db_connection
from typing import List, Optional, Dict

router = APIRouter(prefix="/stocks", tags=["stocks"])

class StockCreate(BaseModel):
    ticker: str
    avg_price_paid: float
    shares: float
    exit_price: Optional[float] = None

class StockResponse(StockCreate):
    id: int
    current_price: float
    current_value: float
    money_invested: float
    gain_loss: float
    percent_change: float
    trend: List[float] = []

def format_ticker_for_yf(raw_ticker: str) -> str:
    """
    Format standard string inputs (e.g., 'NSE:BDL', 'RELIANCE') to yfinance's format ('BDL.NS').
    """
    ticker = raw_ticker.upper().strip()
    if ticker.startswith("NSE:"):
        ticker = ticker.replace("NSE:", "") + ".NS"
    elif ticker.startswith("BSE:"):
        ticker = ticker.replace("BSE:", "") + ".BO"
    elif not ticker.endswith(".NS") and not ticker.endswith(".BO"):
        # Assume it's an NSE stock by default if it's an Indian portfolio without suffix
        ticker = ticker + ".NS"
    return ticker

def get_live_stock_data(tickers: List[str]) -> Dict[str, Dict[str, any]]:
    """
    Fetches live prices and 7-day trends for a list of formatted tickers.
    Returns a dict mapping ticker to { 'price': float, 'trend': list[float] }.
    """
    if not tickers:
        return {}
        
    try:
        # Fetch 1 month of data to get a 30-day trend
        tickers_str = " ".join(tickers)
        data = yf.download(tickers_str, period="1mo", interval="1d", progress=False)
        
        results = {}
        if data.empty:
            return results
            
        # Ensure data is consistent even for single vs multiple tickers
        for ticker in tickers:
            try:
                # In newer yfinance, data['Close'] is a DataFrame if multiple tickers,
                # or a Series if single ticker (unless list was passed).
                # We'll handle both by checking the columns.
                if 'Close' in data:
                    close_data = data['Close']
                    if ticker in close_data:
                        series = close_data[ticker].dropna()
                    else:
                        series = close_data.dropna()
                    
                    if not series.empty:
                        results[ticker] = {
                            "price": float(series.iloc[-1]),
                            "trend": [float(v) for v in series.tolist()]
                        }
            except Exception as e:
                print(f"Error parsing ticker {ticker}: {e}")
                
        return results
    except Exception as e:
        print(f"Error fetching live stock data: {e}")
        return {}

@router.get("/", response_model=List[StockResponse])
def get_stocks():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM stock_holdings")
    rows = cursor.fetchall()
    conn.close()

    stock_records = [dict(r) for r in rows]
    
    # Collect tickers for batch fetching
    yf_tickers_map = {}
    for r in stock_records:
        yf_tickers_map[r['id']] = format_ticker_for_yf(r['ticker'])

    live_data = get_live_stock_data(list(set(yf_tickers_map.values())))

    response_data = []
    for r in stock_records:
        formatted_ticker = yf_tickers_map[r['id']]
        stock_info = live_data.get(formatted_ticker, {})
        
        current_price = stock_info.get("price", r['avg_price_paid'])
        trend = stock_info.get("trend", [current_price] * 5) # Fallback trend
        
        invested = r['avg_price_paid'] * r['shares']
        current_val = current_price * r['shares']
        
        response_data.append({
            **r,
            "current_price": current_price,
            "current_value": current_val,
            "money_invested": invested,
            "gain_loss": current_val - invested,
            "percent_change": ((current_price - r['avg_price_paid']) / r['avg_price_paid']) * 100 if r['avg_price_paid'] > 0 else 0,
            "trend": trend
        })

    return response_data

@router.post("/", response_model=StockResponse)
def create_stock(stock: StockCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO stock_holdings (ticker, avg_price_paid, shares, exit_price)
        VALUES (?, ?, ?, ?)
    ''', (stock.ticker, stock.avg_price_paid, stock.shares, stock.exit_price))
    conn.commit()
    new_id = cursor.lastrowid
    
    cursor.execute("SELECT * FROM stock_holdings WHERE id = ?", (new_id,))
    row = dict(cursor.fetchone())
    conn.close()
    
    # Fetch initial live data
    formatted = format_ticker_for_yf(row['ticker'])
    live = get_live_stock_data([formatted])
    stock_info = live.get(formatted, {})
    
    cp = stock_info.get("price", row['avg_price_paid'])
    trend = stock_info.get("trend", [cp] * 5)
    
    invested = row['avg_price_paid'] * row['shares']
    cur_val = cp * row['shares']
    
    return {
        **row,
        "current_price": cp,
        "current_value": cur_val,
        "money_invested": invested,
        "gain_loss": cur_val - invested,
        "percent_change": ((cp - row['avg_price_paid']) / row['avg_price_paid']) * 100 if row['avg_price_paid'] > 0 else 0,
        "trend": trend
    }

@router.put("/{stock_id}", response_model=StockResponse)
def update_stock(stock_id: int, stock: StockCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE stock_holdings 
        SET ticker = ?, avg_price_paid = ?, shares = ?, exit_price = ?
        WHERE id = ?
    ''', (stock.ticker, stock.avg_price_paid, stock.shares, stock.exit_price, stock_id))
    conn.commit()
    
    cursor.execute("SELECT * FROM stock_holdings WHERE id = ?", (stock_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Stock not found")
        
    row_dict = dict(row)
    formatted = format_ticker_for_yf(row_dict['ticker'])
    live = get_live_stock_data([formatted])
    stock_info = live.get(formatted, {})
    
    cp = stock_info.get("price", row_dict['avg_price_paid'])
    trend = stock_info.get("trend", [cp] * 5)
    
    invested = row_dict['avg_price_paid'] * row_dict['shares']
    cur_val = cp * row_dict['shares']
    
    return {
        **row_dict,
        "current_price": cp,
        "current_value": cur_val,
        "money_invested": invested,
        "gain_loss": cur_val - invested,
        "percent_change": ((cp - row_dict['avg_price_paid']) / row_dict['avg_price_paid']) * 100 if row_dict['avg_price_paid'] > 0 else 0,
        "trend": trend
    }

@router.delete("/{stock_id}")
def delete_stock(stock_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM stock_holdings WHERE id = ?", (stock_id,))
    conn.commit()
    conn.close()
    return {"message": "Stock deleted successfully"}
