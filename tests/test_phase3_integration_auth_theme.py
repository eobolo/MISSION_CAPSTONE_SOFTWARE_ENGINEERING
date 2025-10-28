"""
Phase 3: Integration Tests for Auth and Theme
Tests: POST /auth/login, GET /auth/user-data returns theme, PUT /auth/user-theme persists
Tool: pytest, httpx, pytest-asyncio
Run with: pytest tests/test_phase3_integration_auth_theme.py -v --html=reports/phase3_report.html
"""

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.routes.auth import router as auth_router
from app.utils.auth_utils import hash_password
from app.database.db_config import get_db_connection, create_user, get_user_by_email


@pytest.fixture
def test_app():
    """a minimal FastAPI app for testing without spaCy dependencies"""
    app = FastAPI()
    app.include_router(auth_router, prefix="/auth", tags=["auth"])
    return app


@pytest.fixture
def client(test_app):
    """Create a test client for testing"""
    return TestClient(test_app)


@pytest.fixture
def test_user_data():
    """Test user data for authentication tests"""
    return {
        "email": "integration_test@example.com",
        "password": "IntegrationTest123",
        "first_name": "Integration",
        "last_name": "Test"
    }


@pytest.fixture
def setup_test_user(test_user_data):
    """Create a test user in the database before tests"""
    db = get_db_connection()
    try:
        # Check if user already exists
        existing_user = get_user_by_email(db, test_user_data["email"])
        if existing_user:
            # User exists, clean up
            cursor = db.cursor()
            cursor.execute("DELETE FROM users WHERE email = %s", (test_user_data["email"],))
            db.commit()
            cursor.close()
        
        # Create new test user
        password_hash = hash_password(test_user_data["password"])
        user_id = create_user(
            db=db,
            email=test_user_data["email"],
            password_hash=password_hash,
            first_name=test_user_data["first_name"],
            last_name=test_user_data["last_name"],
            privacy_accepted=True,
            auth_method="email",
            theme="dark"
        )
        yield user_id
    finally:
        # Clean up test user
        try:
            cursor = db.cursor()
            cursor.execute("DELETE FROM users WHERE email = %s", (test_user_data["email"],))
            db.commit()
            cursor.close()
        except Exception:
            pass
        db.close()


@pytest.mark.integration
@pytest.mark.auth
class TestAuthIntegration:
    """Integration tests for authentication endpoints"""
    
    def test_login_success(self, client, setup_test_user, test_user_data):
        """Test successful login returns access token"""
        response = client.post(
            "/auth/login",
            json={
                "email": test_user_data["email"],
                "password": test_user_data["password"]
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"
        assert "redirect_url" in data
        assert data["redirect_url"] == "/dashboard"
    
    def test_login_invalid_email(self, client):
        """Test login with non-existent email"""
        response = client.post(
            "/auth/login",
            json={
                "email": "nonexistent@example.com",
                "password": "SomePassword123"
            }
        )
        
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
        assert "No account found" in data["detail"]
    
    def test_login_incorrect_password(self, client, setup_test_user, test_user_data):
        """Test login with incorrect password"""
        response = client.post(
            "/auth/login",
            json={
                "email": test_user_data["email"],
                "password": "WrongPassword123"
            }
        )
        
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        assert "Incorrect password" in data["detail"]
    
    def test_get_user_data_with_token(self, client, setup_test_user, test_user_data):
        """Test GET /auth/user-data returns user information including theme"""
        # First login to get token
        login_response = client.post(
            "/auth/login",
            json={
                "email": test_user_data["email"],
                "password": test_user_data["password"]
            }
        )
        
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        
        # Use token to get user data
        response = client.get(
            "/auth/user-data",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "email" in data
        assert "first_name" in data
        assert "last_name" in data
        assert "theme" in data
        assert data["email"] == test_user_data["email"]
        assert data["first_name"] == test_user_data["first_name"]
        assert data["last_name"] == test_user_data["last_name"]
        assert data["theme"] == "dark"  # Default theme
    
    def test_get_user_data_without_token(self, client):
        """Test GET /auth/user-data without token returns 401"""
        response = client.get("/auth/user-data")
        
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        assert "No valid authorization header" in data["detail"]


@pytest.mark.integration
@pytest.mark.theme
class TestThemeIntegration:
    """Integration tests for theme management"""
    
    def test_update_theme_to_light(self, client, setup_test_user, test_user_data):
        """Test updating user theme to light"""
        # Login to get token
        login_response = client.post(
            "/auth/login",
            json={
                "email": test_user_data["email"],
                "password": test_user_data["password"]
            }
        )
        token = login_response.json()["access_token"]
        
        # Update theme to light
        response = client.put(
            "/auth/user-theme",
            json={"theme": "light"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "theme" in data
        assert data["theme"] == "light"
        
        # Verify theme was persisted by fetching user data
        user_data_response = client.get(
            "/auth/user-data",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert user_data_response.status_code == 200
        user_data = user_data_response.json()
        assert user_data["theme"] == "light"
    
    def test_update_theme_to_dark(self, client, setup_test_user, test_user_data):
        """Test updating user theme to dark"""
        # Login to get token
        login_response = client.post(
            "/auth/login",
            json={
                "email": test_user_data["email"],
                "password": test_user_data["password"]
            }
        )
        token = login_response.json()["access_token"]
        
        # Update theme to dark
        response = client.put(
            "/auth/user-theme",
            json={"theme": "dark"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["theme"] == "dark"
        
        # Verify theme was persisted
        user_data_response = client.get(
            "/auth/user-data",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert user_data_response.status_code == 200
        user_data = user_data_response.json()
        assert user_data["theme"] == "dark"
    
    def test_update_theme_empty_fails(self, client, setup_test_user, test_user_data):
        """Test updating theme with empty value fails validation"""
        # Login to get token
        login_response = client.post(
            "/auth/login",
            json={
                "email": test_user_data["email"],
                "password": test_user_data["password"]
            }
        )
        token = login_response.json()["access_token"]
        
        # Try to update theme with empty value
        response = client.put(
            "/auth/user-theme",
            json={"theme": ""},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 422  # Validation error


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--html=reports/phase3_report.html"])
