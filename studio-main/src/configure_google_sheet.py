import os
import sys
import gspread
from google.oauth2.service_account import Credentials
from gspread_formatting import set_frozen
from dotenv import load_dotenv

try:
    from googleapiclient.discovery import build
    from googleapiclient.errors import HttpError
    HAS_GOOGLE_API_CLIENT = True
except Exception:
    HAS_GOOGLE_API_CLIENT = False

SA_SCOPE = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]

SA_PATH_ENV = "GOOGLE_APPLICATION_CREDENTIALS"
SPREADSHEET_ID_ENV = "GOOGLE_SHEETS_SPREADSHEET_ID"
SALES_TAB_ENV = "GOOGLE_SHEETS_SALES_TAB"
EXPENSES_TAB_ENV = "GOOGLE_SHEETS_EXPENSES_TAB"

SALES_HEADERS = [
    "date", "branch_id", "branch_name", "menu_item_id", "item_name", "quantity", "revenue"
]

EXPENSES_HEADERS = [
    "date", "branch_id", "category", "item_name", "quantity", "unit", "unit_cost", "total_amount", "description"
]

def get_clients():
    # Load .env so script can read env vars without manual export
    load_dotenv()
    sa_path = os.getenv(SA_PATH_ENV)
    if not sa_path or not os.path.exists(sa_path):
        raise RuntimeError(f"{SA_PATH_ENV} not set or file missing: {sa_path}")
    creds = Credentials.from_service_account_file(sa_path, scopes=SA_SCOPE)
    gclient = gspread.authorize(creds)
    sheets = None
    if HAS_GOOGLE_API_CLIENT:
        # Lazily import/build to avoid NameError when lib is missing
        try:
            from googleapiclient.discovery import build as gbuild
            sheets = gbuild("sheets", "v4", credentials=creds)
        except Exception:
            sheets = None
    return gclient, sheets


def get_or_create_worksheet(spreadsheet, title: str, cols: int):
    try:
        return spreadsheet.worksheet(title)
    except gspread.exceptions.WorksheetNotFound:
        return spreadsheet.add_worksheet(title=title, rows=1000, cols=cols)


def ensure_headers(ws, headers):
    # Write headers in row 1 only if empty/mismatched
    values = ws.get("1:1") or [[]]
    current = values[0] if values else []
    if current[:len(headers)] != headers:
        ws.update(f"A1:{chr(ord('A') + len(headers) - 1)}1", [headers])


def apply_freeze(ws):
    # Freeze first row
    set_frozen(ws, rows=1, cols=0)


def apply_formats(spreadsheet_id: str, sheet_id: int, is_sales: bool):
    # Number formats via BatchUpdate; skip if google-api-python-client not available
    if not HAS_GOOGLE_API_CLIENT:
        print("google-api-python-client not installed; skipping advanced formats/resize/protection.")
        return
    # Build service using service account credentials directly (gspread client has no 'auth')
    load_dotenv()
    sa_path = os.getenv(SA_PATH_ENV)
    creds = Credentials.from_service_account_file(sa_path, scopes=SA_SCOPE)
    service = build("sheets", "v4", credentials=creds)
    requests = []

    # Set number formats
    # Sales: quantity = col F (index 5), revenue = col G (index 6)
    # Expenses: quantity = col E (4), unit_cost = col G (6), total_amount = col H (7)
    def number_format_request(column_index: int, type_: str, pattern: str):
        return {
            "repeatCell": {
                "range": {
                    "sheetId": sheet_id,
                    "startRowIndex": 1,  # below header
                    "startColumnIndex": column_index,
                    "endColumnIndex": column_index + 1,
                },
                "cell": {
                    "userEnteredFormat": {
                        "numberFormat": {
                            "type": type_,
                            "pattern": pattern,
                        }
                    }
                },
                "fields": "userEnteredFormat.numberFormat"
            }
        }

    if is_sales:
        # quantity as integer
        requests.append(number_format_request(5, "NUMBER", "0"))
        # revenue INR currency
        requests.append(number_format_request(6, "CURRENCY", "[$₹-hi-IN] #,##0.00"))
    else:
        # quantity as integer
        requests.append(number_format_request(4, "NUMBER", "0"))
        # unit_cost and total_amount as INR currency
        requests.append(number_format_request(6, "CURRENCY", "[$₹-hi-IN] #,##0.00"))
        requests.append(number_format_request(7, "CURRENCY", "[$₹-hi-IN] #,##0.00"))

    # Auto-resize all columns
    requests.append({
        "autoResizeDimensions": {
            "dimensions": {
                "sheetId": sheet_id,
                "dimension": "COLUMNS",
                "startIndex": 0,
            }
        }
    })

    # Protect header row (warning only so edits prompt a warning, not hard-locked)
    requests.append({
        "addProtectedRange": {
            "protectedRange": {
                "range": {
                    "sheetId": sheet_id,
                    "startRowIndex": 0,
                    "endRowIndex": 1
                },
                "description": "Header row",
                "warningOnly": True
            }
        }
    })

    try:
        service.spreadsheets().batchUpdate(spreadsheetId=spreadsheet_id, body={"requests": requests}).execute()
    except HttpError as e:
        print(f"Warning: formatting/protection request failed: {e}")


def main():
    spreadsheet_id = os.getenv(SPREADSHEET_ID_ENV)
    if not spreadsheet_id:
        raise RuntimeError(f"{SPREADSHEET_ID_ENV} not set")

    sales_tab = os.getenv(SALES_TAB_ENV, "Sales")
    expenses_tab = os.getenv(EXPENSES_TAB_ENV, "Expenses")

    gclient, _ = get_clients()
    sh = gclient.open_by_key(spreadsheet_id)

    # Sales
    ws_sales = get_or_create_worksheet(sh, sales_tab, cols=len(SALES_HEADERS))
    ensure_headers(ws_sales, SALES_HEADERS)
    apply_freeze(ws_sales)
    apply_formats(spreadsheet_id, ws_sales.id, is_sales=True)

    # Expenses
    ws_exp = get_or_create_worksheet(sh, expenses_tab, cols=len(EXPENSES_HEADERS))
    ensure_headers(ws_exp, EXPENSES_HEADERS)
    apply_freeze(ws_exp)
    apply_formats(spreadsheet_id, ws_exp.id, is_sales=False)

    print("Google Sheet configured: headers set, header row frozen, number formats applied, columns auto-resized, header protected (warning-only).")


if __name__ == "__main__":
    main()
