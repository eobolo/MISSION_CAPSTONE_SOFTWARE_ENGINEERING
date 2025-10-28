from pydantic import BaseModel, EmailStr, validator
from typing import Optional




class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class PrivacyAcceptance(BaseModel):
    accepted: bool


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
    
    @validator("new_password")
    def password_must_be_strong(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return v

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    privacy_accepted: bool = True
    auth_method: str = 'email'
    theme: str = 'dark'

    # Validator for password strength
    # Purpose: Ensure password meets minimum length requirement
    @validator("password")
    def password_must_be_strong(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return v
    
    @validator("privacy_accepted")
    def privacy_must_be_accepted(cls, v):
        if not v:
            raise ValueError("Privacy terms must be accepted to create an account")
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserThemeUpdate(BaseModel):
    theme: str
    
    @validator("theme")
    def theme_must_not_be_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("Theme cannot be empty")
        return v.strip()

class UserProfileUpdate(BaseModel):
    first_name: str
    last_name: str
    
    @validator("first_name")
    def first_name_must_not_be_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("First name cannot be empty")
        return v.strip()
    
    @validator("last_name")
    def last_name_must_not_be_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("Last name cannot be empty")
        return v.strip()
