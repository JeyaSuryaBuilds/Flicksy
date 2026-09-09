import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# DATABASE_URL examples:
#   Postgres: postgresql+psycopg2://user:password@localhost:5432/flicksy
#   SQLite (default, zero-setup):  sqlite:///./flicksy.db
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./flicksy.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
