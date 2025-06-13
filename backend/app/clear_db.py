import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Assuming DATABASE_URL is accessible or defined similar to app.models
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://user:password@db:5432/loraforge_db")

def clear_database_tables():
    """
    Connects to the PostgreSQL database and drops specified tables.
    """
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        # Tables to drop. Order matters if not using CASCADE.
        # Dropping 'datasets' with CASCADE will also drop 'images'.
        tables_to_drop = ["datasets"]

        for table_name in tables_to_drop:
            print(f"Dropping table: {table_name}...")
            db.execute(text(f"DROP TABLE IF EXISTS {table_name} CASCADE;"))
            print(f"Table {table_name} dropped successfully.")
        
        db.commit()
        print("Database tables dropped successfully.")

    except Exception as e:
        db.rollback()
        print(f"An error occurred: {e}")
        print("Database rollback performed.")
    finally:
        db.close()
        print("Database connection closed.")

if __name__ == "__main__":
    clear_database_tables()