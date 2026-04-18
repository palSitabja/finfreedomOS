from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from routers.stocks import get_stocks
from sheet_parser import get_year_data, get_all_time_stats
import datetime

router = APIRouter(prefix="/fire", tags=["fire"])

class GoalBuffer(BaseModel):
    name: str
    amount: float
    years_from_now: int

class FIREProjectionRequest(BaseModel):
    expected_return: float = 10.0 # 10% annual
    inflation_rate: float = 6.0   # 6% annual
    monthly_savings: Optional[float] = None
    goal_buffers: List[GoalBuffer] = []
    current_age: int = 30
    retirement_age: Optional[int] = None
    expected_corpus: Optional[float] = None
    insurance_cover: float = 0.0
    enable_stress_test: bool = False

@router.get("/status")
def get_fire_status():
    """Calculates current FI progress based on corpus and expenses."""
    # 1. Total Corpus
    # Stocks + Spreadsheet Assets
    stocks = get_stocks()
    stock_value = sum(s['current_value'] for s in stocks)
    
    try:
        year_data = get_year_data("2026")
        asset_sum = sum(a['current_amount'] for a in year_data.get('assets', []))
        # Actual Expenses (Total - Investments)
        # We'll take the average monthly from 2026 data
        recent_months = list(year_data['months'].values())
        valid_months = [m for m in recent_months if m['Actual Expenses'] > 0]
        if valid_months:
            avg_monthly_expenses = sum(m['Actual Expenses'] for m in valid_months) / len(valid_months)
        else:
            avg_monthly_expenses = 100000 # Fallback
            
        current_savings = sum(m['Net savings'] for m in valid_months) / len(valid_months) if valid_months else 0
    except:
        asset_sum = 0
        avg_monthly_expenses = 100000
        current_savings = 50000
        
    total_corpus = stock_value + asset_sum
    annual_expenses = avg_monthly_expenses * 12
    
    fi_number_25x = annual_expenses * 25
    fi_number_33x = annual_expenses * 33
    
    return {
        "current_corpus": round(total_corpus, 2),
        "annual_expenses": round(annual_expenses, 2),
        "avg_monthly_savings": round(current_savings, 2),
        "fi_number_25x": round(fi_number_25x, 2),
        "fi_number_33x": round(fi_number_33x, 2),
        "progress_pct": round((total_corpus / fi_number_25x * 100), 2) if fi_number_25x > 0 else 0,
        "status": "On Track"
    }

@router.post("/projection")
def get_fire_projection(req: FIREProjectionRequest):
    """Generates a year-by-year runway projection."""
    status = get_fire_status()
    corpus = status['current_corpus']
    annual_expenses = status['annual_expenses']
    savings = req.monthly_savings if req.monthly_savings is not None else status['avg_monthly_savings']
    annual_savings = savings * 12
    
    projection = []
    current_year = datetime.datetime.now().year
    
    # 40-year projection or until age 100
    r = req.expected_return / 100
    i = req.inflation_rate / 100
    
    fi_year = None
    fi_age = None
    
    # Stress test parameters
    market_crash_year = 5 if req.enable_stress_test else -1
    medical_emergency_year = 10 if req.enable_stress_test else -1
    medical_cost = 1500000 # 15L medical emergency
    
    for year_idx in range(60):
        year = current_year + year_idx
        age = req.current_age + year_idx
        
        is_retired = False
        if req.retirement_age is not None and age >= req.retirement_age:
            is_retired = True
        elif fi_year is not None:
            is_retired = True # Assume retired once FI if no target age provided
            
        # Market growth/crash
        actual_r = r
        if year_idx == market_crash_year:
            actual_r = -0.20 # 20% market crash
            
        # Add savings and grow corpus
        if not is_retired:
            corpus = (corpus + annual_savings) * (1 + actual_r)
        else:
            # Post-FI: Withdraw expenses from corpus
            corpus = (corpus - annual_expenses) * (1 + actual_r)
            
        # Update annual expenses with inflation
        annual_expenses *= (1 + i)
        
        # Check for one-time buffers
        for buffer in req.goal_buffers:
            if buffer.years_from_now == year_idx:
                corpus -= buffer.amount
                
        # Medical emergency shock
        if year_idx == medical_emergency_year:
            out_of_pocket = max(0, medical_cost - req.insurance_cover)
            corpus -= out_of_pocket
        
        # Check for FI milestone
        fi_needed = req.expected_corpus if req.expected_corpus is not None and req.expected_corpus > 0 else annual_expenses * 25
        if fi_year is None and corpus >= fi_needed:
            fi_year = year
            fi_age = age
            
        projection.append({
            "year": year,
            "age": age,
            "corpus": round(corpus, 2),
            "expenses": round(annual_expenses, 2),
            "target": round(fi_needed, 2),
            "is_fi": corpus >= fi_needed,
            "event": "Market Crash (-20%)" if year_idx == market_crash_year else 
                     f"Medical Emergency (Paid: ₹{(max(0, medical_cost - req.insurance_cover)):,.0f})" if year_idx == medical_emergency_year else None
        })
        
        if corpus < 0 or age >= 100:
            break
            
    return {
        "timeline": projection,
        "fi_year": fi_year,
        "fi_age": fi_age,
        "years_to_fi": fi_year - current_year if fi_year else None
    }
