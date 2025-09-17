# src/reset_database.py
import os
import logging
from datetime import datetime
from sqlalchemy.orm import Session
from database import engine, get_database, Base
from models import Admin, Branch, MenuItem, Ingredient, ExpenseCategory
from schemas import UserRole
from auth import get_password_hash

# --- Database File Configuration ---
DB_FILE = "coffee_shop.db"

# --- Logger Configuration ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init_db(db: Session):
    """
    Initializes the database with sample data, including new branches and workers.
    """
    try:
        # Check if branches already exist to avoid duplicates
        if db.query(Branch).count() == 0:
            logger.info("Creating sample branches...")
            
            # --- FIX: Changed branches to your new locations ---
            branch_cbe = Branch(name="Coimbatore", location="Gandhipuram")
            branch_bgl = Branch(name="Bangalore", location="Indiranagar")
            branch_main = Branch(name="Main Branch (Admin)", location="Downtown")
            
            db.add_all([branch_cbe, branch_bgl, branch_main])
            db.commit()
            
            # Refresh to get IDs
            db.refresh(branch_cbe)
            db.refresh(branch_bgl)
            db.refresh(branch_main)
            
            logger.info("Sample branches created.")
        else:
            logger.info("Branches already exist, skipping creation.")
            # Load existing branches to link to new users
            branch_cbe = db.query(Branch).filter(Branch.name == "Coimbatore").first()
            branch_bgl = db.query(Branch).filter(Branch.name == "Bangalore").first()
            
            if not branch_cbe:
                logger.warning("Could not find 'Coimbatore' branch, using first available branch.")
                branch_cbe = db.query(Branch).first()
            if not branch_bgl:
                logger.warning("Could not find 'Bangalore' branch, using second available branch.")
                branch_bgl = db.query(Branch).offset(1).first() or branch_cbe


        # Check if admin already exists
        if db.query(Admin).filter(Admin.username == "admin@test.com").count() == 0:
            logger.info("Creating default admin user...")
            admin_user = Admin(
                username="admin@test.com",
                email="admin@test.com",
                full_name="Default Admin",
                password_hash=get_password_hash("admin123"),
                role=UserRole.ADMIN, # Use Enum
                is_active=True,
                is_superuser=True,
                branch_id=branch_cbe.id  # Admin defaults to Coimbatore
            )
            db.add(admin_user)
            logger.info("Default admin user created.")
        else:
            logger.info("Admin user already exists, skipping.")

        # --- FIX: Added new worker accounts for your branches ---
        
        # Coimbatore Worker
        if db.query(Admin).filter(Admin.username == "worker_cbe@test.com").count() == 0:
            logger.info("Creating Coimbatore worker...")
            worker_cbe = Admin(
                username="worker_cbe@test.com",
                email="worker_cbe@test.com",
                full_name="Coimbatore Worker",
                password_hash=get_password_hash("worker123"),
                role=UserRole.WORKER, # Use Enum
                is_active=True,
                branch_id=branch_cbe.id # Link to Coimbatore branch
            )
            db.add(worker_cbe)
            logger.info("Coimbatore worker created.")
        else:
            logger.info("Coimbatore worker already exists, skipping.")

        # Bangalore Worker
        if db.query(Admin).filter(Admin.username == "worker_bgl@test.com").count() == 0:
            logger.info("Creating Bangalore worker...")
            worker_bgl = Admin(
                username="worker_bgl@test.com",
                email="worker_bgl@test.com",
                full_name="Bangalore Worker",
                password_hash=get_password_hash("worker123"),
                role=UserRole.WORKER, # Use Enum
                is_active=True,
                branch_id=branch_bgl.id # Link to Bangalore branch
            )
            db.add(worker_bgl)
            logger.info("Bangalore worker created.")
        else:
            logger.info("Bangalore worker already exists, skipping.")
            
        # Add sample menu items if they don't exist
        if db.query(MenuItem).count() == 0:
            logger.info("Creating sample menu items...")
            items_data = [
                {"name": "Espresso", "price": 120, "category": "Coffee", "branch_id": branch_cbe.id},
                {"name": "Cappuccino", "price": 150, "category": "Coffee", "branch_id": branch_cbe.id},
                {"name": "Filter Coffee", "price": 100, "category": "Coffee", "branch_id": branch_bgl.id},
                {"name": "Croissant", "price": 130, "category": "Pastry", "branch_id": branch_bgl.id},
                {"name": "Samosa", "price": 50, "category": "Snacks", "branch_id": branch_cbe.id},
                {"name": "Tea", "price": 80, "category": "Beverage", "branch_id": branch_bgl.id},
            ]
            for item in items_data:
                db.add(MenuItem(**item))
            logger.info("Sample menu items created.")
        else:
            logger.info("Menu items already exist, skipping.")

        # Add sample expense categories
        if db.query(ExpenseCategory).count() == 0:
            logger.info("Creating sample expense categories...")
            categories = [
                ExpenseCategory(name="Dairy", description="Milk, Cream, etc."),
                ExpenseCategory(name="Coffee Beans", description="Raw coffee beans"),
                ExpenseCategory(name="Utilities", description="Electricity, Water, Gas bills"),
                ExpenseCategory(name="Rent", description="Monthly shop rent"),
                ExpenseCategory(name="Staff Salary", description="Monthly payroll"),
                ExpenseCategory(name="Maintenance", description="Repairs and cleaning"),
                ExpenseCategory(name="Other", description="Miscellaneous expenses"),
            ]
            db.add_all(categories)
            logger.info("Sample expense categories created.")
        else:
            logger.info("Expense categories already exist, skipping.")

        db.commit()
        logger.info("✅ Sample data initialization complete.")

    except Exception as e:
        logger.exception(f"❌ Error initializing data: {e}")
        db.rollback()
    finally:
        db.close()


def reset_and_init_database():
    """
    Deletes the existing database file, creates new tables,
    and initializes it with sample data.
    """
    logger.info("--- Starting Database Reset & Initialization ---")
    
    # 1. Delete the existing database file if it exists
    if os.path.exists(DB_FILE):
        try:
            # Attempt to close any active sessions before removing
            # This is a bit of a safeguard, but manual closure is better
            engine.dispose() 
            os.remove(DB_FILE)
            logger.info(f"✅ Successfully deleted old database file: {DB_FILE}")
        except OSError as e:
            logger.error(f"❌ Error deleting database file: {e}")
            logger.error("Please check file permissions and close any programs (like DBeaver, VSCode SQLite explorer) using the database.")
            return
    else:
        logger.info("ℹ️  No old database file found to delete.")

    # 2. Create new tables based on the models
    try:
        logger.info("⌛ Creating new tables...")
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Successfully created new tables.")
    except Exception as e:
        logger.exception(f"❌ Error creating new tables: {e}")
        return
        
    # 3. Initialize with sample data
    logger.info("⌛ Initializing database with sample data...")
    db = next(get_database())
    init_db(db)
    
    logger.info("--- Database Reset & Initialization Complete ---")
    logger.info("You can now start the main application.")


if __name__ == "__main__":
    reset_and_init_database()