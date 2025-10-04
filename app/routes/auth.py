from fastapi import APIRouter, HTTPException, Depends, Request
from app.schemas.user import UserCreate, UserLogin
from app.utils.auth_utils import hash_password, verify_password
from app.utils.jwt_utils import create_access_token, SECRET_KEY
from app.database.db_config import get_db_connection, create_user, get_user_by_email
from psycopg2.extensions import connection as Connection
from psycopg2 import Error as Psycopg2Error
from jose import jwt, JWTError
import traceback

router = APIRouter()


def get_db():
    conn = get_db_connection()
    try:
        yield conn
    finally:
        conn.close()


@router.post("/signup")
async def signup(user: UserCreate, db: Connection = Depends(get_db)):
    try:
        # Check if email already exists
        existing_user = get_user_by_email(db, user.email)
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")

        # Hash password and create user
        password_hash = hash_password(user.password)
        user_id = create_user(
            db, user.email, password_hash, user.first_name, user.last_name
        )
        
        return {"message": "User created successfully", "user_id": user_id}
    except HTTPException as e:
        raise
    except Psycopg2Error as e:
        error_detail = f"Database error during signup: {str(e)}\n{traceback.format_exc()}"
        raise HTTPException(status_code=500, detail=error_detail)
    except Exception as e:
        error_detail = f"Unexpected error during signup: {str(e)}\n{traceback.format_exc()}"
        raise HTTPException(status_code=500, detail=error_detail)


@router.post("/login")
async def login(user: UserLogin, db: Connection = Depends(get_db)):
    try:
        db_user = get_user_by_email(db, user.email)
        if not db_user or not verify_password(user.password, db_user[1]):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        # Update last login timestamp
        cursor = db.cursor()
        cursor.execute("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE email = %s", (user.email,))
        db.commit()
        cursor.close()

        # Create access token
        token_data = {
            "user_id": db_user[0],
            "email": user.email,
            "first_name": db_user[2],
            "last_name": db_user[3]
        }
        
        access_token = create_access_token(token_data)
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "redirect_url": "/dashboard"
        }
    except HTTPException as e:
        raise
    except Psycopg2Error as e:
        error_detail = f"Database error during login: {str(e)}\n{traceback.format_exc()}"
        raise HTTPException(status_code=500, detail=error_detail)
    except Exception as e:
        error_detail = f"Unexpected error during login: {str(e)}\n{traceback.format_exc()}"
        raise HTTPException(status_code=500, detail=error_detail)


@router.get("/user-data")
async def get_user_data(
    request: Request,
    db: Connection = Depends(get_db)
):
    """Get current user data from database using JWT token"""
    try:
        # Extract token from Authorization header
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="No valid authorization header")
        
        token = auth_header.split(" ")[1]
        
        # Decode JWT token to get user info
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            user_email = payload.get("email")
            
            if not user_email:
                raise HTTPException(status_code=401, detail="No email in token")
                
        except JWTError:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        
        # Get user data from database
        db_user = get_user_by_email(db, user_email)
        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {
            "user_id": db_user[0],
            "email": user_email,
            "first_name": db_user[2],
            "last_name": db_user[3]
        }
        
    except HTTPException as e:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))