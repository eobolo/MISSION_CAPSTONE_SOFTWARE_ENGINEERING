from fastapi import APIRouter, HTTPException, Depends, Request
from app.schemas.user import UserCreate, UserLogin, UserThemeUpdate, ForgotPasswordRequest, ResetPasswordRequest, UserProfileUpdate
from app.utils.auth_utils import hash_password, verify_password
from app.utils.jwt_utils import create_access_token, SECRET_KEY
from app.utils.email_utils import send_password_reset_email, send_password_reset_success_email
from app.database.db_config import get_db_connection, create_user, get_user_by_email
from psycopg2.extensions import connection as Connection
from psycopg2 import Error as Psycopg2Error
from jose import jwt, JWTError
from datetime import datetime, timedelta
import secrets
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

        # Validate that privacy was accepted
        if not user.privacy_accepted:
            raise HTTPException(status_code=400, detail="Privacy terms must be accepted to create an account")

        # Hash password and create user with all fields
        password_hash = hash_password(user.password)
        user_id = create_user(
            db=db,
            email=user.email,
            password_hash=password_hash,
            first_name=user.first_name,
            last_name=user.last_name,
            privacy_accepted=user.privacy_accepted,
            auth_method=user.auth_method,
            theme=user.theme
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
        
        # Check if account exists
        if not db_user:
            raise HTTPException(
                status_code=404, 
                detail="No account found with this email address. Please sign up first."
            )
        
        # Check if password is correct
        if not verify_password(user.password, db_user[1]):
            raise HTTPException(
                status_code=401, 
                detail="Incorrect password. Please try again."
            )

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
        
        # Column indices: 0=id, 1=password_hash, 2=first_name, 3=last_name, 4=theme, 5=auth_method, 6=google_id, 7=profile_picture
        return {
            "user_id": db_user[0],
            "email": user_email,
            "first_name": db_user[2],
            "last_name": db_user[3],
            "theme": db_user[4] if db_user[4] else 'dark',
            "profile_picture": db_user[7] if len(db_user) > 7 else None
        }
        
    except HTTPException as e:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest, db: Connection = Depends(get_db)):
    """Send password reset email to user"""
    try:
        # Check if user exists
        db_user = get_user_by_email(db, request.email)
        if not db_user:
            # For security, don't reveal if email exists
            return {"message": "If an account exists with this email, a password reset link has been sent."}
        
        # Generate secure reset token
        reset_token = secrets.token_urlsafe(32)
        token_expires = datetime.utcnow() + timedelta(hours=1)
        
        # Store reset token in database
        cursor = db.cursor()
        cursor.execute(
            "UPDATE users SET reset_token = %s, reset_token_expires = %s WHERE email = %s",
            (reset_token, token_expires, request.email)
        )
        db.commit()
        cursor.close()
        
        # Send password reset email
        user_name = db_user[2]  # first_name
        email_sent = send_password_reset_email(request.email, user_name, reset_token)
        
        if not email_sent:
            # Log error but don't reveal to user
            pass
        
        # Always return success message for security
        return {
            "message": "If an account exists with this email, a password reset link has been sent."
        }
        
    except Exception as e:
        # Log error but return generic message for security
        return {
            "message": "If an account exists with this email, a password reset link has been sent."
        }


@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest, db: Connection = Depends(get_db)):
    """Reset user password using reset token"""
    try:
        # Validate password
        if len(request.new_password) < 8:
            raise HTTPException(
                status_code=400,
                detail="Password must be at least 8 characters long"
            )
        
        # Find user by reset token
        cursor = db.cursor()
        cursor.execute(
            """
            SELECT id, email, first_name, reset_token_expires 
            FROM users 
            WHERE reset_token = %s
            """,
            (request.token,)
        )
        user = cursor.fetchone()
        
        if not user:
            raise HTTPException(
                status_code=400,
                detail="Invalid or expired reset token"
            )
        
        # Check if token has expired
        expires_at = user[3]
        if datetime.utcnow() > expires_at:
            # Clear expired token
            cursor.execute(
                "UPDATE users SET reset_token = NULL, reset_token_expires = NULL WHERE id = %s",
                (user[0],)
            )
            db.commit()
            cursor.close()
            
            raise HTTPException(
                status_code=400,
                detail="Reset token has expired. Please request a new password reset."
            )
        
        # Hash new password and update
        password_hash = hash_password(request.new_password)
        cursor.execute(
            """
            UPDATE users 
            SET password_hash = %s, reset_token = NULL, reset_token_expires = NULL 
            WHERE id = %s
            """,
            (password_hash, user[0])
        )
        db.commit()
        cursor.close()
        
        # Send confirmation email
        user_email = user[1]
        user_name = user[2]
        send_password_reset_success_email(user_email, user_name)
        
        return {"message": "Password reset successfully. You can now log in with your new password."}
        
    except HTTPException as e:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error resetting password: {str(e)}"
        )


@router.put("/user-theme")
async def update_user_theme(
    theme_data: UserThemeUpdate,
    request: Request,
    db: Connection = Depends(get_db)
):
    """Update user's theme preference"""
    try:
        # Extract token from Authorization header
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="No valid authorization header")
        
        token = auth_header.split(" ")[1]
        
        # Decode JWT token to get user info
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            user_id = payload.get("user_id")
            user_email = payload.get("email")
            
            if not user_id or not user_email:
                raise HTTPException(status_code=401, detail="No user info in token")
                
        except JWTError:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        
        # Update theme in database
        cursor = db.cursor()
        try:
            # Update user's theme
            cursor.execute(
                "UPDATE users SET theme = %s WHERE id = %s",
                (theme_data.theme, user_id)
            )
            db.commit()
            
            return {"message": "Theme updated successfully", "theme": theme_data.theme}
            
        except Psycopg2Error as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
        finally:
            cursor.close()
        
    except HTTPException as e:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/user-profile")
async def update_user_profile(
    profile_data: UserProfileUpdate,
    request: Request,
    db: Connection = Depends(get_db)
):
    """Update user's profile (first_name and last_name only)"""
    try:
        # Extract token from Authorization header
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="No valid authorization header")
        
        token = auth_header.split(" ")[1]
        
        # Decode JWT token to get user info
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            user_id = payload.get("user_id")
            user_email = payload.get("email")
            
            if not user_id or not user_email:
                raise HTTPException(status_code=401, detail="No user info in token")
                
        except JWTError:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        
        # Update profile in database
        cursor = db.cursor()
        try:
            cursor.execute(
                "UPDATE users SET first_name = %s, last_name = %s WHERE id = %s",
                (profile_data.first_name, profile_data.last_name, user_id)
            )
            db.commit()
            
            return {
                "message": "Profile updated successfully",
                "first_name": profile_data.first_name,
                "last_name": profile_data.last_name
            }
            
        except Psycopg2Error as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
        finally:
            cursor.close()
        
    except HTTPException as e:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))