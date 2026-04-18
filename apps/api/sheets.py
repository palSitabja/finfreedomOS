from typing import List, Dict, Any
from auth import get_sheets_service
from logger import setup_logger

logger = setup_logger("sheets")

def fetch_sheet_data(spreadsheet_id: str, range_name: str) -> List[List[Any]]:
    """
    Fetches raw data from a specified range in a Google Sheet.
    """
    try:
        service = get_sheets_service()
        sheet = service.spreadsheets()
        result = sheet.values().get(
            spreadsheetId=spreadsheet_id, range=range_name).execute()
        values = result.get('values', [])

        if not values:
            logger.warning(f"No data found in range: {range_name}")
            return []
        else:
            return values
    except Exception as err:
        logger.exception(f"Failed to fetch data from {spreadsheet_id} range {range_name}")
        return []

def get_spreadsheet_metadata(spreadsheet_id: str):
    """
    Retrieves metadata about the spreadsheet (titles of sheets, etc.).
    """
    try:
        service = get_sheets_service()
        sheet = service.spreadsheets()
        metadata = sheet.get(spreadsheetId=spreadsheet_id).execute()
        return metadata
    except Exception as err:
        logger.exception(f"Failed to fetch metadata for spreadsheet {spreadsheet_id}")
        return None
