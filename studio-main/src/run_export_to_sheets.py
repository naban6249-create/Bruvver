import argparse
import os
import sys
import datetime as dt
from dotenv import load_dotenv

# Ensure local imports resolve when executed from this directory
sys.path.append(os.path.dirname(__file__))

from database import get_database  # type: ignore
from sheets_exporter import export_day  # type: ignore


def main():
    parser = argparse.ArgumentParser(description="Export daily sales & expenses to Google Sheets (per-branch tabs)")
    parser.add_argument("--date", required=False, help="Date to export in YYYY-MM-DD. Defaults to yesterday.")
    parser.add_argument("--branch", required=False, type=int, help="Optional branch_id. If omitted, exports all branches.")
    args = parser.parse_args()

    load_dotenv()

    # Resolve date
    if args.date:
        try:
            target_date = dt.datetime.strptime(args.date, "%Y-%m-%d").date()
        except ValueError:
            print("Invalid --date. Use YYYY-MM-DD.")
            sys.exit(1)
    else:
        target_date = dt.date.today() - dt.timedelta(days=1)

    db = next(get_database())
    try:
        export_day(db, target_date, branch_id=args.branch)
        print(f"Export completed for {target_date.isoformat()} (branch: {args.branch if args.branch is not None else 'ALL'})")
    finally:
        db.close()


if __name__ == "__main__":
    main()
