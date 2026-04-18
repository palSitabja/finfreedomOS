import sqlite3
import re
from typing import List, Dict, Any
from sheets import fetch_sheet_data
from database import get_db_connection

MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

def clean_amount(amt: str) -> float:
    if not amt or not isinstance(amt, str):
        return 0.0
    # Strip currency symbols and commas
    clean = re.sub(r'[^\d.-]', '', amt.replace(',', ''))
    try:
        return float(clean)
    except ValueError:
        return 0.0

def process_budget_sheet(spreadsheet_id: str, year: int, tab_name: str, entry_type: str):
    """
    Processes a 'Monthly Matrix' style budget sheet (Expenses or Income).
    """
    print(f"Processing {year} {tab_name}...")
    # Fetch a large range to ensure we get all data (assuming max 500 rows)
    raw_data = fetch_sheet_data(spreadsheet_id, f"'{tab_name}'!A1:Z500")
    if not raw_data:
        return
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # [NEW] Clear existing data for this sheet/year/type to prevent duplicates upon re-sync
    cursor.execute("DELETE FROM transactions WHERE source_sheet_id = ? AND year = ? AND type = ?", (spreadsheet_id, year, entry_type))
    
    current_group = None
    count = 0
    
    for idx, row in enumerate(raw_data):
        if not row:
            continue
            
        # Standardize strings for comparison
        row_clean = [str(c).strip() for c in row]
        
        # 1. Identify Header Row (to find column indices)
        if "Jan" in row_clean and "Feb" in row_clean:
            continue
            
        # 2. [REFINED] Heuristic for Group Headers
        # A header row in this template has text in Col A (idx 0)
        # AND "Monthly totals:" in Col C (idx 2)
        if len(row_clean) > 2 and row_clean[0] and row_clean[2] == "Monthly totals:":
             current_group = row_clean[0]
             print(f"  [DEBUG] Found Group Header: '{current_group}' at row {idx+1}")
             continue
             
        # 3. Skip "Monthly totals:" row even if it's already used as header
        if len(row_clean) > 2 and row_clean[2] == "Monthly totals:":
            continue
            
        # 4. Extract Category Data
        # A valid data row has empty Col A/B and text in Col C
        if len(row_clean) > 2 and row_clean[2] and not row_clean[0]:
            category = row_clean[2]
            
            # Map columns D-O (indices 3-14) to months
            for month_idx, month_name in enumerate(MONTHS):
                col_idx = 3 + month_idx
                if len(row_clean) > col_idx:
                    raw_amount = row_clean[col_idx]
                    amount = clean_amount(raw_amount)
                    
                    if amount != 0:
                        count += 1
                        # Construct a synthetic date: Year-Month-01
                        month_num = str(month_idx + 1).zfill(2)
                        date_str = f"{year}-{month_num}-01"
                        
                        cursor.execute('''
                            INSERT INTO transactions (date, year, month, type, group_name, category, amount, source_sheet_id, raw_row_index)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ''', (date_str, year, month_name, entry_type, current_group, category, amount, spreadsheet_id, idx+1))

    conn.commit()
    conn.close()
    print(f"Finished {year} {tab_name}. Total Records: {count}")

def run_full_sync():
    ids = {
        2021: '1eEUDdRLbwnekYTO7p2vBaWj5EhzCBbPfK1Va7xfE93E',
        2024: '1d-leFCxEQ6xyuw13YX-CtUiD-erEiUUFiPhiVR9A1uo',
        2025: '1YIoU6AsMsUeKwQ3Til91VU1weyzeRIaojP1ZtelKlVE',
        2026: '1aJMpVilVlep3ggNcOn-FuGjFGzrtCdFOU44MrflXbzY'
    }
    
    for year, spreadsheet_id in ids.items():
        process_budget_sheet(spreadsheet_id, year, "Expenses", "Expense")
        process_budget_sheet(spreadsheet_id, year, "Income", "Income")

if __name__ == "__main__":
    run_full_sync()
