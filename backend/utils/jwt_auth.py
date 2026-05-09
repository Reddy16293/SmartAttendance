"""
JWT authentication utilities for College Attendance System.
Handles token generation, verification, and role-based access control.
"""

import os
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

# Password hashing
pwd_context = CryptContext(
    schemes=["argon2", "bcrypt"],
    deprecated="auto",
)


# HTTP Bearer for JWT extraction (no auto_error so we can return 401)
security = HTTPBearer(auto_error=False)


class TokenData(BaseModel):
    """Token payload data"""
    user_id: int
    email: str
    role: str
    iat: datetime
    exp: datetime


def hash_password(password: str) -> str:
    """
    Hash a password using argon2.
    
    Args:
        password: Plain text password
        
    Returns:
        Hashed password
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against its hash.
    
    Args:
        plain_password: Plain text password
        hashed_password: Hashed password from database
        
    Returns:
        True if password matches, False otherwise
    """
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(
    user_id: int,
    email: str,
    role: str,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Create a JWT access token.
    
    Args:
        user_id: User ID
        email: User email
        role: User role (student or teacher)
        expires_delta: Custom expiration time
        
    Returns:
        JWT token string
    """
    if expires_delta is None:
        expires_delta = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    expire = datetime.utcnow() + expires_delta
    # Use datetime objects for iat/exp so PyJWT encodes proper numeric timestamps
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "iat": datetime.utcnow(),
        "exp": expire,
    }
    
    encoded_jwt = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> TokenData:
    """
    Verify and decode a JWT token.
    
    Args:
        token: JWT token string
        
    Returns:
        TokenData with user information
        
    Raises:
        HTTPException: If token is invalid or expired
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("user_id")
        email: str = payload.get("email")
        role: str = payload.get("role")
        
        if user_id is None or email is None or role is None:
            raise credentials_exception
        
        # Normalize iat/exp to datetime regardless of underlying type
        def _to_dt(value):
            if isinstance(value, datetime):
                return value
            if isinstance(value, (int, float)):
                return datetime.utcfromtimestamp(value)
            if isinstance(value, str):
                return datetime.fromisoformat(value)
            raise ValueError("Invalid datetime value in token")

        token_data = TokenData(
            user_id=user_id,
            email=email,
            role=role,
            iat=_to_dt(payload.get("iat")),
            exp=_to_dt(payload.get("exp")),
        )
        return token_data
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise credentials_exception


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> TokenData:
    """
    Dependency to get current authenticated user from JWT token.
    
    Args:
        credentials: HTTP Bearer token from request
        
    Returns:
        TokenData with user information
        
    Raises:
        HTTPException: If token is invalid or not provided
    """
    if credentials is None or not credentials.scheme or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return verify_token(credentials.credentials)


async def get_current_teacher(current_user: TokenData = Depends(get_current_user)) -> TokenData:
    """
    Dependency to verify current user is a teacher.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        TokenData if user is teacher
        
    Raises:
        HTTPException: If user is not a teacher
    """
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can access this resource",
        )
    return current_user


async def get_current_student(current_user: TokenData = Depends(get_current_user)) -> TokenData:
    """
    Dependency to verify current user is a student.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        TokenData if user is student
        
    Raises:
        HTTPException: If user is not a student
    """
    if current_user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can access this resource",
        )
    return current_user
