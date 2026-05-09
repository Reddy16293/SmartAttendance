"""
Seed script for pre-creating users with local passwords.
"""

import argparse
import json
from typing import List, Dict

from passlib.context import CryptContext
from sqlalchemy.orm import Session

from database import SessionLocal
from models import User
from utils import get_user_by_email, get_user_by_roll_number


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _require_user_fields(user_data: Dict[str, str]) -> None:
    missing = [
        field
        for field in ("email", "roll_number", "password", "name", "role")
        if not user_data.get(field)
    ]
    if missing:
        raise ValueError(f"Missing required fields: {', '.join(missing)}")


def _assert_model_fields() -> None:
    if not hasattr(User, "roll_number"):
        raise RuntimeError("User model missing roll_number")
    if not hasattr(User, "provider"):
        raise RuntimeError("User model missing provider")


def _normalize_role(role_value: str) -> str:
    value = role_value.lower().strip()
    if value not in {"student", "teacher"}:
        raise ValueError("role must be 'student' or 'teacher'")
    return value


def seed_users(db: Session, users: List[Dict[str, str]]) -> int:
    _assert_model_fields()
    seeded = 0

    for user_data in users:
        _require_user_fields(user_data)
        email = user_data["email"].strip().lower()
        roll_number = user_data["roll_number"].strip().lower()
        name = user_data["name"].strip()
        role = _normalize_role(user_data["role"])
        password = user_data["password"]

        if not email or not roll_number:
            raise ValueError("email and roll_number are required")

        user = get_user_by_email(db, email) or get_user_by_roll_number(db, roll_number)
        password_hash = pwd_context.hash(password)

        if user:
            user.email = email
            user.roll_number = roll_number
            user.name = name
            user.role = role
            user.password_hash = password_hash
            user.provider = "LOCAL"
        else:
            user = User(
                name=name,
                email=email,
                roll_number=roll_number,
                role=role,
                password_hash=password_hash,
                provider="LOCAL",
            )
            db.add(user)

        seeded += 1

    db.commit()
    return seeded


def _load_users_from_file(path: str) -> List[Dict[str, str]]:
    with open(path, "r", encoding="utf-8") as handle:
        payload = json.load(handle)

    if not isinstance(payload, list):
        raise ValueError("Seed file must be a list of user objects")

    return payload


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed local users")
    parser.add_argument("--file", required=True, help="Path to JSON seed file")
    args = parser.parse_args()

    users = _load_users_from_file(args.file)

    db = SessionLocal()
    try:
        count = seed_users(db, users)
        print(f"✅ Seeded {count} users")
    finally:
        db.close()


if __name__ == "__main__":
    main()
