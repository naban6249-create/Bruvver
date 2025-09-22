from sqlalchemy import text
from database import engine
import time

def normalize_permission_levels(retries=5, delay_sec=1.0):
    try:
        for attempt in range(1, retries + 1):
            try:
                with engine.connect() as conn:
                    # help SQLite wait for locks
                    conn.exec_driver_sql("PRAGMA busy_timeout=5000")
                    # normalize values
                    conn.execute(text("""
                        UPDATE user_branch_permissions
                        SET permission_level = 'view_only'
                        WHERE permission_level = 'VIEW_ONLY'
                    """))
                    conn.execute(text("""
                        UPDATE user_branch_permissions
                        SET permission_level = 'full_access'
                        WHERE permission_level = 'FULL_ACCESS'
                    """))
                    conn.execute(text("""
                        UPDATE user_branch_permissions
                        SET permission_level = 'view_only'
                        WHERE permission_level NOT IN ('view_only','full_access') OR permission_level IS NULL
                    """))
                    conn.commit()

                    # verify
                    result = conn.execute(text("SELECT DISTINCT permission_level FROM user_branch_permissions"))
                    final_values = [row[0] for row in result.fetchall()]
                    print(f"Updated permission levels: {final_values}")
                    print("✅ Permission levels normalized successfully!")
                    print("🔄 Please restart your FastAPI server for changes to take effect.")
                    return
            except Exception as e:
                if "database is locked" in str(e).lower() and attempt < retries:
                    print(f"DB locked (attempt {attempt}/{retries}). Retrying in {delay_sec}s...")
                    time.sleep(delay_sec)
                    continue
                raise
    except Exception as e:
        print(f"❌ Error normalizing permission levels: {e}")
        raise

if __name__ == "__main__":
    normalize_permission_levels()