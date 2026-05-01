from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
from dotenv import load_dotenv
from oracle import query_financial_data
from sheet_parser import get_year_data, get_all_time_stats, SHEET_IDS, MONTHS
from logger import setup_logger

load_dotenv()

logger = setup_logger("api")

from routers import assets, stocks, macro, news, insights, analytics, tax, fire

app = FastAPI(title="Finetra API")

app.include_router(assets.router)
app.include_router(stocks.router)
app.include_router(macro.router)
app.include_router(news.router)
app.include_router(insights.router)
app.include_router(analytics.router)
app.include_router(tax.router)
app.include_router(fire.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled exception occurred: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error. Please check server logs for details."}
    )

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[Dict[str, Any]]] = None

@app.get("/")
def read_root():
    return {"message": "Welcome to Finetra API"}

@app.get("/stats")
def get_stats(year: Optional[int] = None):
    """
    Returns high-level summary stats.
    Reads directly from Google Sheets via sheet_parser.
    """
    try:
        if year:
            data = get_year_data(str(year))
            total_income    = sum(data["months"][m]["Income"]      for m in MONTHS)
            total_expenses  = sum(data["months"][m]["Expenses"]    for m in MONTHS)
            total_invest    = sum(data["months"][m]["Investments"]  for m in MONTHS)
            net_savings     = total_income - total_expenses
            bank_balance    = data["months"]["Dec"]["Ending balance"]
            return {
                "net_savings":       net_savings,
                "bank_balance":      bank_balance,
                "total_income":      total_income,
                "total_expenses":    total_expenses,
                "investments":       total_invest,
                "actual_expenses":   total_expenses - total_invest,
                "transaction_count": sum(1 for m in MONTHS if data["months"][m]["Income"] > 0 or data["months"][m]["Expenses"] > 0),
                "period":            str(year),
            }
        else:
            stats = get_all_time_stats()
            stats["transaction_count"] = len(SHEET_IDS) * 12
            return stats
    except Exception as e:
        logger.exception(f"Error fetching stats for year {year}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
async def chat_with_oracle(request: ChatRequest):
    """Proxies the query to our RAG Oracle."""
    try:
        answer, thoughts = await query_financial_data(request.message, request.history)
        return {"answer": answer, "thoughts": thoughts}
    except Exception as e:
        logger.exception("Error in chat_with_oracle")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stats/detailed")
def get_detailed_stats(year: int):
    """
    Returns a full monthly + category breakdown for a specific year.
    Reads directly from Google Sheets via sheet_parser — no SQL.
    """
    try:
        data = get_year_data(str(year))

        # Enrich months with category/group breakdowns for the frontend
        months_enriched = {}
        for month in MONTHS:
            md = dict(data["months"][month])

            # Build groups dict: { "Income": { "Wages": 99000, ... }, "Expense": { "Parents": 1180, ... } }
            groups: Dict[str, Dict[str, float]] = {"Income": {}, "Expense": {}}
            for grp_name, grp_data in data["income"].items():
                groups["Income"][grp_name] = grp_data["total"].get(month, 0)
            for grp_name, grp_data in data["expenses"].items():
                groups["Expense"][grp_name] = grp_data["total"].get(month, 0)

            # Build categories dict: { "Income": { "Pay slip": ..., ... }, "Expense": { ... } }
            categories: Dict[str, Dict[str, float]] = {"Income": {}, "Expense": {}}
            for grp_name, grp_data in data["income"].items():
                for item_name, item_monthly in grp_data["items"].items():
                    categories["Income"][item_name] = item_monthly.get(month, 0)
            for grp_name, grp_data in data["expenses"].items():
                for item_name, item_monthly in grp_data["items"].items():
                    categories["Expense"][item_name] = item_monthly.get(month, 0)

            md["groups"]     = groups
            md["categories"] = categories
            months_enriched[month] = md

        # Calculate summary stats for the year
        total_income    = sum(data["months"][m]["Income"]      for m in MONTHS)
        total_expenses  = sum(data["months"][m]["Expenses"]    for m in MONTHS)
        total_invest    = sum(data["months"][m]["Investments"]  for m in MONTHS)
        net_savings     = total_income - total_expenses
        transaction_count = sum(1 for m in MONTHS if data["months"][m]["Income"] > 0 or data["months"][m]["Expenses"] > 0)

        return {
            "year":             year,
            "starting_balance": data["starting_balance"],
            "months":           months_enriched,
            "assets":           data["assets"],
            "summary": {
                "net_savings":       net_savings,
                "total_income":      total_income,
                "total_expenses":    total_expenses,
                "investments":       total_invest,
                "actual_expenses":   total_expenses - total_invest,
                "transaction_count": transaction_count,
                "period":            str(year),
            }
        }
    except Exception as e:
        logger.exception(f"Error fetching detailed stats for year {year}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
