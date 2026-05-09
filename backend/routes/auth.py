"""
Authentication routes for College Attendance System.
Handles user registration, login, Google OAuth, and current user retrieval.
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from db.session import get_db
from schemas import (
    UserRegister,
    LoginRequest,
    GoogleAuthRequest,
    TokenResponse,
    CurrentUserResponse,
    UserResponse,
)
from utils import (
    get_current_user,
    TokenData,
)
from services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    request: UserRegister,
    db: Session = Depends(get_db),
):
    """
    Register a new user (student or teacher).
    
    Args:
        request: User registration details
        db: Database session
        
    Returns:
        JWT token and user information
        
    Raises:
        HTTPException: If email already exists
    """
    service = AuthService(db)
    user = service.register_user(request)
    token = service.generate_jwt(user)
    return TokenResponse(
        access_token=token,
        user=UserResponse.from_orm(user),
    )



@router.post("/login")
async def login(
    request: LoginRequest,
    db: Session = Depends(get_db),
):
    """
    Login with email/roll number and password.
    
    Args:
        request: Identifier and password
        db: Database session
        
    Returns:
        JWT token and user information
        
    Raises:
        HTTPException: If identifier/password is incorrect
    """
    service = AuthService(db)
    user = service.authenticate_local(request.identifier, request.password)
    token = service.generate_jwt(user)
    return {"access_token": token}


@router.post("/google", response_model=TokenResponse)
async def google_auth(
    request: GoogleAuthRequest,
    db: Session = Depends(get_db),
):
    """
    Google OAuth authentication with university domain validation.
    Creates new user if doesn't exist, or logs in existing user.
    Only allows emails from authorized domains (e.g., @nitc.ac.in).
    
    Args:
        request: Google ID token and optional role
        db: Database session
        
    Returns:
        JWT token and user information
        
    Raises:
        HTTPException: If Google token is invalid or email domain not authorized
    """
    service = AuthService(db)
    user, token, role_warning = service.authenticate_google(request.id_token, request.role)
    response = TokenResponse(
        access_token=token,
        user=UserResponse.from_orm(user),
        role_warning=role_warning,
    )
    return response


@router.get("/me", response_model=CurrentUserResponse)
async def get_current_user_info(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get current authenticated user's information.
    
    Args:
        current_user: Current authenticated user (from JWT)
        db: Database session
        
    Returns:
        Current user's detailed information
        
    Raises:
        HTTPException: If user not found in database
    """
    service = AuthService(db)
    user = service.get_user_or_404(current_user.user_id)
    return CurrentUserResponse.from_orm(user)
