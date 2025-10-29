from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import RedirectResponse
from app.utils.jwt_utils import create_access_token, verify_token
from app.database.db_config import get_db_connection, get_user_by_email, create_google_user, accept_privacy_terms
from app.utils.oauth_config import oauth
from app.schemas.user import PrivacyAcceptance
from psycopg2.extensions import connection as Connection
import os

router = APIRouter()



def get_db():
    conn = get_db_connection()
    try:
        yield conn
    finally:
        conn.close()


@router.get("/google/login")
async def google_login(request: Request):
    """Initiate Google OAuth flow"""
    try:
        # Get redirect URI from environment variable
        base_url = os.getenv('BASE_URL', 'http://localhost:8000')
        redirect_uri = f"{base_url}/auth/google/callback"
        return await oauth.google.authorize_redirect(
            request, 
            redirect_uri,
            prompt='select_account'  # Force account selection
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initiate Google login: {str(e)}")


@router.get("/google/callback")
async def google_callback(request: Request, db: Connection = Depends(get_db)):
    """Handle Google OAuth callback"""
    try:
        # Get the access token from Google with clock leeway for WSL/Docker time sync issues
        # Increased to 3600 seconds (1 hour) to handle severe WSL clock drift
        token = await oauth.google.authorize_access_token(request, leeway=3600)
        
        # Get user info from Google
        user_info = token.get('userinfo')
        
        if not user_info:
            raise HTTPException(status_code=400, detail="Failed to get user info from Google")
        
        google_id = user_info.get('sub')  # Google's unique user ID
        email = user_info.get('email')
        first_name = user_info.get('given_name', '')
        last_name = user_info.get('family_name', '')
        profile_picture = user_info.get('picture', '')
        
        if not google_id or not email:
            raise HTTPException(status_code=400, detail="Incomplete user information from Google")
        
        existing_user = get_user_by_email(db, email)
        is_new_user = False
        
        if existing_user:
            # Column indices: 0=id, 1=password_hash, 2=first_name, 3=last_name, 4=theme, 5=auth_method, 6=google_id, 7=profile_picture, 8=privacy_accepted
            auth_method = existing_user[5] if len(existing_user) > 5 else 'email'
            privacy_accepted = existing_user[8] if len(existing_user) > 8 else False
            
            if auth_method == 'email':
                raise HTTPException(
                    status_code=400, 
                    detail="This email is already registered with a password. Please use the 'Login' option above and sign in with your email and password instead of Google."
                )
            
            # User exists with Google auth
            user_id = existing_user[0]
            user_first_name = existing_user[2]
            user_last_name = existing_user[3]
            
            # Update last login
            cursor = db.cursor()
            cursor.execute("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = %s", (user_id,))
            db.commit()
            cursor.close()
        else:
            # New user - create without privacy acceptance
            try:
                user_id = create_google_user(
                    db, email, google_id, first_name, last_name, profile_picture, privacy_accepted=False
                )
                user_first_name = first_name
                user_last_name = last_name
                is_new_user = True
                privacy_accepted = False
            except HTTPException as e:
                if "duplicate key value violates unique constraint" in str(e.detail).lower():
                    raise HTTPException(
                        status_code=400,
                        detail="This Google account is already linked to a different email. If you have multiple accounts, please sign in with the correct one."
                    )
                raise
        
        # Create JWT token with privacy status
        token_data = {
            "user_id": user_id,
            "email": email,
            "first_name": user_first_name,
            "last_name": user_last_name,
            "google_id": google_id,
            "profile_picture": profile_picture
        }
        access_token = create_access_token(data=token_data)
        
        # If new user or privacy not accepted, show privacy modal on auth page
        if not privacy_accepted:
            return RedirectResponse(
                url=f"/?google_auth_privacy=true&token={access_token}",
                status_code=302
            )
        
        # Existing user with privacy accepted - proceed to dashboard
        return RedirectResponse(
            url=f"/?google_auth=success&token={access_token}",
            status_code=302
        )
        
    except HTTPException as e:
        error_message = e.detail.replace(" ", "+")
        return RedirectResponse(
            url=f"/?google_auth=error&message={error_message}",
            status_code=302
        )
    except Exception as e:
        return RedirectResponse(
            url=f"/?google_auth=error&message=Something+went+wrong+with+Google+sign-in.+Please+try+again+or+use+email+and+password+to+sign+up.",
            status_code=302
        )


@router.post("/accept-privacy")
async def accept_privacy(
    privacy_data: PrivacyAcceptance,
    request: Request,
    db: Connection = Depends(get_db)
):
    """Accept privacy terms for Google OAuth users"""
    try:
        # Get token from Authorization header
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="No valid authorization header")
        
        token = auth_header.split(" ")[1]
        payload = verify_token(token)
        
        if not payload:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="No user ID in token")
        
        if not privacy_data.accepted:
            raise HTTPException(status_code=400, detail="Privacy terms must be accepted")
        
        # Accept privacy terms in database
        accept_privacy_terms(db, user_id)
        
        return {
            "message": "Privacy terms accepted successfully",
            "redirect_url": "/dashboard"
        }
        
    except HTTPException as e:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error accepting privacy terms: {str(e)}")

