from pydantic import BaseModel, EmailStr, validator
from typing import Optional


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str

    # Validator for password strength
    # Purpose: Ensure password meets minimum length requirement
    @validator("password")
    def password_must_be_strong(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str