import os
import datetime as dt
import gspread
from google.oauth2.service_account import Credentials
from sqlalchemy.orm import Session
from sqlalchemy import func

from models import DailySale, Branch, MenuItem, DailyExpense

SCOPE = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]


def _get_client():
    creds_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if not creds_path or not os.path.exists(creds_path):
        raise RuntimeError("GOOGLE_APPLICATION_CREDENTIALS not set or file missing")
    creds = Credentials.from_service_account_file(creds_path, scopes=SCOPE)
    return gspread.authorize(creds)


def _open_sheet():
    client = _get_client()
    spreadsheet_id = os.getenv("GOOGLE_SHEETS_SPREADSHEET_ID")
    if not spreadsheet_id:
        raise RuntimeError("GOOGLE_SHEETS_SPREADSHEET_ID not set")
    return client.open_by_key(spreadsheet_id)


def _get_or_create_ws(sh, title: str, cols: int = 9):
    try:
        return sh.worksheet(title)
    except gspread.exceptions.WorksheetNotFound:
        return sh.add_worksheet(title=title, rows=2000, cols=cols)


def _replace_data_for_date(ws, target_date_iso: str, new_rows: list[list], headers: list[str]):
    """
    Efficiently replace data for a specific date using batch operations.
    This minimizes API calls by:
    1. Reading all data once
    2. Filtering out old date rows
    3. Writing everything back in one update
    """
    try:
        # Read all existing data (including header)
        all_data = ws.get_all_values()
    except Exception:
        all_data = []
    
    # Ensure we have headers
    if not all_data or all_data[0] != headers:
        # Keep existing data if any, but update header
        if all_data and all_data[0] != headers:
            existing_data = all_data[1:] if len(all_data) > 1 else []
        else:
            existing_data = all_data[1:] if len(all_data) > 1 else []
        all_data = [headers] + existing_data
    
    # Filter out rows matching the target date (column A / index 0)
    filtered_rows = [all_data[0]]  # Keep header
    for row in all_data[1:]:
        if len(row) > 0 and row[0] != target_date_iso:
            filtered_rows.append(row)
    
    # Add new rows
    filtered_rows.extend(new_rows)
    
    # Clear and update in one batch operation
    if filtered_rows:
        ws.clear()
        ws.update(f'A1:{chr(ord("A") + len(headers) - 1)}{len(filtered_rows)}', 
                 filtered_rows, value_input_option="USER_ENTERED")


def append_sales_rows(rows: list[list], ws_title: str):
    """Append rows without date checking - use for incremental updates"""
    sh = _open_sheet()
    ws = _get_or_create_ws(sh, ws_title, cols=7)
    if rows:
        ws.append_rows(rows, value_input_option="USER_ENTERED")


def append_expense_rows(rows: list[list], ws_title: str):
    """Append rows without date checking - use for incremental updates"""
    sh = _open_sheet()
    ws = _get_or_create_ws(sh, ws_title, cols=9)
    if rows:
        ws.append_rows(rows, value_input_option="USER_ENTERED")


def export_day(db: Session, target_date: dt.date, branch_id: int | None = None):
    """
    Export sales and expenses for a given date to Google Sheets.
    Optimized to minimize API calls and avoid rate limits.
    """
    sh = _open_sheet()
    target_iso = target_date.isoformat()

    # Define headers
    headers_sales = [
        "date", "branch_id", "branch_name", "menu_item_id", 
        "item_name", "quantity", "revenue"
    ]
    headers_exp = [
        "date", "branch_id", "category", "item_name", 
        "quantity", "unit", "unit_cost", "total_amount", "description"
    ]

    # Determine branches to export
    branches = []
    if branch_id is not None:
        b = db.query(Branch).filter(Branch.id == branch_id).first()
        if b:
            branches = [b]
    else:
        branches = db.query(Branch).all()

    # Process each branch
    for b in branches:
        sales_title = f"Sales_b{b.id}"
        exp_title = f"Expenses_b{b.id}"

        # Build SALES rows for branch
        sales_q = (
            db.query(
                DailySale.sale_date,
                DailySale.branch_id,
                Branch.name.label("branch_name"),
                DailySale.menu_item_id,
                MenuItem.name.label("item_name"),
                DailySale.quantity,
                DailySale.revenue,
            )
            .join(Branch, Branch.id == DailySale.branch_id)
            .join(MenuItem, MenuItem.id == DailySale.menu_item_id)
            .filter(func.date(DailySale.sale_date) == target_date, DailySale.branch_id == b.id)
        )
        
        sales_rows: list[list] = []
        for r in sales_q.all():
            sales_rows.append([
                target_iso,
                r.branch_id,
                r.branch_name or "",
                r.menu_item_id,
                r.item_name or "",
                int(r.quantity or 0),
                round(float(r.revenue or 0.0), 2),
            ])

        # Replace sales data using batch operation (1-2 API calls instead of N+2)
        ws_sales = _get_or_create_ws(sh, sales_title, cols=7)
        _replace_data_for_date(ws_sales, target_iso, sales_rows, headers_sales)

        # Build EXPENSE rows for branch
        expenses_q = db.query(DailyExpense).filter(
            func.date(DailyExpense.expense_date) == target_date,
            DailyExpense.branch_id == b.id,
        )
        
        expense_rows: list[list] = []
        for e in expenses_q.all():
            expense_rows.append([
                target_iso,
                e.branch_id,
                e.category or "",
                e.item_name or "",
                e.quantity if e.quantity is not None else "",
                e.unit or "",
                round(float(e.unit_cost or 0.0), 2),
                round(float(e.total_amount or 0.0), 2),
                e.description or "",
            ])

        # Replace expense data using batch operation
        ws_exp = _get_or_create_ws(sh, exp_title, cols=9)
        _replace_data_for_date(ws_exp, target_iso, expense_rows, headers_exp)
