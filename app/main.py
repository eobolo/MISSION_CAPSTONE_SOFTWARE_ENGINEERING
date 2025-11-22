from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from starlette.middleware.sessions import SessionMiddleware
from starlette.middleware.gzip import GZipMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from app.database.db_config import create_users_table, create_documents_table, create_training_data_table
from app.routes.auth import router as auth_router
from app.routes.documents import router as documents_router
from app.routes.google_oauth import router as google_oauth_router
from app.utils.websocket_manager import websocket_manager
from app.utils.jwt_utils import verify_token
import json
import uvicorn
import os
from dotenv import load_dotenv
import secrets

# Load environment variables
load_dotenv()

app = FastAPI(
    title="CBC Feedback Coach MVP", 
    version="0.1.3",
    docs_url="/docs" if os.getenv("ENVIRONMENT") != "production" else None,
    redoc_url="/redoc" if os.getenv("ENVIRONMENT") != "production" else None
)

# Add compression middleware for text-based responses (gzip)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Add session middleware for OAuth (must be before routes)
# Generate a secret key if not in environment (for development)
session_secret = os.getenv("SESSION_SECRET", secrets.token_urlsafe(32))

app.add_middleware(
    SessionMiddleware,
    secret_key=session_secret,
    max_age=3600,  # Session expires after 1 hour
    same_site="lax",
        https_only=os.getenv("ENVIRONMENT") == "production"  # HTTPS only in production
)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Include routers
app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(google_oauth_router, prefix="/auth", tags=["auth"])
app.include_router(documents_router, prefix="/documents", tags=["documents"])

# Templates configuration
templates = Jinja2Templates(directory="templates")

# Create tables on startup
try:
    create_users_table()
    create_documents_table()
    create_training_data_table()
except (HTTPException, Exception):
    pass  # Tables may already exist

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("auth_forms.html", {"request": request})

@app.get("/reset-password", response_class=HTMLResponse)
async def reset_password_page(request: Request):
    """Render the reset password page (auth page with token in URL)"""
    return templates.TemplateResponse("auth_forms.html", {"request": request})

@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard(request: Request):
    return templates.TemplateResponse("dashboard.html", {"request": request})

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    """WebSocket endpoint for real-time document processing with token validation"""
    
    # Extract token from query parameters
    await websocket.accept()
    query_params = dict(websocket.query_params)
    token = query_params.get("token")
    
    # Verify token before proceeding
    try:
        if not token:
            await websocket.close(code=1008, reason="Token required")
            return
            
        payload = verify_token(token)
        if str(payload.get("user_id")) != str(user_id):
            await websocket.close(code=1008, reason="Token mismatch")
            return
            
    except Exception as e:
        await websocket.close(code=1008, reason="Invalid token")
        return
    
    await websocket_manager.connect(websocket, user_id)
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Handle the message
            await websocket_manager.handle_message(user_id, message)
            
    except WebSocketDisconnect:
        websocket_manager.disconnect(user_id)
    except Exception:
        websocket_manager.disconnect(user_id)


@app.get("/intro", response_class=HTMLResponse)
async def intro(request: Request):
    return templates.TemplateResponse("home_intro.html", {"request": request})


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)