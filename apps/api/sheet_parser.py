"""
sheet_parser.py
---------------
Reads directly from Google Sheets using hardcoded row/column offsets that
exactly match the "Annual budget tracker" template structure.

Sheet Column Map (same for both Income and Expenses tabs):
  Col D = Jan, E = Feb, F = Mar, G = Apr, H = May, I = Jun,
  Col J = Jul, K = Aug, L = Sep, M = Oct, N = Nov, O = Dec,
  Col P = Total, Q = Average

NOTE: Google Sheets API returns 0-indexed arrays.
  Column A = index 0, B = 1, C = 2, D = 3, E = 4, ... O = 14, P = 15, Q = 16
"""

from typing import Dict, Any, Optional, List
from sheets import fetch_sheet_data, get_spreadsheet_metadata
from logger import setup_logger

logger = setup_logger("sheet_parser")

# ── Spreadsheet IDs ──────────────────────────────────────────────────────────
SHEET_IDS: Dict[str, str] = {
    "2021": "1eEUDdRLbwnekYTO7p2vBaWj5EhzCBbPfK1Va7xfE93E",
    "2022": "1AA9zxJy8zLSmGo94_avHDpspQcNlcm8VlqsFZuRyFCM",
    "2023": "12UaF_9Jh2465zx-tZ1RE5BsaLBsME9eBXnSxSWrA7_w",
    "2024": "1d-leFCxEQ6xyuw13YX-CtUiD-erEiUUFiPhiVR9A1uo",
    "2025": "1YIoU6AsMsUeKwQ3Til91VU1weyzeRIaojP1ZtelKlVE",
    "2026": "1aJMpVilVlep3ggNcOn-FuGjFGzrtCdFOU44MrflXbzY",
}

# Years where row offsets may be inconsistent — parse defensively

# ── Column constants ──────────────────────────────────────────────────────────
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

# 0-indexed: D=3 (Jan) through O=14 (Dec), P=15 (Total), Q=16 (Average)
MONTH_COL_START = 3   # Col D = Jan
MONTH_COL_END   = 14  # Col O = Dec
TOTAL_COL       = 15  # Col P
AVG_COL         = 16  # Col Q

# ── Helpers ──────────────────────────────────────────────────────────────────

def _parse_number(val: Any) -> float:
    """Convert a cell value (string with ₹, commas, %, or empty) to float."""
    if val is None or val == "":
        return 0.0
    s = str(val).replace("₹", "").replace(",", "").replace("%", "").strip()
    # Handle negative values represented as (12345) in some sheets
    if s.startswith("(") and s.endswith(")"):
        s = "-" + s[1:-1]
    try:
        return float(s)
    except ValueError:
        return 0.0


def _extract_monthly(row: List[Any]) -> Dict[str, float]:
    """Given a raw sheet row list, extract 12 monthly values + total."""
    result: Dict[str, float] = {}
    for i, month in enumerate(MONTHS):
        col_idx = MONTH_COL_START + i  # D=3 for Jan ... O=14 for Dec
        val = row[col_idx] if col_idx < len(row) else ""
        result[month] = _parse_number(val)
    result["Total"] = _parse_number(row[TOTAL_COL] if TOTAL_COL < len(row) else "")
    result["Average"] = _parse_number(row[AVG_COL] if AVG_COL < len(row) else "")
    return result


def _fetch_range(spreadsheet_id: str, range_str: str) -> List[List[Any]]:
    """Fetch a range, returning empty nested list on failure."""
    return fetch_sheet_data(spreadsheet_id, range_str) or []


# ── Core parsers ─────────────────────────────────────────────────────────────

def _parse_tab(
    spreadsheet_id: str,
    tab_name: str,
    fetch_range_end: str = "Q",
) -> Dict[str, Any]:
    """
    Generic dynamic parser for Income and Expenses tabs.
    Scans Column A for Group Names and Column C for Item Names.
    Automatically adapts to new rows or missing rows.
    """
    range_str = f"'{tab_name}'!A1:{fetch_range_end}300"
    raw = _fetch_range(spreadsheet_id, range_str)
    
    result: Dict[str, Any] = {}
    current_group = None
    
    for row in raw:
        col_a = str(row[0]).strip() if len(row) > 0 else ""
        col_c = str(row[2]).strip() if len(row) > 2 else ""
        
        if col_a and col_c == "Monthly totals:":
            current_group = col_a
            if current_group not in result:
                result[current_group] = {"total": _extract_monthly(row), "items": {}}
                logger.info(f"Parsed group {current_group} in {tab_name}: Total={result[current_group]['total'].get('Total', 0)}")
        elif not col_a and col_c and current_group:
            item_name = col_c
            # Skip empty summary headers
            if item_name in ("Monthly totals:", "Income", "Expenses", "Summary", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"):
                continue
            result[current_group]["items"][item_name] = _extract_monthly(row)
            
    return result


def _parse_setup(spreadsheet_id: str) -> float:
    """Fetch starting balance from Setup!C13."""
    raw = _fetch_range(spreadsheet_id, "Setup!C13")
    if raw and raw[0]:
        return _parse_number(raw[0][0])
    return 0.0


def _parse_assets(spreadsheet_id: str) -> List[Dict[str, Any]]:
    """
    Parse the Assets tab investment tracker dynamically.
    """
    raw = _fetch_range(spreadsheet_id, "Assets!A3:K200")
    if not raw:
        return []

    assets = []
    # Skip row 0 (header)
    for row in raw[1:]:
        name = row[0] if len(row) > 0 else ""
        if not name:
            continue
        if name.lower() == "total":
            break
        assets.append({
            "name":             name,
            "invested_amount":  _parse_number(row[1] if len(row) > 1 else ""),
            "current_amount":   _parse_number(row[2] if len(row) > 2 else ""),
            "absolute_return":  _parse_number(row[3] if len(row) > 3 else ""),
            "xirr":             _parse_number(row[4] if len(row) > 4 else ""),
            "cagr":             _parse_number(row[5] if len(row) > 5 else ""),
            "tenure_years":     _parse_number(row[7] if len(row) > 7 else ""),
        })
    return assets


# ── Main public API ───────────────────────────────────────────────────────────

def get_year_data(year: str) -> Dict[str, Any]:
    """
    Fetch and parse all data for a given year directly from Google Sheets.
    Returns a fully structured dict with income, expenses, and assets.
    """
    year_str = str(year)
    if year_str not in SHEET_IDS:
        raise ValueError(f"No sheet configured for year {year_str}. Available: {list(SHEET_IDS.keys())}")

    sid = SHEET_IDS[year_str]

    starting_balance = _parse_setup(sid)
    income   = _parse_tab(sid, "Income", "Q")
    expenses = _parse_tab(sid, "Expenses", "Q")
    assets   = _parse_assets(sid)

    # ── Derived summary (mirrors the Summary tab) ─────────────────────────
    months_summary: Dict[str, Any] = {}
    running_balance = starting_balance

    for month in MONTHS:
        total_income = sum(
            grp["total"].get(month, 0) for grp in income.values()
        )
        total_expenses = sum(
            grp["total"].get(month, 0) for grp in expenses.values()
        )
        # Investments is a special group that we track separately
        investments = expenses.get("Investments", {}).get("total", {}).get(month, 0)
        
        # actual_expenses are the "consumption" expenses
        actual_expenses = total_expenses - investments
        
        # net_savings is the "savings amount" (Income - Consumption)
        # This is what most users want to see as their "savings"
        net_savings = total_income - actual_expenses
        
        # cash_surplus is the residual cash (Income - All Outflows)
        # This is what updates the bank account balance
        cash_surplus = total_income - total_expenses
        
        running_balance += cash_surplus
        
        months_summary[month] = {
            "Income":           total_income,
            "Expenses":         total_expenses,
            "Investments":      investments,
            "Actual Expenses":  actual_expenses,
            "Net savings":      net_savings,
            "Cash surplus":     cash_surplus,
            "Ending balance":   running_balance,
        }

    return {
        "year":              year_str,
        "starting_balance":  starting_balance,
        "months":            months_summary,
        "income":            income,
        "expenses":          expenses,
        "assets":            assets,
    }


def get_all_time_stats() -> Dict[str, Any]:
    """
    Aggregate stats across all available years.
    Used by /stats (no year filter).
    """
    totals = {
        "total_income":   0.0,
        "total_expenses": 0.0,
        "investments":    0.0,
        "net_savings":    0.0,
        "transaction_count": 0,
        "period":         "All-Time",
    }
    
    all_years = sorted(SHEET_IDS.keys())
    
    for year in all_years:
        try:
            data = get_year_data(year)
            for m in MONTHS:
                md = data["months"][m]
                if md["Income"] > 0 or md["Expenses"] > 0:
                    totals["transaction_count"] += 1
                totals["total_income"]   += md["Income"]
                totals["total_expenses"] += md["Expenses"]
                totals["investments"]    += md["Investments"]
                # net_savings here is (Income - Actual Expenses)
                totals["net_savings"]    += md["Net savings"]
        except Exception as e:
            logger.exception(f"Failed to fetch or parse data for year {year}")

    # Bank Balance is the cash residual at the end of the latest tracked year
    try:
        latest_year = all_years[-1]
        latest_data = get_year_data(latest_year)
        # Use December to match the user's expected "880k" value which is the year-end balance
        totals["bank_balance"] = latest_data["months"]["Dec"]["Ending balance"]
    except Exception as e:
        logger.error(f"Failed to determine current bank balance: {e}")
        # Fallback to cumulative cash surplus
        totals["bank_balance"] = totals["total_income"] - totals["total_expenses"]

    totals["actual_expenses"] = totals["total_expenses"] - totals["investments"]
    return totals


# ── Standalone test ───────────────────────────────────────────────────────────
if __name__ == "__main__":
    import json
    print("Testing sheet_parser for year 2025...")
    data = get_year_data("2025")
    # Print summary only for brevity
    print("\n=== Monthly Summary ===")
    for month, md in data["months"].items():
        if md["Income"] > 0 or md["Expenses"] > 0:
            print(f"{month:>4}: Income={md['Income']:>12,.0f}  "
                  f"Expenses={md['Expenses']:>12,.0f}  "
                  f"Invest={md['Investments']:>10,.0f}  "
                  f"Net={md['Net savings']:>10,.0f}  "
                  f"Balance={md['Ending balance']:>12,.0f}")

    print(f"\nStarting Balance: ₹{data['starting_balance']:,.2f}")
    print(f"\nIncome Groups: {list(data['income'].keys())}")
    print(f"Expense Groups: {list(data['expenses'].keys())}")
    print(f"Assets: {[a['name'] for a in data['assets']]}")
