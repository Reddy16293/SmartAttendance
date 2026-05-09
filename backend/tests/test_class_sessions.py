from sqlalchemy.orm import Session

from models import User, Subject, Class
from utils.jwt_auth import create_access_token


def make_teacher_with_class(db: Session):
    teacher = User(name="Prof Session", email="prof-session@example.com", role="teacher")
    subj = Subject(name="Session Subject", code="SS101")
    db.add_all([teacher, subj])
    db.commit()
    db.refresh(teacher)
    db.refresh(subj)
    cls = Class(subject_id=subj.id, teacher_id=teacher.id, year=1, section="A")
    db.add(cls)
    db.commit()
    db.refresh(cls)
    return teacher, cls


def auth_header(user: User) -> dict:
    token = create_access_token(user_id=user.id, email=user.email, role=user.role)
    return {"Authorization": f"Bearer {token}"}


def test_start_session_success(client, db_session: Session):
    teacher, cls = make_teacher_with_class(db_session)
    headers = auth_header(teacher)

    res = client.post(
        "/teachers/attendance/session/start",
        headers=headers,
        json={"class_id": cls.id, "qr_enabled": False},
    )

    assert res.status_code == 201, res.text
    data = res.json()
    assert data["class_id"] == cls.id
    assert data["status"] == "open"


def test_finalize_session(client, db_session: Session):
    teacher, cls = make_teacher_with_class(db_session)
    headers = auth_header(teacher)

    start = client.post(
        "/teachers/attendance/session/start",
        headers=headers,
        json={"class_id": cls.id, "qr_enabled": False},
    )
    assert start.status_code == 201, start.text
    session_id = start.json()["id"]

    fin = client.post(f"/teachers/attendance/session/{session_id}/finalize", headers=headers)
    assert fin.status_code == 200, fin.text
    body = fin.json()
    assert body.get("success") is True


def test_prevent_multiple_active_sessions_per_class(client, db_session: Session):
    teacher, cls = make_teacher_with_class(db_session)
    headers = auth_header(teacher)

    first = client.post(
        "/teachers/attendance/session/start",
        headers=headers,
        json={"class_id": cls.id, "qr_enabled": False},
    )
    assert first.status_code == 201, first.text

    second = client.post(
        "/teachers/attendance/session/start",
        headers=headers,
        json={"class_id": cls.id, "qr_enabled": False},
    )

    # Expect rejection when trying to start another active session for same class
    assert second.status_code == 400
