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


def _clear_rows_for_date(ws, target_date_iso: str):
    # Read first column, find rows (>=2) matching date, delete bottom-up
    col_a = ws.col_values(1)
    to_delete = []
    for idx, val in enumerate(col_a, start=1):
        if idx == 1:
            continue  # skip header
        if val == target_date_iso:
            to_delete.append(idx)
    for row_idx in reversed(to_delete):
        try:
            ws.delete_rows(row_idx)
        except Exception:
            pass


def _ensure_headers(ws, is_sales: bool):
    headers_sales = [
        "date", "branch_id", "branch_name", "menu_item_id", "item_name", "quantity", "revenue"
    ]
    headers_exp = [
        "date", "branch_id", "category", "item_name", "quantity", "unit", "unit_cost", "total_amount", "description"
    ]
    expected = headers_sales if is_sales else headers_exp
    try:
        row1 = ws.row_values(1)
    except Exception:
        row1 = []
    if row1[:len(expected)] != expected:
        ws.update(f"A1:{chr(ord('A') + len(expected) - 1)}1", [expected])


def append_sales_rows(rows: list[list], ws_title: str):
    sh = _open_sheet()
    ws = _get_or_create_ws(sh, ws_title, cols=7)
    if rows:
        ws.append_rows(rows, value_input_option="USER_ENTERED")


def append_expense_rows(rows: list[list], ws_title: str):
    sh = _open_sheet()
    ws = _get_or_create_ws(sh, ws_title, cols=9)
    if rows:
        ws.append_rows(rows, value_input_option="USER_ENTERED")


def export_day(db: Session, target_date: dt.date, branch_id: int | None = None):
    """Export sales and expenses for a given date to Google Sheets, per-branch tabs with idempotency."""
    sh = _open_sheet()
    target_iso = target_date.isoformat()

    # Determine branches to export
    branches = []
    if branch_id is not None:
        b = db.query(Branch).filter(Branch.id == branch_id).first()
        if b:
            branches = [b]
    else:
        branches = db.query(Branch).all()

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

        # Clear existing rows for date, then append
        ws_sales = _get_or_create_ws(sh, sales_title, cols=7)
        _ensure_headers(ws_sales, is_sales=True)
        _clear_rows_for_date(ws_sales, target_iso)
        if sales_rows:
            ws_sales.append_rows(sales_rows, value_input_option="USER_ENTERED")

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

        ws_exp = _get_or_create_ws(sh, exp_title, cols=9)
        _ensure_headers(ws_exp, is_sales=False)
        _clear_rows_for_date(ws_exp, target_iso)
        if expense_rows:
            ws_exp.append_rows(expense_rows, value_input_option="USER_ENTERED")
