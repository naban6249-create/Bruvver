# database_migration.py - Run this script to add the missing image_url column

from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

# Database URL from environment or default to SQLite
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./coffee_shop.db")
engine = create_engine(DATABASE_URL)

def add_image_url_column():
    """Add image_url column to ingredients table"""
    try:
        with engine.connect() as conn:
            # For SQLite
            if "sqlite" in DATABASE_URL.lower():
                # Check if column already exists
                result = conn.execute(text("PRAGMA table_info(ingredients)")).fetchall()
                columns = [row[1] for row in result]
                
                if 'image_url' not in columns:
                    conn.execute(text("ALTER TABLE ingredients ADD COLUMN image_url VARCHAR"))
                    conn.commit()
                    print("✅ Successfully added image_url column to ingredients table")
                else:
                    print("ℹ️  image_url column already exists")
            
            # For PostgreSQL
            elif "postgresql" in DATABASE_URL.lower():
                conn.execute(text("""
                    ALTER TABLE ingredients 
                    ADD COLUMN IF NOT EXISTS image_url VARCHAR(500)
                """))
                conn.commit()
                print("✅ Successfully added image_url column to ingredients table")
            
            # For MySQL
            elif "mysql" in DATABASE_URL.lower():
                conn.execute(text("""
                    ALTER TABLE ingredients 
                    ADD COLUMN image_url VARCHAR(500) DEFAULT NULL
                """))
                conn.commit()
                print("✅ Successfully added image_url column to ingredients table")
                
    except Exception as e:
        print(f"❌ Error adding column: {e}")
        raise

if __name__ == "__main__":
    add_image_url_column()