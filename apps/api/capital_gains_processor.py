import pandas as pd
import json
import os
from typing import Dict, Any, List

def parse_mf_capital_gains(file_path: str) -> Dict[str, Any]:
    """Parses a standard MF Capital Gains Excel report with robust header detection."""
    try:
        # Load without header first to find the table
        df_raw = pd.read_excel(file_path, header=None)
        
        # Find the row with "Scheme Name"
        header_idx = -1
        for idx, row in df_raw.iterrows():
            if any("Scheme Name" in str(cell) for cell in row):
                header_idx = idx
                break
        
        if header_idx == -1:
            return {"error": "Could not find 'Scheme Name' header in report"}
            
        # Re-read with correct header
        df = pd.read_excel(file_path, header=header_idx)
        df.columns = [str(c).strip() for c in df.columns]
        
        # Filter for rows that have data
        df = df[df['Scheme Name'].notna()]
        # Remove total rows if any
        df = df[~df['Scheme Name'].str.contains('Total', case=False, na=False)]
        
        total_stcg = pd.to_numeric(df['Short Term-Capital Gain'], errors='coerce').sum()
        total_ltcg = pd.to_numeric(df['Long Term-Capital Gain'], errors='coerce').sum()
        
        items = []
        for _, row in df.head(10).iterrows():
            items.append({
                "name": str(row['Scheme Name']),
                "stcg": round(float(pd.to_numeric(row.get('Short Term-Capital Gain', 0), errors='coerce') or 0), 2),
                "ltcg": round(float(pd.to_numeric(row.get('Long Term-Capital Gain', 0), errors='coerce') or 0), 2)
            })

        return {
            "type": "mutual_funds",
            "total_stcg": round(float(total_stcg), 2),
            "total_ltcg": round(float(total_ltcg), 2),
            "total_dividend": 0,
            "items": items
        }
    except Exception as e:
        print(f"Error parsing MF report: {e}")
        return {"error": f"MF Parse Error: {str(e)}"}

def parse_stocks_capital_gains(file_path: str) -> Dict[str, Any]:
    """Parses a standard Stocks P&L Excel report with summary extraction."""
    try:
        df_raw = pd.read_excel(file_path, header=None)
        stcg = 0
        ltcg = 0
        dividend = 0
        
        # Search for key labels in the entire first two columns
        for _, row in df_raw.iterrows():
            label = str(row.iloc[0]).lower().strip()
            val = row.iloc[1]
            try:
                if 'short term p&l' in label or 'short term trades' in label:
                    if not pd.isna(val): stcg += float(val)
                elif 'long term p&l' in label or 'long term trades' in label:
                    if not pd.isna(val): ltcg += float(val)
                elif 'dividends' in label:
                    if not pd.isna(val): dividend = float(val)
            except:
                continue

        return {
            "type": "stocks",
            "total_stcg": round(stcg, 2),
            "total_ltcg": round(ltcg, 2),
            "total_dividend": round(dividend, 2),
            "items": []
        }
    except Exception as e:
        print(f"Error parsing Stock report: {e}")
        return {"error": f"Stock Parse Error: {str(e)}"}

def save_gains_data(file_name: str, data: Dict[str, Any]):
    """Saves parsed gains to a persistent file."""
    path = "uploads/tax_docs/realized_gains.json"
    
    current_gains = []
    if os.path.exists(path):
        with open(path, 'r') as f:
            current_gains = json.load(f)
            
    # Remove existing entry for this file if present
    current_gains = [g for g in current_gains if g.get('filename') != file_name]
    
    data['filename'] = file_name
    current_gains.append(data)
    
    with open(path, 'w') as f:
        json.dump(current_gains, f, indent=2)

def get_aggregated_gains() -> Dict[str, Any]:
    """Sums all realized gains from all uploaded reports."""
    path = "uploads/tax_docs/realized_gains.json"
    if not os.path.exists(path):
        return {
            "total_stcg": 0,
            "total_ltcg": 0,
            "total_dividend": 0,
            "reports_count": 0
        }
        
    with open(path, 'r') as f:
        reports = json.load(f)
        
    total_stcg = sum(r.get('total_stcg', 0) for r in reports)
    total_ltcg = sum(r.get('total_ltcg', 0) for r in reports)
    total_dividend = sum(r.get('total_dividend', 0) for r in reports)
    
    return {
        "total_stcg": round(total_stcg, 2),
        "total_ltcg": round(total_ltcg, 2),
        "total_dividend": round(total_dividend, 2),
        "reports_count": len(reports)
    }
