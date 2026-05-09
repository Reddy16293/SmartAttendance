"""
Pydantic schemas for User-related API requests and responses.
"""

from pydantic import BaseModel, EmailStr, Field, TypeAdapter, field_validator
from datetime import datetime
from enum import Enum
from typing import Optional
from utils.roll_number import validate_roll_number


class UserRole(str, Enum):
    """User role enumeration"""
    STUDENT = "student"
    TEACHER = "teacher"


# Request Schemas
class UserRegister(BaseModel):
    """Schema for user registration"""
    name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=72)
    role: UserRole

    @field_validator('role', mode='before')
    @classmethod
    def validate_role(cls, v):
        """Accept role in any case and convert to proper enum"""
        if isinstance(v, str):
            v_upper = v.upper()
            if v_upper == 'STUDENT':
                return UserRole.STUDENT
            if v_upper == 'TEACHER':
                return UserRole.TEACHER
        return v


class LoginRequest(BaseModel):
    """Schema for unified email/roll login"""
    identifier: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=8, max_length=72)

    @field_validator("identifier")
    @classmethod
    def validate_identifier(cls, v: str) -> str:
        """Accept email or roll number identifiers."""
        value = v.strip()
        if not value:
            raise ValueError("identifier must not be empty")

        if "@" in value:
            email_adapter = TypeAdapter(EmailStr)
            try:
                email_adapter.validate_python(value)
            except Exception as exc:
                raise ValueError("identifier must be a valid email or roll number") from exc
            return value.lower()

        if not validate_roll_number(value):
            raise ValueError("identifier must be a valid email or roll number")

        return value.lower()


class GoogleAuthRequest(BaseModel):
    """Schema for Google OAuth authentication"""
    id_token: str = Field(..., description="Google ID token from frontend")
    role: Optional[UserRole] = Field(default=UserRole.STUDENT, description="User role for new accounts")

    @field_validator('role', mode='before')
    @classmethod
    def validate_role(cls, v):
        """Accept role in any case and convert to proper enum"""
        if v is None:
            return UserRole.STUDENT
        if isinstance(v, str):
            v_upper = v.upper()
            if v_upper == 'STUDENT':
                return UserRole.STUDENT
            if v_upper == 'TEACHER':
                return UserRole.TEACHER
        return v


# Response Schemas
class UserBase(BaseModel):
    """Base user response schema"""
    id: int
    name: str
    email: str
    role: UserRole
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserResponse(UserBase):
    """User response schema"""
    pass


class UserDetailResponse(UserBase):
    """Detailed user response with all fields"""
    google_id: Optional[str] = None


class TokenResponse(BaseModel):
    """JWT token response"""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    role_warning: Optional[str] = None


class CurrentUserResponse(UserDetailResponse):
    """Current authenticated user response"""
    pass
