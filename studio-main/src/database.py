import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

# Get the database URL from environment variables.
# Fallback to a local SQLite database if DATABASE_URL is not set.
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./coffee_shop.db")

# If we are using PostgreSQL, the DATABASE_URL from Render starts with "postgres://".
# We'll replace it with "postgresql+psycopg2://" to be explicit with SQLAlchemy.
if SQLALCHEMY_DATABASE_URL and SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)

# For SQLite, we need to allow single-threaded access.
# For PostgreSQL, no special arguments are needed.
engine_args = {"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args=engine_args
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_database():
    database = SessionLocal()
    try:
        yield database
    finally:
        database.close()
