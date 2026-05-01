from typing import Dict, Any, List
from sheet_parser import _fetch_range, _parse_number, _extract_monthly, logger, MONTHS

def _parse_tab_dynamic(
    spreadsheet_id: str,
    tab_name: str,
    fetch_range_end: str = "Q",
) -> Dict[str, Any]:
    range_str = f"'{tab_name}'!A1:{fetch_range_end}300"
    raw = _fetch_range(spreadsheet_id, range_str)
    
    result = {}
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
            if item_name in ("Monthly totals:", "Income", "Expenses", "Summary", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"):
                continue
            result[current_group]["items"][item_name] = _extract_monthly(row)
            
    return result

def _parse_assets_dynamic(spreadsheet_id: str) -> List[Dict[str, Any]]:
    raw = _fetch_range(spreadsheet_id, "Assets!A3:K200")
    if not raw:
        return []

    assets = []
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

if __name__ == "__main__":
    from sheet_parser import SHEET_IDS
    sid = SHEET_IDS["2025"]
    income = _parse_tab_dynamic(sid, "Income")
    expenses = _parse_tab_dynamic(sid, "Expenses")
    assets = _parse_assets_dynamic(sid)
    
    print("Income Groups:", list(income.keys()))
    print("Expenses Groups:", list(expenses.keys()))
    print("Assets:", [a["name"] for a in assets])
