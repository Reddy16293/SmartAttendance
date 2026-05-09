from typing import Dict
from sqlalchemy.orm import Session

from utils.jwt_auth import create_access_token
from models import User


def create_user(db: Session, name: str, email: str, role: str, password_hash: str = None) -> User:
    user = User(name=name, email=email, role=role, password_hash=password_hash)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def auth_header_for(user: User) -> Dict[str, str]:
    token = create_access_token(user_id=user.id, email=user.email, role=user.role)
    return {"Authorization": f"Bearer {token}"}


def test_register_and_login_success(client):
    # Register
    res = client.post(
        "/auth/register",
        json={
            "name": "Alice",
            "email": "alice@example.com",
            "password": "supersecurepassword",
            "role": "STUDENT",
        },
    )
    assert res.status_code == 201, res.text
    data = res.json()
    assert data["access_token"]
    assert data["user"]["email"] == "alice@example.com"
    assert data["user"]["role"] == "student"

    # Login
    res2 = client.post(
        "/auth/login",
        json={"email": "alice@example.com", "password": "supersecurepassword"},
    )
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["access_token"]
    assert data2["user"]["email"] == "alice@example.com"


def test_register_duplicate_email_400(client):
    payload = {
        "name": "Bob",
        "email": "bob@example.com",
        "password": "anothersecurepw",
        "role": "TEACHER",
    }
    res1 = client.post("/auth/register", json=payload)
    assert res1.status_code == 201
    res2 = client.post("/auth/register", json=payload)
    assert res2.status_code == 400
    assert "Email already registered" in res2.text


def test_login_invalid_password_401(client):
    # Register
    client.post(
        "/auth/register",
        json={
            "name": "Carol",
            "email": "carol@example.com",
            "password": "rightpassword",
            "role": "STUDENT",
        },
    )
    # Wrong password
    res = client.post(
        "/auth/login",
        json={"email": "carol@example.com", "password": "wrongpassword"},
    )
    assert res.status_code == 401


def test_me_requires_auth_and_returns_user(client, db_session: Session):
    user = create_user(db_session, "Teacher Tom", "tom@example.com", role="teacher")
    # No token -> 403 from HTTPBearer
    res1 = client.get("/auth/me")
    assert res1.status_code in (401, 403)

    headers = auth_header_for(user)
    res2 = client.get("/auth/me", headers=headers)
    assert res2.status_code == 200
    me = res2.json()
    assert me["email"] == "tom@example.com"
    assert me["role"] == "teacher"


def test_rbac_teacher_only_routes_forbid_student(client, db_session: Session):
    student = create_user(db_session, "Stu", "stu@example.com", role="student")
    headers = auth_header_for(student)
    # Attempt to create subject as student
    res = client.post(
        "/teachers/subjects",
        headers=headers,
        json={"name": "Math", "code": "MTH101"},
    )
    assert res.status_code == 403


def test_rbac_student_only_routes_forbid_teacher(client, db_session: Session):
    teacher = create_user(db_session, "Teach", "teach@example.com", role="teacher")
    headers = auth_header_for(teacher)
    # Attempt to enroll as teacher
    res = client.post(
        "/students/enroll",
        headers=headers,
        json={"class_id": 1},
    )
    assert res.status_code == 403
