import pytest
from sqlalchemy.orm import Session

from models import User


def create_user(db: Session, name: str, email: str, role: str, google_id: str | None = None) -> User:
    user = User(name=name, email=email, role=role, google_id=google_id)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def test_google_existing_user_login(client, db_session: Session, monkeypatch: pytest.MonkeyPatch):
    # Arrange existing user with linked google_id
    existing = create_user(
        db_session,
        name="Existing User",
        email="existing@example.com",
        role="student",
        google_id="google-sub-123",
    )

    def fake_verify(id_token_str: str):
        return {
            "sub": "google-sub-123",
            "email": "existing@example.com",
            "name": "Existing User",
            "email_verified": True,
        }

    monkeypatch.setattr("utils.google_oauth.verify_google_id_token", fake_verify)

    # Act
    res = client.post("/auth/google", json={"id_token": "dummy"})

    # Assert
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["access_token"]
    assert body["user"]["id"] == existing.id
    assert body["user"]["email"] == "existing@example.com"


def test_google_new_user_creation(client, db_session: Session, monkeypatch: pytest.MonkeyPatch):
    # Arrange: no user exists with google_id or email
    def fake_verify(id_token_str: str):
        return {
            "sub": "new-google-sub-999",
            "email": "newuser@example.com",
            "name": "New User",
            "email_verified": True,
        }

    monkeypatch.setattr("utils.google_oauth.verify_google_id_token", fake_verify)

    # Act: role omitted -> defaults to STUDENT
    res = client.post("/auth/google", json={"id_token": "dummy"})

    # Assert
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["access_token"]
    assert data["user"]["email"] == "newuser@example.com"
    assert data["user"]["name"] == "New User"
    assert data["user"]["role"] == "student"


def test_google_invalid_token_handling(client, monkeypatch: pytest.MonkeyPatch):
    def fake_verify(id_token_str: str):
        raise ValueError("bad-token")

    monkeypatch.setattr("utils.google_oauth.verify_google_id_token", fake_verify)

    res = client.post("/auth/google", json={"id_token": "invalid"})
    assert res.status_code == 401
    assert "bad-token" in res.text
