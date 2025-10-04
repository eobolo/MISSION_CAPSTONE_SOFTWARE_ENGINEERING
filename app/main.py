from fastapi import FastAPI, HTTPException, Request
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from app.database.db_config import create_users_table, create_documents_table, create_training_data_table
from app.routes.auth import router as auth_router
from app.routes.documents import router as documents_router
import uvicorn

app = FastAPI(title="CBC Feedback Coach MVP", version="0.1.0")

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Include routers
app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(documents_router, prefix="/documents", tags=["documents"])

# Templates configuration
templates = Jinja2Templates(directory="templates")

# Create tables on startup
try:
    create_users_table()
    create_documents_table()
    create_training_data_table()
except HTTPException as e:
    print(f"Warning: Failed to create tables on startup: {e.detail}")
except Exception as e:
    print(f"Warning: Unexpected error during table creation: {e}")

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("auth_forms.html", {"request": request})

@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard(request: Request):
    return templates.TemplateResponse("dashboard.html", {"request": request})

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)