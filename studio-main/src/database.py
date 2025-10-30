# database.py - Updated for Supabase PostgreSQL
from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# Get the database URL from the environment variable
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# For production (Supabase), DATABASE_URL should be set
# For local development, you can use SQLite as fallback
if not SQLALCHEMY_DATABASE_URL:
    SQLALCHEMY_DATABASE_URL = "sqlite:///./coffee_shop.db"
    print("⚠️  No DATABASE_URL found, using SQLite for local development")

# Handle PostgreSQL connection string
if SQLALCHEMY_DATABASE_URL and SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Create engine with PostgreSQL-optimized settings for Supabase
if "postgresql" in SQLALCHEMY_DATABASE_URL or "postgres" in SQLALCHEMY_DATABASE_URL:
    # PostgreSQL/Supabase connection settings
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_size=int(os.getenv("DB_POOL_SIZE", "5")),  # Number of persistent connections
        max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "10")),  # Additional connections when pool is full
        pool_timeout=int(os.getenv("DB_POOL_TIMEOUT", "30")),  # Wait time for connection
        pool_recycle=int(os.getenv("DB_POOL_RECYCLE", "3600")),  # Recycle connections every hour
        pool_pre_ping=True,  # Verify connections before using them
        connect_args={
            "connect_timeout": 10,  # Connection timeout in seconds
            "keepalives": 1,  # Enable TCP keepalives
            "keepalives_idle": 30,  # Seconds before sending keepalive
            "keepalives_interval": 10,  # Seconds between keepalives
            "keepalives_count": 5,  # Number of keepalives before giving up
        },
        echo=False  # Set to True for SQL debugging
    )
    print(f"✅ PostgreSQL engine created with pool_size={os.getenv('DB_POOL_SIZE', '5')}")
else:
    # SQLite connection settings (local development)
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False, "timeout": 30},
        pool_pre_ping=True,
        echo=False
    )
    print("✅ SQLite engine created for local development")

# For SQLite, enable WAL mode and set reasonable busy timeout to reduce lock errors
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        try:
            cursor.execute("PRAGMA journal_mode=WAL;")
            cursor.execute("PRAGMA synchronous=NORMAL;")
            cursor.execute("PRAGMA busy_timeout=5000;")  # 5 seconds
        finally:
            cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency to get DB session
def get_database():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
