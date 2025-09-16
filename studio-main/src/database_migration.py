# comprehensive_migration.py - Complete database migration for all new features

import os
import sys
from sqlalchemy import create_engine, text, MetaData, Table, inspect
from sqlalchemy.exc import OperationalError, ProgrammingError
from dotenv import load_dotenv

load_dotenv()

# Database URL from environment or default to SQLite
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./coffee_shop.db")
engine = create_engine(DATABASE_URL)

def check_table_exists(table_name: str) -> bool:
    """Check if a table exists in the database"""
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    return table_name in existing_tables

def check_column_exists(table_name: str, column_name: str) -> bool:
    """Check if a column exists in a table"""
    try:
        inspector = inspect(engine)
        columns = inspector.get_columns(table_name)
        return any(col['name'] == column_name for col in columns)
    except:
        return False

def create_branches_table():
    """Create the branches table"""
    try:
        with engine.connect() as conn:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS branches (
                    id INTEGER PRIMARY KEY,
                    name VARCHAR(255) NOT NULL UNIQUE,
                    location VARCHAR(255),
                    address TEXT,
                    phone VARCHAR(50),
                    email VARCHAR(255),
                    is_active BOOLEAN DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """))
            conn.commit()
            print("✅ Created branches table")
    except Exception as e:
        print(f"❌ Error creating branches table: {e}")

def create_daily_expenses_table():
    """Create the daily_expenses table"""
    try:
        with engine.connect() as conn:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS daily_expenses (
                    id INTEGER PRIMARY KEY,
                    branch_id INTEGER NOT NULL,
                    category VARCHAR(100) NOT NULL,
                    item_name VARCHAR(255) NOT NULL,
                    description TEXT,
                    quantity FLOAT,
                    unit VARCHAR(50),
                    unit_cost FLOAT NOT NULL,
                    total_amount FLOAT NOT NULL,
                    expense_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                    receipt_number VARCHAR(100),
                    vendor VARCHAR(255),
                    created_by INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (branch_id) REFERENCES branches (id),
                    FOREIGN KEY (created_by) REFERENCES admins (id)
                )
            """))
            conn.commit()
            print("✅ Created daily_expenses table")
    except Exception as e:
        print(f"❌ Error creating daily_expenses table: {e}")

def create_expense_categories_table():
    """Create the expense_categories table"""
    try:
        with engine.connect() as conn:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS expense_categories (
                    id INTEGER PRIMARY KEY,
                    name VARCHAR(100) NOT NULL UNIQUE,
                    description TEXT,
                    is_active BOOLEAN DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """))
            conn.commit()
            print("✅ Created expense_categories table")
            
            # Insert default categories
            default_categories = [
                ('ingredients', 'Coffee beans, milk, syrups, etc.'),
                ('utilities', 'Electricity, water, gas bills'),
                ('maintenance', 'Equipment repairs, cleaning supplies'),
                ('supplies', 'Cups, napkins, straws, packaging'),
                ('marketing', 'Advertising, promotions'),
                ('staff', 'Wages, bonuses, training'),
                ('rent', 'Shop rent, equipment lease'),
                ('other', 'Miscellaneous expenses')
            ]
            
            for name, desc in default_categories:
                conn.execute(text("""
                    INSERT OR IGNORE INTO expense_categories (name, description)
                    VALUES (:name, :description)
                """), {"name": name, "description": desc})
            
            conn.commit()
            print("✅ Inserted default expense categories")
            
    except Exception as e:
        print(f"❌ Error creating expense_categories table: {e}")

def add_branch_columns():
    """Add branch_id columns to existing tables"""
    tables_to_update = [
        ('menu_items', 'branch_id', 'INTEGER'),
        ('daily_sales', 'branch_id', 'INTEGER'),
        ('orders', 'branch_id', 'INTEGER'),
        ('inventory', 'branch_id', 'INTEGER'),
        ('daily_reports', 'branch_id', 'INTEGER'),
        ('admins', 'branch_id', 'INTEGER'),
        ('admins', 'role', 'VARCHAR(20) DEFAULT "worker"')
    ]
    
    try:
        with engine.connect() as conn:
            for table, column, column_type in tables_to_update:
                if check_table_exists(table) and not check_column_exists(table, column):
                    if "sqlite" in DATABASE_URL.lower():
                        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {column_type}"))
                    else:
                        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {column_type}"))
                    conn.commit()
                    print(f"✅ Added {column} to {table} table")
                else:
                    print(f"ℹ️  Column {column} already exists in {table}")
            
    except Exception as e:
        print(f"❌ Error adding branch columns: {e}")

def add_expense_columns_to_reports():
    """Add expense tracking columns to daily_reports"""
    try:
        with engine.connect() as conn:
            expense_columns = [
                ('total_expenses', 'FLOAT DEFAULT 0.0'),
                ('net_profit', 'FLOAT DEFAULT 0.0')
            ]
            
            for column, column_type in expense_columns:
                if not check_column_exists('daily_reports', column):
                    conn.execute(text(f"ALTER TABLE daily_reports ADD COLUMN {column} {column_type}"))
                    conn.commit()
                    print(f"✅ Added {column} to daily_reports table")
                else:
                    print(f"ℹ️  Column {column} already exists in daily_reports")
                    
    except Exception as e:
        print(f"❌ Error adding expense columns to daily_reports: {e}")

def create_sample_branches():
    """Create sample branch data"""
    try:
        with engine.connect() as conn:
            sample_branches = [
                {
                    'name': 'Coimbatore Main',
                    'location': 'RS Puram, Coimbatore',
                    'address': '123 Avinashi Road, RS Puram, Coimbatore, Tamil Nadu 641002',
                    'phone': '+91 98765 43210',
                    'email': 'coimbatore@coffeeshop.com'
                },
                {
                    'name': 'Bangalore Central',
                    'location': 'MG Road, Bangalore',
                    'address': '456 MG Road, Brigade Road, Bangalore, Karnataka 560001',
                    'phone': '+91 98765 43211',
                    'email': 'bangalore@coffeeshop.com'
                }
            ]
            
            for branch in sample_branches:
                # Check if branch already exists
                result = conn.execute(text("SELECT id FROM branches WHERE name = :name"), 
                                    {"name": branch['name']}).fetchone()
                if not result:
                    conn.execute(text("""
                        INSERT INTO branches (name, location, address, phone, email)
                        VALUES (:name, :location, :address, :phone, :email)
                    """), branch)
                    print(f"✅ Created sample branch: {branch['name']}")
                else:
                    print(f"ℹ️  Branch {branch['name']} already exists")
            
            conn.commit()
            
    except Exception as e:
        print(f"❌ Error creating sample branches: {e}")

def update_admin_roles():
    """Update admin table with role information"""
    try:
        with engine.connect() as conn:
            # Update existing admin to have admin role
            conn.execute(text("""
                UPDATE admins 
                SET role = 'admin' 
                WHERE username = 'admin@test.com'
            """))
            
            # Create sample worker account
            worker_exists = conn.execute(text("""
                SELECT id FROM admins WHERE username = 'worker@test.com'
            """)).fetchone()
            
            if not worker_exists:
                # Get first branch ID
                branch_result = conn.execute(text("SELECT id FROM branches LIMIT 1")).fetchone()
                branch_id = branch_result[0] if branch_result else None
                
                from auth import get_password_hash
                worker_password_hash = get_password_hash("workerpassword")
                
                conn.execute(text("""
                    INSERT INTO admins (username, email, full_name, password_hash, role, branch_id)
                    VALUES ('worker@test.com', 'worker@test.com', 'Test Worker', :password_hash, 'worker', :branch_id)
                """), {
                    "password_hash": worker_password_hash,
                    "branch_id": branch_id
                })
                print("✅ Created sample worker account (worker@test.com / workerpassword)")
            else:
                print("ℹ️  Worker account already exists")
            
            conn.commit()
            
    except Exception as e:
        print(f"❌ Error updating admin roles: {e}")

def assign_existing_data_to_branches():
    """Assign existing menu items, sales, etc. to first branch"""
    try:
        with engine.connect() as conn:
            # Get first branch ID
            branch_result = conn.execute(text("SELECT id FROM branches LIMIT 1")).fetchone()
            if not branch_result:
                print("⚠️  No branches found, skipping data assignment")
                return
            
            branch_id = branch_result[0]
            
            # Update existing menu items
            conn.execute(text("""
                UPDATE menu_items 
                SET branch_id = :branch_id 
                WHERE branch_id IS NULL
            """), {"branch_id": branch_id})
            
            # Update existing sales
            conn.execute(text("""
                UPDATE daily_sales 
                SET branch_id = :branch_id 
                WHERE branch_id IS NULL
            """), {"branch_id": branch_id})
            
            # Update existing orders
            if check_table_exists('orders'):
                conn.execute(text("""
                    UPDATE orders 
                    SET branch_id = :branch_id 
                    WHERE branch_id IS NULL
                """), {"branch_id": branch_id})
            
            # Update existing inventory
            if check_table_exists('inventory'):
                conn.execute(text("""
                    UPDATE inventory 
                    SET branch_id = :branch_id 
                    WHERE branch_id IS NULL
                """), {"branch_id": branch_id})
            
            # Update existing admins
            conn.execute(text("""
                UPDATE admins 
                SET branch_id = :branch_id 
                WHERE branch_id IS NULL
            """), {"branch_id": branch_id})
            
            conn.commit()
            print(f"✅ Assigned existing data to branch ID {branch_id}")
            
    except Exception as e:
        print(f"❌ Error assigning existing data to branches: {e}")

def create_sample_expenses():
    """Create sample expense data"""
    try:
        with engine.connect() as conn:
            # Get first branch ID
            branch_result = conn.execute(text("SELECT id FROM branches LIMIT 1")).fetchone()
            if not branch_result:
                print("⚠️  No branches found, skipping sample expenses")
                return
            
            branch_id = branch_result[0]
            
            # Get admin ID for created_by
            admin_result = conn.execute(text("SELECT id FROM admins LIMIT 1")).fetchone()
            admin_id = admin_result[0] if admin_result else None
            
            sample_expenses = [
                {
                    'branch_id': branch_id,
                    'category': 'ingredients',
                    'item_name': 'Arabica Coffee Beans',
                    'description': 'Premium quality coffee beans for espresso',
                    'quantity': 5.0,
                    'unit': 'kg',
                    'unit_cost': 800.0,
                    'total_amount': 4000.0,
                    'vendor': 'Coffee Suppliers Ltd',
                    'created_by': admin_id
                },
                {
                    'branch_id': branch_id,
                    'category': 'supplies',
                    'item_name': 'Paper Cups',
                    'description': '12oz disposable cups with lids',
                    'quantity': 500.0,
                    'unit': 'pieces',
                    'unit_cost': 2.5,
                    'total_amount': 1250.0,
                    'vendor': 'PackagePro',
                    'created_by': admin_id
                },
                {
                    'branch_id': branch_id,
                    'category': 'utilities',
                    'item_name': 'Electricity Bill',
                    'description': 'Monthly electricity charges',
                    'quantity': 1.0,
                    'unit': 'bill',
                    'unit_cost': 3500.0,
                    'total_amount': 3500.0,
                    'receipt_number': 'ELEC-2024-001',
                    'vendor': 'State Electricity Board',
                    'created_by': admin_id
                }
            ]
            
            for expense in sample_expenses:
                # Check if similar expense already exists
                existing = conn.execute(text("""
                    SELECT id FROM daily_expenses 
                    WHERE item_name = :item_name AND branch_id = :branch_id
                """), {
                    "item_name": expense['item_name'],
                    "branch_id": branch_id
                }).fetchone()
                
                if not existing:
                    conn.execute(text("""
                        INSERT INTO daily_expenses 
                        (branch_id, category, item_name, description, quantity, unit, 
                         unit_cost, total_amount, vendor, receipt_number, created_by)
                        VALUES (:branch_id, :category, :item_name, :description, :quantity, 
                                :unit, :unit_cost, :total_amount, :vendor, :receipt_number, :created_by)
                    """), expense)
                    print(f"✅ Created sample expense: {expense['item_name']}")
                else:
                    print(f"ℹ️  Expense {expense['item_name']} already exists")
            
            conn.commit()
            
    except Exception as e:
        print(f"❌ Error creating sample expenses: {e}")

def verify_migration():
    """Verify that all migrations were successful"""
    try:
        with engine.connect() as conn:
            # Check tables exist
            required_tables = ['branches', 'daily_expenses', 'expense_categories']
            inspector = inspect(engine)
            existing_tables = inspector.get_table_names()
            
            for table in required_tables:
                if table in existing_tables:
                    print(f"✅ Table {table} exists")
                else:
                    print(f"❌ Table {table} missing")
            
            # Check key columns exist
            if 'menu_items' in existing_tables and check_column_exists('menu_items', 'branch_id'):
                print("✅ Menu items have branch association")
            else:
                print("❌ Menu items missing branch association")
            
            if 'admins' in existing_tables and check_column_exists('admins', 'role'):
                print("✅ Admins have role field")
            else:
                print("❌ Admins missing role field")
            
            # Check sample data
            branch_count = conn.execute(text("SELECT COUNT(*) FROM branches")).fetchone()[0]
            print(f"✅ Total branches: {branch_count}")
            
            if check_table_exists('daily_expenses'):
                expense_count = conn.execute(text("SELECT COUNT(*) FROM daily_expenses")).fetchone()[0]
                print(f"✅ Sample expenses: {expense_count}")
            
    except Exception as e:
        print(f"❌ Error during verification: {e}")

def run_migration():
    """Run the complete migration"""
    print("🚀 Starting comprehensive database migration...")
    print("=" * 60)
    
    # Step 1: Create new tables
    print("\n📊 Creating new tables...")
    create_branches_table()
    create_daily_expenses_table()
    create_expense_categories_table()
    
    # Step 2: Add columns to existing tables
    print("\n🔧 Adding new columns...")
    add_branch_columns()
    add_expense_columns_to_reports()
    
    # Step 3: Create sample data
    print("\n📝 Creating sample data...")
    create_sample_branches()
    update_admin_roles()
    assign_existing_data_to_branches()
    create_sample_expenses()
    
    # Step 4: Verify migration
    print("\n✅ Verifying migration...")
    verify_migration()
    
    print("\n" + "=" * 60)
    print("🎉 Migration completed!")
    print("\nNew login credentials:")
    print("📧 Admin: admin@test.com / testpassword")
    print("👷 Worker: worker@test.com / workerpassword")
    print("\nNote: Workers have limited access to Daily Sales and Daily Expenses only.")

if __name__ == "__main__":
    try:
        run_migration()
    except Exception as e:
        print(f"💥 Migration failed: {e}")
        sys.exit(1)