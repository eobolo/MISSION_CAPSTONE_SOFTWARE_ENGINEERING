from decouple import config
from fastapi import HTTPException
import psycopg2
from psycopg2 import OperationalError
from psycopg2.extensions import connection as Connection


DB_CONFIG = {
    "dbname": "cbc_coach",
    "user": "postgres",
    "password": config("DB_PASSWORD", default=""),
    "host": "127.0.0.1",
    "port": "5432"
}



def get_db_connection():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.close()
        return conn
    except OperationalError as e:
        raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


def create_users_table():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP
            )
        """)
        conn.commit()
        cursor.close()
        conn.close()
    except OperationalError as e:
        raise HTTPException(status_code=500, detail=f"Failed to create users table: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error during table creation: {str(e)}")
    
def create_documents_table():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
        cursor.close()
        conn.close()
    except OperationalError as e:
        raise HTTPException(status_code=500, detail=f"Failed to create documents table: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error during documents table creation: {str(e)}")

def create_training_data_table():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS training_data (
                id SERIAL PRIMARY KEY,
                original_text TEXT NOT NULL,
                teacher_correction TEXT NOT NULL,
                cbc_feedback TEXT NOT NULL,
                submitted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
        cursor.close()
        conn.close()
    except OperationalError as e:
        raise HTTPException(status_code=500, detail=f"Failed to create training_data table: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error during training_data table creation: {str(e)}")


def create_user(db: Connection, email: str, password_hash: str, first_name: str, last_name: str):
    try:
        cursor = db.cursor()
        cursor.execute("""
            INSERT INTO users (email, password_hash, first_name, last_name)
            VALUES (%s, %s, %s, %s) RETURNING id
        """, (email, password_hash, first_name, last_name))
        user_id = cursor.fetchone()[0]
        db.commit()
        cursor.close()
        return user_id
    except OperationalError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error during user creation: {str(e)}")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected error during user creation: {str(e)}")


def get_user_by_email(db: Connection, email: str):
    try:
        cursor = db.cursor()
        cursor.execute("""
            SELECT id, password_hash, first_name, last_name FROM users WHERE email = %s
        """, (email,))
        user = cursor.fetchone()
        
        # Debug: Log what was retrieved from database
        print(f"DEBUG: get_user_by_email query for '{email}':")
        if user:
            print(f"DEBUG: Found user: {user}")
            print(f"DEBUG: id = {user[0]}")
            print(f"DEBUG: password_hash = {user[1][:10]}...")  # Only first 10 chars
            print(f"DEBUG: first_name = '{user[2]}'")
            print(f"DEBUG: last_name = '{user[3]}'")
        else:
            print(f"DEBUG: No user found with email '{email}'")
            
        cursor.close()
        return user
    except OperationalError as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve user: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error during user retrieval: {str(e)}")

