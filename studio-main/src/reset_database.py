# src/reset_database.py
import os
import logging
from datetime import datetime
from sqlalchemy.orm import Session
from database import engine, get_database, Base
# --- FIX: Import the new permission models ---
from models import Admin, Branch, MenuItem, ExpenseCategory, UserBranchPermission, PermissionLevel
from schemas import UserRole
from auth import get_password_hash

# --- Database File Configuration ---
DB_FILE = "coffee_shop.db"

# --- Logger Configuration ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init_db(db: Session):
    """
    Initializes the database with sample data, including new branches and workers with permissions.
    """
    try:
        # Create sample branches
        if db.query(Branch).count() == 0:
            logger.info("Creating sample branches...")
            branch_cbe = Branch(name="Coimbatore", location="Gandhipuram")
            branch_bgl = Branch(name="Bangalore", location="Indiranagar")
            db.add_all([branch_cbe, branch_bgl])
            db.commit()
            db.refresh(branch_cbe)
            db.refresh(branch_bgl)
            logger.info("Sample branches created.")
        else:
            logger.info("Branches already exist, skipping creation.")
            branch_cbe = db.query(Branch).filter(Branch.name == "Coimbatore").first()
            branch_bgl = db.query(Branch).filter(Branch.name == "Bangalore").first()

        # Create default admin user
        if db.query(Admin).filter(Admin.username == "admin@test.com").count() == 0:
            logger.info("Creating default admin user...")
            admin_user = Admin(
                username="admin@test.com", email="admin@test.com", full_name="Default Admin",
                password_hash=get_password_hash("admin123"), role=UserRole.ADMIN,
                is_active=True, is_superuser=True, branch_id=branch_cbe.id
            )
            db.add(admin_user)
            db.flush() # Flush to get the admin_user.id
            
            # --- Admin gets full access to both branches ---
            admin_perm_cbe = UserBranchPermission(user_id=admin_user.id, branch_id=branch_cbe.id, permission_level=PermissionLevel.FULL_ACCESS)
            admin_perm_bgl = UserBranchPermission(user_id=admin_user.id, branch_id=branch_bgl.id, permission_level=PermissionLevel.FULL_ACCESS)
            db.add_all([admin_perm_cbe, admin_perm_bgl])

            logger.info("Default admin user and permissions created.")
        else:
            logger.info("Admin user already exists, skipping.")

        # --- FIX: Integrated your new worker creation logic ---
        # Coimbatore Worker with permissions
        if db.query(Admin).filter(Admin.username == "worker_cbe@test.com").count() == 0:
            logger.info("Creating Coimbatore worker with permissions...")
            worker_cbe = Admin(
                username="worker_cbe@test.com", email="worker_cbe@test.com",
                full_name="Coimbatore Worker", password_hash=get_password_hash("worker123"),
                role=UserRole.WORKER, is_active=True, branch_id=branch_cbe.id
            )
            db.add(worker_cbe)
            db.flush() # Use flush to get the worker's ID before committing
            
            # Add permission for Coimbatore branch
            permission = UserBranchPermission(
                user_id=worker_cbe.id,
                branch_id=branch_cbe.id,
                permission_level=PermissionLevel.FULL_ACCESS
            )
            db.add(permission)
            logger.info("Coimbatore worker and permissions created.")
        else:
            logger.info("Coimbatore worker already exists, skipping.")

        # Bangalore Worker with permissions
        if db.query(Admin).filter(Admin.username == "worker_bgl@test.com").count() == 0:
            logger.info("Creating Bangalore worker with permissions...")
            worker_bgl = Admin(
                username="worker_bgl@test.com", email="worker_bgl@test.com",
                full_name="Bangalore Worker", password_hash=get_password_hash("worker123"),
                role=UserRole.WORKER, is_active=True, branch_id=branch_bgl.id
            )
            db.add(worker_bgl)
            db.flush()
            
            # Add permission for Bangalore branch
            permission_bgl = UserBranchPermission(
                user_id=worker_bgl.id,
                branch_id=branch_bgl.id,
                permission_level=PermissionLevel.FULL_ACCESS
            )
            db.add(permission_bgl)
            logger.info("Bangalore worker and permissions created.")
        else:
            logger.info("Bangalore worker already exists, skipping.")

        # Create sample menu items
        if db.query(MenuItem).count() == 0:
            logger.info("Creating sample menu items...")
            items_data = [
                {"name": "Espresso", "price": 120, "category": "Coffee", "branch_id": branch_cbe.id},
                {"name": "Cappuccino", "price": 150, "category": "Coffee", "branch_id": branch_cbe.id},
                {"name": "Filter Coffee", "price": 100, "category": "Coffee", "branch_id": branch_bgl.id},
            ]
            for item in items_data:
                db.add(MenuItem(**item))
            logger.info("Sample menu items created.")
        else:
            logger.info("Menu items already exist, skipping.")

        # Create sample expense categories
        if db.query(ExpenseCategory).count() == 0:
            logger.info("Creating sample expense categories...")
            categories = [
                ExpenseCategory(name="Dairy", description="Milk, Cream, etc."),
                ExpenseCategory(name="Coffee Beans", description="Raw coffee beans"),
                ExpenseCategory(name="Utilities", description="Electricity, Water, Gas bills"),
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
    
    if os.path.exists(DB_FILE):
        try:
            engine.dispose() 
            os.remove(DB_FILE)
            logger.info(f"✅ Successfully deleted old database file: {DB_FILE}")
        except OSError as e:
            logger.error(f"❌ Error deleting database file: {e}")
            logger.error("Please check file permissions and close any programs using the database.")
            return
    else:
        logger.info("ℹ️ No old database file found to delete.")

    try:
        logger.info("⌛ Creating new tables...")
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Successfully created new tables.")
    except Exception as e:
        logger.exception(f"❌ Error creating new tables: {e}")
        return
        
    logger.info("⌛ Initializing database with sample data...")
    db = next(get_database())
    init_db(db)
    
    logger.info("--- Database Reset & Initialization Complete ---")
    logger.info("You can now start the main application.")


if __name__ == "__main__":
    reset_and_init_database()