from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from sheet_parser import get_year_data

router = APIRouter(prefix="/assets", tags=["assets"])

@router.get("/")
def get_assets():
    """
    Fetches the latest asset tracker from the 'Assets' tab
    of the most current sheet (2026).
    Google Sheets is the single source of truth for these rows.
    """
    try:
        data = get_year_data("2026")
        return data["assets"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
