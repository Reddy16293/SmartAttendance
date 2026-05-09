from sqlalchemy.orm import Session

from models import User, Subject, Class
from utils.jwt_auth import create_access_token


def create_user(db: Session, name: str, email: str, role: str) -> User:
    user = User(name=name, email=email, role=role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def create_subject_class(db: Session, teacher: User) -> Class:
    subj = Subject(name="Algorithms", code="ALG101")
    db.add(subj)
    db.commit()
    db.refresh(subj)
    cls = Class(subject_id=subj.id, teacher_id=teacher.id, year=1, section="A")
    db.add(cls)
    db.commit()
    db.refresh(cls)
    return cls


def auth_header_for(user: User) -> dict:
    token = create_access_token(user_id=user.id, email=user.email, role=user.role)
    return {"Authorization": f"Bearer {token}"}


def test_student_endpoints_require_auth(client):
    # No token should return 401
    r1 = client.get("/students/enrollments")
    r2 = client.get("/students/attendance")
    assert r1.status_code == 401
    assert r2.status_code == 401


def test_student_enroll_and_list_enrollments(client, db_session: Session):
    teacher = create_user(db_session, "Prof", "prof1@example.com", role="teacher")
    cls = create_subject_class(db_session, teacher)
    student = create_user(db_session, "Student", "stud1@example.com", role="student")

    headers = auth_header_for(student)

    # Enroll
    res = client.post("/students/enroll", headers=headers, json={"class_id": cls.id})
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["class_id"] == cls.id
    assert body["student_id"] == student.id

    # List enrollments
    res2 = client.get("/students/enrollments", headers=headers)
    assert res2.status_code == 200
    enrollments = res2.json()
    assert any(e["class_id"] == cls.id for e in enrollments)


def test_teacher_cannot_access_student_endpoints(client, db_session: Session):
    teacher = create_user(db_session, "Prof Two", "prof2@example.com", role="teacher")
    headers = auth_header_for(teacher)

    # Enroll attempt
    r1 = client.post("/students/enroll", headers=headers, json={"class_id": 1})
    # List enrollments attempt
    r2 = client.get("/students/enrollments", headers=headers)
    # Attendance summary attempt
    r3 = client.get("/students/attendance", headers=headers)

    assert r1.status_code == 403
    assert r2.status_code == 403
    assert r3.status_code == 403


def test_profile_fetching_student(client, db_session: Session):
    student = create_user(db_session, "Stud User", "studprof@example.com", role="student")
    headers = auth_header_for(student)
    res = client.get("/auth/me", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == "studprof@example.com"
    assert data["role"] == "student"
