import time
from typing import List, Dict, Any, Optional
from auth import get_sheets_service, reset_sheets_service
from logger import setup_logger

logger = setup_logger("sheets")

_DEFAULT_TIMEOUT = 15  # seconds
_MAX_RETRIES = 2
_RETRY_DELAY = 2.0


def fetch_sheet_data(
    spreadsheet_id: str,
    range_name: str,
    retries: int = _MAX_RETRIES,
) -> List[List[Any]]:
    """
    Fetches raw data from a specified range in a Google Sheet.

    Retries on transient network errors (timeout, SSL record-layer failure,
    broken pipe) and resets the cached service object so the next attempt
    opens a fresh connection instead of reusing a dead one.
    """
    last_err: Optional[Exception] = None

    for attempt in range(1, retries + 2):  # retries + 1 total attempts
        try:
            service = get_sheets_service()
            result = (
                service.spreadsheets()
                .values()
                .get(spreadsheetId=spreadsheet_id, range=range_name)
                .execute(num_retries=0)  # we handle retries ourselves
            )
            values = result.get("values", [])
            if not values:
                logger.warning(f"No data found in range: {range_name}")
            return values

        except TimeoutError as err:
            last_err = err
            logger.warning(
                f"[attempt {attempt}] Timeout fetching '{range_name}': {err}. "
                "Resetting service and retrying..."
            )
            reset_sheets_service()

        except Exception as err:
            err_str = str(err)
            # detect if it's a transient connection/SSL issue
            is_connection_err = any(kw in err_str for kw in ("SSL", "record layer", "BrokenPipe", "Connection reset", "EOF"))
            
            if attempt < retries + 1 and is_connection_err:
                logger.warning(f"[attempt {attempt}] Connection issue: {err_str}. Retrying in {_RETRY_DELAY}s...")
                reset_sheets_service()
                time.sleep(_RETRY_DELAY)
                continue
            
            logger.error(f"Error fetching {range_name}: {err_str}")
            raise err

        if attempt <= retries:
            time.sleep(_RETRY_DELAY * attempt)

    logger.error(f"All {retries + 1} attempt(s) failed for {spreadsheet_id} range '{range_name}': {last_err}")
    if last_err:
        raise last_err
    raise Exception(f"Failed to fetch {range_name} after {retries + 1} attempts")


def get_spreadsheet_metadata(spreadsheet_id: str) -> Optional[Dict]:
    """
    Retrieves metadata about the spreadsheet (titles of sheets, etc.).
    """
    try:
        service = get_sheets_service()
        metadata = service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
        return metadata
    except Exception as err:
        logger.exception(f"Failed to fetch metadata for spreadsheet {spreadsheet_id}")
        return None
