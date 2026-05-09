from sqlalchemy.orm import Session

from models import User
from utils.jwt_auth import create_access_token


def create_user(db: Session, name: str, email: str, role: str) -> User:
    user = User(name=name, email=email, role=role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def test_protected_without_token_returns_401(client):
    res = client.get("/auth/me")
    # Expect 401 for unauthenticated access
    assert res.status_code == 401


def test_protected_with_invalid_token_returns_401(client):
    headers = {"Authorization": "Bearer not_a_valid_token"}
    res = client.get("/auth/me", headers=headers)
    assert res.status_code == 401


def test_protected_with_valid_token_returns_200(client, db_session: Session):
    user = create_user(db_session, name="Jane Doe", email="jane@example.com", role="student")
    token = create_access_token(user_id=user.id, email=user.email, role=user.role)
    headers = {"Authorization": f"Bearer {token}"}
    res = client.get("/auth/me", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert body["email"] == "jane@example.com"
    assert body["role"] == "student"
