# database.py
from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# Get the database URL from the environment variable
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# If you're running locally and want to use SQLite for development, you can add a fallback:
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./coffee_shop.db")

# Handle the difference in connection schemes between Heroku/Render and SQLAlchemy
if SQLALCHEMY_DATABASE_URL and SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Create engine
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args=(
        {"check_same_thread": False, "timeout": 30}
        if "sqlite" in SQLALCHEMY_DATABASE_URL else {}
    ),
    pool_pre_ping=True,
)

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
