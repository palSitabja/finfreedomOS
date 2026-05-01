import os
import json
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from logger import setup_logger

import threading
logger = setup_logger("auth")
_AUTH_LOCK = threading.Lock()

# If modifying these scopes, delete the file token.json.
SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly']

# Global cache for the service to avoid rebuilding it on every call
# We use threading.local() because httplib2 (used by the Google client) is NOT thread-safe.
_SHEETS_CACHE = threading.local()

def get_sheets_service():
    """
    Returns a Google Sheets service object, handling auth and token refresh.
    Saves refreshed tokens back to token.json to prevent continuous refresh loops.
    """
    with _AUTH_LOCK:
        return _get_sheets_service_unlocked()

def _get_sheets_service_unlocked():
    if not hasattr(_SHEETS_CACHE, 'service'):
        _SHEETS_CACHE.service = None
    
    # If we already have a valid service in this thread, reuse it
    # Note: creds.valid check is still needed if we want to be safe,
    # but build() creates a service that handles its own internal refresh if passed valid creds.
    # However, to be robust against disk-level expiry, we check here.
    
    creds = None
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
    
    # If there are no (valid) credentials available, let the user log in.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                logger.debug("Attempting to refresh expired credentials...")
                creds.refresh(Request())
                
                # CRITICAL: Save the refreshed credentials so we don't spam refresh on next call
                with open('token.json', 'w') as token:
                    token.write(creds.to_json())
                logger.info("Credentials refreshed and saved to token.json")
                
            except Exception as e:
                logger.exception(f"Failed to refresh credentials: {e}")
                creds = None # Force a new flow
        
        if not creds or not creds.valid:
            logger.info("Starting new authorization flow...")
            flow = InstalledAppFlow.from_client_secrets_file(
                'credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)
            # Save the credentials for the next run
            with open('token.json', 'w') as token:
                token.write(creds.to_json())
            logger.info("New credentials saved to token.json")

    # Only rebuild the service if we don't have one or if we just got new/refreshed creds
    import httplib2
    import google_auth_httplib2
    authorized_http = google_auth_httplib2.AuthorizedHttp(creds, http=httplib2.Http(timeout=15))
    return build('sheets', 'v4', http=authorized_http)


def reset_sheets_service():
    with _AUTH_LOCK:
        if hasattr(_SHEETS_CACHE, 'service'):
            _SHEETS_CACHE.service = None
        logger.debug("Sheets service cache cleared — will reconnect on next call.")
