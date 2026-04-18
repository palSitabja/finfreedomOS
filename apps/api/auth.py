import os
import json
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from logger import setup_logger

logger = setup_logger("auth")

# If modifying these scopes, delete the file token.json.
SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly']

# Global cache for the service to avoid rebuilding it on every call
_SHEETS_SERVICE = None

def get_sheets_service():
    """
    Returns a Google Sheets service object, handling auth and token refresh.
    Saves refreshed tokens back to token.json to prevent continuous refresh loops.
    """
    global _SHEETS_SERVICE
    
    # If we already have a valid service, reuse it
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

    # If we already have a valid service, reuse it
    if _SHEETS_SERVICE is not None and creds and creds.valid:
        return _SHEETS_SERVICE

    # Only rebuild the service if we don't have one or if we just got new/refreshed creds
    _SHEETS_SERVICE = build('sheets', 'v4', credentials=creds)
    return _SHEETS_SERVICE
