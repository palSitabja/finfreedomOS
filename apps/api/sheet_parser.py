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
LEGACY_YEARS = {"2021", "2022", "2023"}

# ── Column constants ──────────────────────────────────────────────────────────
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

# 0-indexed: D=3 (Jan) through O=14 (Dec), P=15 (Total), Q=16 (Average)
MONTH_COL_START = 3   # Col D = Jan
MONTH_COL_END   = 14  # Col O = Dec
TOTAL_COL       = 15  # Col P
AVG_COL         = 16  # Col Q

# ── Income tab: exact row layout ─────────────────────────────────────────────
# Row numbers are 1-indexed (as shown in the spreadsheet)
INCOME_GROUPS = {
    "Wages": {
        "total_row": 3,
        "items": {
            "Pay slip":         4,
            "Internet Claim":   5,
            "Tips":             6,
            "Bonus":            7,
            "Commission":       8,
            "Other":            9,
        }
    },
    "Other": {
        "total_row": 12,
        "items": {
            "Transfer from savings": 13,
            "Interest income":       14,
            "Dividends":             15,
            "SGB Interest":          16,
            "Stock Selling":         17,
            "Gifts":                 18,
            "Refunds":               19,
            "Investment return":     20,
        }
    }
}

# ── Expenses tab: exact row layout ───────────────────────────────────────────
EXPENSE_GROUPS = {
    "Parents": {
        "total_row": 3,
        "items": {
            "Activities":   4,
            "Insurance":    5,
            "Medical":      6,
            "Gift":         7,
            "Clothing":     8,
            "Supplements":  9,
            "Other":        10,
        }
    },
    "Debt": {
        "total_row": 13,
        "items": {
            "Credit cards":  14,
            "Student loans": 15,
            "Other loans":   16,
            "Taxes":         17,
            "Other":         18,
        }
    },
    "Education": {
        "total_row": 21,
        "items": {
            "Tuition":       22,
            "Books":         23,
            "Music lessons": 24,
            "Other":         25,
        }
    },
    "Entertainment": {
        "total_row": 28,
        "items": {
            "Books":              29,
            "Concerts/shows":     30,
            "Games":              31,
            "Hobbies":            32,
            "Films":              33,
            "Music":              34,
            "Outdoor activities": 35,
            "Photography":        36,
            "Sport":              37,
            "Theatre/plays":      38,
            "Other":              39,
        }
    },
    "Everyday": {
        "total_row": 43,
        "items": {
            "Groceries":    44,
            "Restaurants":  45,
            "Clothes":      46,
            "Shoes":        47,
            "Electronics":  48,
            "Other":        49,
        }
    },
    "Gifts": {
        "total_row": 54,
        "items": {
            "Family":       55,
            "Friends":      56,
            "Other":        57,
        }
    },
    "Health/Medical": {
        "total_row": 60,
        "items": {
            "Doctor":       61,
            "Medicine":     62,
        }
    },
    "Home": {
        "total_row": 68,
        "items": {
            "Rent":              69,
            "Maintenance":       70,
            "Improvements":      71,
            "Furniture":         72,
            "Supplies":          73,
            "Garden":            74,
            "Other":             75,
        }
    },
    "Insurance": {
        "total_row": 80,
        "items": {
            "Car":          81,
            "Health":       82,
            "Life":         83,
            "Home":         84,
            "Other":        85,
        }
    },
    "Miscellaneous": {
        "total_row": 88,
        "items": {
            "Miscellaneous":                  89,
            "Calculation error adjustment":   90,
            "Other":                          91,
        }
    },
    "Technology": {
        "total_row": 94,
        "items": {
            "Software":     95,
            "Hardware":     96,
            "Apps":         97,
            "Other":        98,
        }
    },
    "Transportation": {
        "total_row": 102,
        "items": {
            "Fuel":         103,
            "Fastag":       104,
            "Service":      105,
            "Repairs":      106,
            "Taxi":         107,
            "Parking":      108,
            "Other":        109,
        }
    },
    "Travel": {
        "total_row": 112,
        "items": {
            "Hotels":       113,
            "Flights":      114,
            "Train":        115,
            "Activities":   116,
            "Food":         117,
            "Other":        118,
        }
    },
    "Utilities": {
        "total_row": 122,
        "items": {
            "Phone":        123,
            "Internet":     124,
            "Electricity":  125,
            "Water":        126,
            "Gas":          127,
            "Cable/TV":     128,
            "Other":        129,
        }
    },
    "Investments": {
        "total_row": 134,
        "items": {
            "MF SIP":       135,
            "Gold":         136,
            "Silver":       137,
            "PPF":          138,
            "Crypto":       139,
            "Stocks":       140,
            "NPS":          141,
            "EPF":          142,
            "Other":        143,
        }
    },
}

# ── Assets tab ────────────────────────────────────────────────────────────────
# Row 3 = header, rows 4-13 = data, row 14 = Total
ASSETS_RANGE = "Assets!A3:K15"


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
    groups: Dict[str, Any],
    fetch_range_end: str,
    is_legacy: bool = False,
) -> Dict[str, Any]:
    """
    Generic parser for Income and Expenses tabs.
    Fetches the full tab data and extracts each group's total + sub-items
    by hardcoded row offsets.
    Returns: { group_name: { total: {monthly}, items: { item_name: {monthly} } } }

    For legacy years (2021-2023), each group is parsed defensively:
    if a specific row is out of bounds or malformed, it falls back to zeros
    rather than crashing.
    """
    max_row = max(
        max(row_num for row_num in grp["items"].values())
        for grp in groups.values()
    )
    range_str = f"'{tab_name}'!A1:{fetch_range_end}{max_row}"
    raw = _fetch_range(spreadsheet_id, range_str)

    result: Dict[str, Any] = {}
    for group_name, group_def in groups.items():
        try:
            total_row_idx = group_def["total_row"] - 1
            group_row = raw[total_row_idx] if total_row_idx < len(raw) else []
            group_monthly = _extract_monthly(group_row)

            items: Dict[str, Dict[str, float]] = {}
            for item_name, item_row_num in group_def["items"].items():
                try:
                    item_idx = item_row_num - 1
                    item_row = raw[item_idx] if item_idx < len(raw) else []
                    items[item_name] = _extract_monthly(item_row)
                except Exception as e:
                    if is_legacy:
                        items[item_name] = {m: 0.0 for m in MONTHS}
                        items[item_name].update({"Total": 0.0, "Average": 0.0})
                    else:
                        raise

            result[group_name] = {"total": group_monthly, "items": items}
        except Exception as e:
            if is_legacy:
                logger.warning(f"Legacy year — skipping group {group_name} in {tab_name}: {e}")
                empty = {m: 0.0 for m in MONTHS}
                empty.update({"Total": 0.0, "Average": 0.0})
                result[group_name] = {"total": empty, "items": {}}
            else:
                logger.exception(f"Failed to parse group {group_name} in {tab_name}")
                raise
    return result


def _parse_setup(spreadsheet_id: str) -> float:
    """Fetch starting balance from Setup!C13."""
    raw = _fetch_range(spreadsheet_id, "Setup!C13")
    if raw and raw[0]:
        return _parse_number(raw[0][0])
    return 0.0


def _parse_assets(spreadsheet_id: str) -> List[Dict[str, Any]]:
    """
    Parse the Assets tab investment tracker.
    Columns (0-indexed from A):
      0=Name, 1=Invested Amount, 2=Current Amount,
      3=Absolute Return%, 4=XIRR%, 5=CAGR%,
      6=Start-End, 7=Holding Tenure
    Row 0 = header, rows 1-10 = data, row 11 = Total
    """
    raw = _fetch_range(spreadsheet_id, ASSETS_RANGE)
    if not raw:
        return []

    assets = []
    # Skip row 0 (header), stop before last row (Total)
    for row in raw[1:-1]:
        name = row[0] if len(row) > 0 else ""
        if not name or name.lower() == "total":
            continue
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
    is_legacy = year_str in LEGACY_YEARS

    starting_balance = _parse_setup(sid)
    income   = _parse_tab(sid, "Income",   INCOME_GROUPS,  "Q", is_legacy=is_legacy)
    expenses = _parse_tab(sid, "Expenses", EXPENSE_GROUPS, "Q", is_legacy=is_legacy)
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
        investments = expenses.get("Investments", {}).get("total", {}).get(month, 0)
        actual_expenses = total_expenses - investments     # Expense-Invest metric
        net_savings = total_income - total_expenses
        running_balance += net_savings

        months_summary[month] = {
            "Income":           total_income,
            "Expenses":         total_expenses,
            "Investments":      investments,
            "Actual Expenses":  actual_expenses,
            "Net savings":      net_savings,
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
        "period":         "All-Time",
    }
    for year in SHEET_IDS:
        try:
            data = get_year_data(year)
            for m in MONTHS:
                md = data["months"][m]
                totals["total_income"]   += md["Income"]
                totals["total_expenses"] += md["Expenses"]
                totals["investments"]    += md["Investments"]
        except Exception as e:
            logger.exception(f"Failed to fetch or parse data for year {year}")

    totals["net_savings"] = totals["total_income"] - totals["total_expenses"]
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
