from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from app.utils.jwt_utils import verify_token
from fastapi.templating import Jinja2Templates

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")
templates = Jinja2Templates(directory="templates")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = verify_token(token)
    if payload is None:
        # Always raise HTTPException for API endpoints
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload