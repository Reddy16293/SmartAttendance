"""
Authentication service layer for College Attendance System.
Encapsulates DB access and auth flows.
"""

from typing import Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models import User
from schemas import UserRegister, UserRole
from services.audit_service import log_audit
from utils import (
    hash_password,
    verify_password,
    create_access_token,
    get_user_by_email,
    get_user_by_roll_number,
    get_user_by_id,
)
from utils.google_oauth import verify_google_id_token
from utils.roll_number import extract_roll_number_from_email, validate_roll_number


class AuthService:
    """Service for authentication and user lookup flows."""

    AUTHORIZED_DOMAINS = []  # Empty list = allow all domains

    def __init__(self, db: Session) -> None:
        self.db = db

    def authenticate_local(self, identifier: str, password: str) -> User:
        """Authenticate a local user by email or roll number."""
        normalized = identifier.strip().lower()
        if "@" in normalized:
            user = get_user_by_email(self.db, normalized)
        else:
            user = get_user_by_roll_number(self.db, normalized)

        if not user or not user.password_hash:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid identifier or password",
            )

        if not verify_password(password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid identifier or password",
            )

        log_audit(self.db, user.id, "login_jwt", "user", user.id, {"email": user.email})
        return user

    def authenticate_google(self, id_token: str, role: UserRole) -> Tuple[User, str, Optional[str]]:
        """Authenticate or create a user via Google OAuth."""
        try:
            google_user_info = verify_google_id_token(id_token)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=str(exc),
            ) from exc

        email = google_user_info["email"]
        if self.AUTHORIZED_DOMAINS:
            email_domain = email.split("@")[1] if "@" in email else ""
            if email_domain not in self.AUTHORIZED_DOMAINS:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=(
                        "Only emails from authorized domains are allowed: "
                        f"{', '.join(self.AUTHORIZED_DOMAINS)}"
                    ),
                )

        google_id = google_user_info["sub"]
        name = google_user_info.get("name", "").strip() or email.split("@")[0]
        roll_number = extract_roll_number_from_email(email)
        if roll_number and not validate_roll_number(roll_number):
            roll_number = ""

        requested_role = role.value if hasattr(role, "value") else str(role).lower()
        if requested_role not in {"student", "teacher"}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid role. Use STUDENT or TEACHER",
            )

        user = get_user_by_email(self.db, email)
        role_warning = None

        if user:
            if not user.google_id:
                user.google_id = google_id
            user.provider = "GOOGLE"
            if roll_number and not user.roll_number:
                user.roll_number = roll_number
            if user.name != name:
                user.name = name
            self.db.commit()
            self.db.refresh(user)
        else:
            user_kwargs = {
                "name": name,
                "email": email,
                "roll_number": roll_number or None,
                "google_id": google_id,
                "role": requested_role,
                "password_hash": None,
            }
            user_kwargs["provider"] = "GOOGLE"
            user = User(**user_kwargs)
            self.db.add(user)
            self.db.commit()
            self.db.refresh(user)

        log_audit(self.db, user.id, "login_google", "user", user.id, {"email": user.email})
        token = self.generate_jwt(user)
        return user, token, role_warning

    def generate_jwt(self, user: User) -> str:
        """Generate a JWT token for a user."""
        return create_access_token(
            user_id=user.id,
            email=user.email,
            role=user.role,
        )

    def register_user(self, request: UserRegister) -> User:
        """Register a new user with email and password."""
        existing_user = get_user_by_email(self.db, request.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )

        role_value = request.role
        if hasattr(role_value, "value"):
            role_value = role_value.value
        elif isinstance(role_value, str):
            role_value = role_value.lower()
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid role type",
            )

        if role_value not in {"student", "teacher"}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid role. Use STUDENT or TEACHER",
            )

        user = User(
            name=request.name,
            email=request.email,
            password_hash=hash_password(request.password),
            role=role_value,
            provider="LOCAL",
        )

        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)

        log_audit(self.db, user.id, "register", "user", user.id, {"email": user.email, "role": user.role})
        return user

    def get_user_or_404(self, user_id: int) -> User:
        """Return a user or raise if missing."""
        user = get_user_by_id(self.db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        return user
