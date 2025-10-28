"""
Phase 2: Unit Tests for Schemas and Utils
Tests: Pydantic validators, jwt_utils, auth_utils
Tool: pytest, pytest-cov
Run with: pytest tests/test_phase2_unit_schemas_utils.py -v --html=reports/phase2_report.html
"""

import pytest
from pydantic import ValidationError
from app.schemas.user import (
    UserCreate,
    UserLogin,
    UserThemeUpdate,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    UserProfileUpdate
)
from app.utils.jwt_utils import create_access_token, verify_token
from app.utils.auth_utils import hash_password, verify_password


@pytest.mark.unit
@pytest.mark.schemas
class TestUserSchemas:
    """Unit tests for user-related Pydantic schemas"""
    
    def test_user_create_valid(self):
        """Test valid user creation data"""
        data = {
            "email": "test@example.com",
            "password": "TestPassword123",
            "first_name": "Test",
            "last_name": "User"
        }
        user = UserCreate(**data)
        assert user.email == "test@example.com"
        assert user.password == "TestPassword123"
        assert user.first_name == "Test"
        assert user.last_name == "User"
        assert user.privacy_accepted is True  # Default value
        assert user.auth_method == "email"  # Default value
        assert user.theme == "dark"  # Default value
    
    def test_user_create_invalid_email(self):
        """Test user creation with invalid email"""
        data = {
            "email": "invalid-email",
            "password": "TestPassword123",
            "first_name": "Test",
            "last_name": "User"
        }
        with pytest.raises(ValidationError):
            UserCreate(**data)
    
    def test_user_create_short_password(self):
        """Test user creation with password shorter than 8 characters"""
        data = {
            "email": "test@example.com",
            "password": "Short1",
            "first_name": "Test",
            "last_name": "User"
        }
        with pytest.raises(ValidationError):
            UserCreate(**data)
    
    def test_user_create_privacy_not_accepted(self):
        """Test user creation with privacy not accepted"""
        data = {
            "email": "test@example.com",
            "password": "TestPassword123",
            "first_name": "Test",
            "last_name": "User",
            "privacy_accepted": False
        }
        with pytest.raises(ValidationError):
            UserCreate(**data)
    
    def test_user_login_valid(self):
        """Test valid user login data"""
        data = {
            "email": "test@example.com",
            "password": "TestPassword123"
        }
        user = UserLogin(**data)
        assert user.email == "test@example.com"
        assert user.password == "TestPassword123"
    
    def test_user_theme_update_valid(self):
        """Test valid theme update"""
        data = {"theme": "light"}
        theme = UserThemeUpdate(**data)
        assert theme.theme == "light"
    
    def test_user_theme_update_empty(self):
        """Test theme update with empty theme"""
        data = {"theme": ""}
        with pytest.raises(ValidationError):
            UserThemeUpdate(**data)
    
    def test_forgot_password_valid(self):
        """Test valid forgot password request"""
        data = {"email": "test@example.com"}
        request = ForgotPasswordRequest(**data)
        assert request.email == "test@example.com"
    
    def test_reset_password_valid(self):
        """Test valid reset password request"""
        data = {
            "token": "valid_token_123",
            "new_password": "NewPassword123"
        }
        request = ResetPasswordRequest(**data)
        assert request.token == "valid_token_123"
        assert request.new_password == "NewPassword123"
    
    def test_reset_password_short_password(self):
        """Test reset password with password shorter than 8 characters"""
        data = {
            "token": "valid_token_123",
            "new_password": "Short1"
        }
        with pytest.raises(ValidationError):
            ResetPasswordRequest(**data)
    
    def test_user_profile_update_valid(self):
        """Test valid user profile update"""
        data = {
            "first_name": "Updated",
            "last_name": "Name"
        }
        profile = UserProfileUpdate(**data)
        assert profile.first_name == "Updated"
        assert profile.last_name == "Name"
    
    def test_user_profile_update_empty_first_name(self):
        """Test user profile update with empty first name"""
        data = {
            "first_name": "",
            "last_name": "Name"
        }
        with pytest.raises(ValidationError):
            UserProfileUpdate(**data)
    
    def test_user_profile_update_empty_last_name(self):
        """Test user profile update with empty last name"""
        data = {
            "first_name": "Updated",
            "last_name": ""
        }
        with pytest.raises(ValidationError):
            UserProfileUpdate(**data)


@pytest.mark.unit
@pytest.mark.utils
class TestJWTUtils:
    """Unit tests for JWT utility functions"""
    
    def test_create_access_token(self):
        """Test creating a JWT access token"""
        payload = {"user_id": 1, "email": "test@example.com"}
        token = create_access_token(payload)
        
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0
    
    def test_verify_token_valid(self):
        """Test verifying a valid JWT token"""
        payload = {"user_id": 1, "email": "test@example.com"}
        token = create_access_token(payload)
        
        verified_payload = verify_token(token)
        assert verified_payload is not None
        assert verified_payload["user_id"] == 1
        assert verified_payload["email"] == "test@example.com"
    
    def test_verify_token_invalid(self):
        """Test verifying an invalid JWT token"""
        invalid_token = "invalid.token.here"
        
        # verify_token returns None for invalid tokens
        result = verify_token(invalid_token)
        assert result is None


@pytest.mark.unit
@pytest.mark.utils
class TestAuthUtils:
    """Unit tests for authentication utility functions"""
    
    def test_hash_password(self):
        """Test password hashing"""
        password = "TestPassword123"
        hashed = hash_password(password)
        
        assert hashed is not None
        assert isinstance(hashed, str)
        assert hashed != password  # Hash should be different from original
        assert len(hashed) > 0
    
    def test_verify_password_correct(self):
        """Test verifying a correct password"""
        password = "TestPassword123"
        hashed = hash_password(password)
        
        assert verify_password(password, hashed) is True
    
    def test_verify_password_incorrect(self):
        """Test verifying an incorrect password"""
        password = "TestPassword123"
        wrong_password = "WrongPassword123"
        hashed = hash_password(password)
        
        assert verify_password(wrong_password, hashed) is False
    
    def test_hash_password_different_hashes(self):
        """Test that the same password produces different hashes"""
        password = "TestPassword123"
        hash1 = hash_password(password)
        hash2 = hash_password(password)
        
        # Different salts should produce different hashes
        assert hash1 != hash2
    
    def test_verify_password_empty_password(self):
        """Test verifying an empty password"""
        password = ""
        hashed = hash_password(password)
        
        assert verify_password(password, hashed) is True
    
    def test_verify_password_empty_hash(self):
        """Test verifying password against empty hash"""
        password = "TestPassword123"
        
        # Empty hash raises UnknownHashError from passlib
        from passlib.exc import UnknownHashError
        with pytest.raises(UnknownHashError):
            verify_password(password, "")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--html=reports/phase2_report.html"])
