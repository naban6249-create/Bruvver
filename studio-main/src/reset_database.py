import os
from database import engine
from models import Base

DB_FILE = "coffee_shop.db"

def reset_database():
    """
    Deletes the existing database file and creates a new one
    based on the current models.
    """
    print("--- Starting Database Reset ---")
    
    # 1. Delete the existing database file if it exists
    if os.path.exists(DB_FILE):
        try:
            os.remove(DB_FILE)
            print(f"✅ Successfully deleted old database file: {DB_FILE}")
        except OSError as e:
            print(f"❌ Error deleting database file: {e}")
            print("Please check file permissions and close any programs using the database.")
            return
    else:
        print("ℹ️  No old database file found to delete.")

    # 2. Create new tables based on the models
    try:
        print("⌛ Creating new tables...")
        Base.metadata.create_all(bind=engine)
        print("✅ Successfully created new tables.")
    except Exception as e:
        print(f"❌ Error creating new tables: {e}")
        return
        
    print("--- Database Reset Complete ---")
    print("You can now start the main application.")

if __name__ == "__main__":
    reset_database()