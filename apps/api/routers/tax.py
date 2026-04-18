from fastapi import APIRouter, UploadFile, File, HTTPException
import os
import shutil
from typing import Dict, Any, List
from tax_processor import extract_text_from_pdf, parse_tax_document, save_parsed_data, get_latest_tax_profile
from capital_gains_processor import parse_mf_capital_gains, parse_stocks_capital_gains, save_gains_data, get_aggregated_gains
from sheet_parser import get_year_data
from routers.stocks import get_stocks
import datetime

router = APIRouter(prefix="/tax", tags=["tax"])

UPLOAD_DIR = "uploads/tax_docs"

def calculate_tax_new_regime(taxable_income: float) -> float:
    """FY 2024-25 New Regime slabs after Budget 2024 (75k Std Ded)."""
    # Standard Deduction
    income = max(0, taxable_income - 75000)
    
    # Rebate u/s 87A: If total income <= 7L, tax is nil
    if income <= 700000:
        return 0
    
    tax = 0
    # Slabs: 3L(0%), 3-7(5%), 7-10(10%), 10-12(15%), 12-15(20%), 15+(30%)
    if income > 1500000:
        tax += (income - 1500000) * 0.30
        income = 1500000
    if income > 1200000:
        tax += (income - 1200000) * 0.20
        income = 1200000
    if income > 1000000:
        tax += (income - 1000000) * 0.15
        income = 1000000
    if income > 700000:
        tax += (income - 700000) * 0.10
        income = 700000
    if income > 300000:
        tax += (income - 300000) * 0.05
    
    return tax * 1.04 # 4% Cess

def calculate_tax_old_regime(gross_income: float, deductions: float) -> float:
    """FY 2024-25 Old Regime slabs (50k Std Ded)."""
    # Standard Deduction + Individual Deductions (80C, 80D etc)
    taxable_income = max(0, gross_income - 50000 - deductions)
    
    # Rebate u/s 87A: If total income <= 5L, tax is nil
    if taxable_income <= 500000:
        return 0
        
    tax = 0
    income = taxable_income
    if income > 1000000:
        tax += (income - 1000000) * 0.30
        income = 1000000
    if income > 500000:
        tax += (income - 500000) * 0.20
        income = 500000
    if income > 250000:
        tax += (income - 250000) * 0.05
        
    return tax * 1.04 # 4% Cess

@router.post("/upload")
async def upload_tax_document(file: UploadFile = File(...)):
    """Handles PDF (Form 16) or XLSX (Capital Gains) upload."""
    ext = file.filename.split('.')[-1].lower()
    if ext not in ["pdf", "xlsx"]:
        raise HTTPException(status_code=400, detail="Only PDF and XLSX files are supported.")
        
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        if ext == "pdf":
            # Form 16 Logic
            text = extract_text_from_pdf(file_path)
            parsed_data = parse_tax_document(text)
            save_parsed_data(file.filename, parsed_data)
        else:
            # Capital Gains Logic (XLSX)
            # Detect type by filename or content (heuristic)
            if "Mutual" in file.filename or "MF" in file.filename:
                parsed_data = parse_mf_capital_gains(file_path)
            else:
                parsed_data = parse_stocks_capital_gains(file_path)
            
            save_gains_data(file.filename, parsed_data)
        
        return {
            "message": f"{file.filename} uploaded and parsed successfully",
            "filename": file.filename,
            "parsed_data": parsed_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Parsing failed: {str(e)}")

@router.get("/summary")
def get_tax_summary():
    """Aggregates data from Sheet + latest Doc + Capital Gains reports."""
    # 1. Get Spreadsheet baseline
    income_wages = 1500000 

    # 2. Get Form 16 Data
    doc_profile = get_latest_tax_profile()
    
    # 3. Get Capital Gains Data
    gains = get_aggregated_gains()
    
    if doc_profile:
        gross = doc_profile.get("gross_salary") or income_wages
        ded_80c = min(150000, doc_profile.get("deductions_80c", 0))
        ded_80d = doc_profile.get("deductions_80d", 0)
        hra = doc_profile.get("hra_exemption", 0)
        other = doc_profile.get("other_deductions", 0)
    else:
        gross = income_wages
        ded_80c = 0
        ded_80d = 0
        hra = 0
        other = 0

    # Include Dividends in Gross (subject to slab rates)
    gross_total = gross + gains['total_dividend']
    total_deductions = ded_80c + ded_80d + hra + other
    
    # New vs Old Liability (Base on Salary + Dividends)
    tax_new = calculate_tax_new_regime(gross_total)
    tax_old = calculate_tax_old_regime(gross_total, total_deductions)
    
    # 4. Capital Gains Tax Logic (July 2024 Rules)
    # STCG: 20%
    stcg_tax = gains['total_stcg'] * 0.20
    # LTCG: 12.5% on gains exceeding 1.25L
    taxable_ltcg = max(0, gains['total_ltcg'] - 125000)
    ltcg_tax = taxable_ltcg * 0.125
    
    cg_tax_total = (stcg_tax + ltcg_tax) * 1.04 # 4% Cess
    
    # 5. Tax-Loss Harvesting Recommendations
    harvesting = []
    try:
        holdings = get_stocks()
        # Find stocks with unrealized losses
        loss_making = [s for s in holdings if s['gain_loss'] < 0]
        # Sort by largest absolute loss
        loss_making.sort(key=lambda x: x['gain_loss'])
        
        for s in loss_making[:3]:
            harvesting.append({
                "ticker": s['ticker'],
                "name": s['name'],
                "unrealized_loss": round(abs(s['gain_loss']), 2),
                "potential_tax_saving": round(abs(s['gain_loss']) * 0.20, 2) # Assuming STCG offset
            })
    except:
        pass

    # 6. Collect Processed Files List
    processed_files = [f for f in os.listdir(UPLOAD_DIR) if f.endswith(".pdf") or f.endswith(".xlsx")]

    return {
        "income_details": {
            "gross_salary": gross,
            "dividends": gains['total_dividend'],
            "is_from_document": doc_profile is not None
        },
        "processed_files": processed_files,
        "deductions": {
            "total": total_deductions,
            "breakdown": {"80c": ded_80c, "80d": ded_80d, "hra": hra, "other": other}
        },
        "capital_gains": {
            "realized_stcg": gains['total_stcg'],
            "realized_ltcg": gains['total_ltcg'],
            "estimated_tax": round(cg_tax_total, 2)
        },
        "regimes": {
            "new": {
                "tax_liability": round(tax_new + cg_tax_total, 2),
                "effective_rate": round(((tax_new + cg_tax_total) / (gross_total + gains['total_stcg'] + gains['total_ltcg']) * 100), 2) if gross_total > 0 else 0
            },
            "old": {
                "tax_liability": round(tax_old + cg_tax_total, 2),
                "effective_rate": round(((tax_old + cg_tax_total) / (gross_total + gains['total_stcg'] + gains['total_ltcg']) * 100), 2) if gross_total > 0 else 0
            }
        },
        "harvesting_recommendations": harvesting,
        "recommendation": "New Regime" if tax_new < tax_old else "Old Regime",
        "potential_savings": round(abs(tax_new - tax_old), 2)
    }
