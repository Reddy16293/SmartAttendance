from sqlalchemy.orm import Session

from models import User, Subject, Class
from utils.jwt_auth import create_access_token


def make_user(db: Session, name: str, email: str, role: str) -> User:
    user = User(name=name, email=email, role=role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def auth_header(user: User) -> dict:
    token = create_access_token(user_id=user.id, email=user.email, role=user.role)
    return {"Authorization": f"Bearer {token}"}


def test_course_creation_authorized_teacher(client, db_session: Session):
    teacher = make_user(db_session, "Prof Course", "prof-course@example.com", role="teacher")
    headers = auth_header(teacher)

    # Create subject
    subj_resp = client.post(
        "/teachers/subjects",
        headers=headers,
        json={"name": "Data Structures", "code": "DS101"},
    )
    assert subj_resp.status_code == 201, subj_resp.text
    subj = subj_resp.json()

    # Create class for that subject
    class_resp = client.post(
        "/teachers/classes",
        headers=headers,
        json={"subject_id": subj["id"], "teacher_id": teacher.id, "year": 1, "section": "A"},
    )
    assert class_resp.status_code == 201, class_resp.text
    cls = class_resp.json()
    assert cls["subject_id"] == subj["id"]
    assert cls["teacher_id"] == teacher.id


def test_course_creation_rejects_unauthorized(client, db_session: Session):
    student = make_user(db_session, "Stud", "stud-course@example.com", role="student")
    headers = auth_header(student)

    # Student tries to create subject
    subj_resp = client.post(
        "/teachers/subjects",
        headers=headers,
        json={"name": "Networks", "code": "NET100"},
    )
    assert subj_resp.status_code == 403

    # No token
    subj_resp2 = client.post(
        "/teachers/subjects",
        json={"name": "Databases", "code": "DB100"},
    )
    assert subj_resp2.status_code == 401


def test_enrollment_flow_and_duplicates(client, db_session: Session):
    # Setup teacher and class
    teacher = make_user(db_session, "Prof Enroll", "prof-enroll@example.com", role="teacher")
    subj = Subject(name="Operating Systems", code="OS100")
    db_session.add(subj)
    db_session.commit()
    db_session.refresh(subj)
    cls = Class(subject_id=subj.id, teacher_id=teacher.id, year=2, section="B")
    db_session.add(cls)
    db_session.commit()
    db_session.refresh(cls)

    student = make_user(db_session, "Stud Enroll", "stud-enroll@example.com", role="student")
    headers = auth_header(student)

    # Enroll first time
    enroll_resp = client.post(
        "/students/enroll",
        headers=headers,
        json={"class_id": cls.id},
    )
    assert enroll_resp.status_code == 201, enroll_resp.text

    # Duplicate enrollment should be 400
    dup_resp = client.post(
        "/students/enroll",
        headers=headers,
        json={"class_id": cls.id},
    )
    assert dup_resp.status_code == 400

    # Enroll in non-existent class -> 404
    missing_resp = client.post(
        "/students/enroll",
        headers=headers,
        json={"class_id": 9999},
    )
    assert missing_resp.status_code == 404
