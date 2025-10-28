from decouple import config
from fastapi import HTTPException
import psycopg2
from psycopg2 import OperationalError
from psycopg2.extensions import connection as Connection
import os
import urllib.parse

# Support for Render PostgreSQL (external database URL)
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    result = urllib.parse.urlparse(DATABASE_URL)
    DB_CONFIG = {
        "dbname": result.path[1:],
        "user": result.username,
        "password": result.password,
        "host": result.hostname,
        "port": result.port
    }
else:
    DB_CONFIG = {
        "dbname": config("DB_NAME", default="cbc_coach"),
        "user": config("DB_USER", default="postgres"),
        "password": config("DB_PASSWORD", default=""),
        "host": config("DB_HOST", default="172.31.160.1"),
        "port": config("DB_PORT", default="5432")
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
                password_hash VARCHAR(255),
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                theme VARCHAR(10) DEFAULT 'dark',
                auth_method VARCHAR(20) DEFAULT 'email',
                google_id VARCHAR(255) UNIQUE,
                profile_picture VARCHAR(500),
                privacy_accepted BOOLEAN DEFAULT FALSE,
                privacy_accepted_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP,
                reset_token VARCHAR(255),
                reset_token_expires TIMESTAMP
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
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                last_updated TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
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


def create_user(db: Connection, email: str, password_hash: str, first_name: str, last_name: str, 
                privacy_accepted: bool = True, auth_method: str = 'email', theme: str = 'dark'):
    """Create a new user with email/password authentication"""
    try:
        cursor = db.cursor()
        
        # Set privacy_accepted_at only if privacy is accepted
        if privacy_accepted:
            cursor.execute("""
                INSERT INTO users (email, password_hash, first_name, last_name, privacy_accepted, 
                                 privacy_accepted_at, auth_method, theme)
                VALUES (%s, %s, %s, %s, %s, CURRENT_TIMESTAMP, %s, %s) RETURNING id
            """, (email, password_hash, first_name, last_name, privacy_accepted, auth_method, theme))
        else:
            cursor.execute("""
                INSERT INTO users (email, password_hash, first_name, last_name, privacy_accepted, 
                                 auth_method, theme)
                VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id
            """, (email, password_hash, first_name, last_name, privacy_accepted, auth_method, theme))
        
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


def create_google_user(db: Connection, email: str, google_id: str, first_name: str, last_name: str, profile_picture: str = None, privacy_accepted: bool = False):
    """Create a new user from Google OAuth (without privacy acceptance initially)"""
    try:
        cursor = db.cursor()
        if privacy_accepted:
            cursor.execute("""
                INSERT INTO users (email, google_id, first_name, last_name, auth_method, profile_picture, privacy_accepted, privacy_accepted_at)
                VALUES (%s, %s, %s, %s, 'google', %s, TRUE, CURRENT_TIMESTAMP) RETURNING id
            """, (email, google_id, first_name, last_name, profile_picture))
        else:
            cursor.execute("""
                INSERT INTO users (email, google_id, first_name, last_name, auth_method, profile_picture, privacy_accepted)
                VALUES (%s, %s, %s, %s, 'google', %s, FALSE) RETURNING id
            """, (email, google_id, first_name, last_name, profile_picture))
        user_id = cursor.fetchone()[0]
        db.commit()
        cursor.close()
        return user_id
    except OperationalError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error during Google user creation: {str(e)}")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected error during Google user creation: {str(e)}")


def get_user_by_google_id(db: Connection, google_id: str):
    """Get user by their Google ID"""
    try:
        cursor = db.cursor()
        cursor.execute("SELECT * FROM users WHERE google_id = %s", (google_id,))
        user = cursor.fetchone()
        cursor.close()
        return user
    except OperationalError as e:
        raise HTTPException(status_code=500, detail=f"Database error when fetching user by Google ID: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error when fetching user by Google ID: {str(e)}")


def get_user_by_email(db: Connection, email: str):
    try:
        cursor = db.cursor()
        cursor.execute("""
            SELECT id, password_hash, first_name, last_name, theme, auth_method, google_id, profile_picture, privacy_accepted
            FROM users WHERE email = %s
        """, (email,))
        user = cursor.fetchone()
        cursor.close()
        return user
    except OperationalError as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve user: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error during user retrieval: {str(e)}")


def accept_privacy_terms(db: Connection, user_id: int):
    """Accept privacy terms for a user"""
    try:
        cursor = db.cursor()
        cursor.execute("""
            UPDATE users 
            SET privacy_accepted = TRUE, privacy_accepted_at = CURRENT_TIMESTAMP 
            WHERE id = %s
        """, (user_id,))
        db.commit()
        cursor.close()
    except OperationalError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error during privacy acceptance: {str(e)}")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected error during privacy acceptance: {str(e)}")


