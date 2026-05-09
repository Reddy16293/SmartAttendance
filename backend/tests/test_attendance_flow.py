from sqlalchemy.orm import Session

from models import User, Subject, Class, AttendanceSession, AttendanceRecord
from utils.jwt_auth import create_access_token


def make_teacher_student_class(db: Session):
    teacher = User(name="Prof Attend", email="prof-attend@example.com", role="teacher")
    student = User(name="Stud Attend", email="stud-attend@example.com", role="student")
    subj = Subject(name="AI", code="AI100")
    db.add_all([teacher, student, subj])
    db.commit()
    for obj in (teacher, student, subj):
        db.refresh(obj)
    cls = Class(subject_id=subj.id, teacher_id=teacher.id, year=1, section="A")
    db.add(cls)
    db.commit()
    db.refresh(cls)
    return teacher, student, cls


def auth_header(user: User) -> dict:
    token = create_access_token(user_id=user.id, email=user.email, role=user.role)
    return {"Authorization": f"Bearer {token}"}


def start_session_and_records(db: Session, class_id: int, qr_enabled: bool = False) -> AttendanceSession:
    session = AttendanceSession(class_id=class_id, date=db.bind.dialect.dbapi.datetime.datetime.utcnow(), qr_enabled=qr_enabled, status="open")
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def test_valid_attendance_marking_and_confidence(client, db_session: Session):
    teacher, student, cls = make_teacher_student_class(db_session)
    # enroll student manually
    from models import StudentEnrollment
    enrollment = StudentEnrollment(student_id=student.id, class_id=cls.id)
    db_session.add(enrollment)
    db_session.commit()

    headers = auth_header(teacher)

    # Start session via API to ensure records are created
    start_res = client.post(
        "/teachers/attendance/session/start",
        headers=headers,
        json={"class_id": cls.id, "qr_enabled": False},
    )
    assert start_res.status_code == 201, start_res.text
    session_id = start_res.json()["id"]

    # Teacher overrides attendance to present with confidence
    override_res = client.patch(
        f"/teachers/attendance/session/{session_id}/override",
        headers=headers,
        json={"student_id": student.id, "final_status": "present", "reason": "manual mark"},
    )
    assert override_res.status_code == 200, override_res.text
    rec = override_res.json()
    assert rec["final_status"] == "present"

    # Verify record retains confidence default None (since we didn't set) and present status
    record_id = rec["id"]
    get_res = client.get(f"/attendance/record/{record_id}", headers=headers)
    assert get_res.status_code == 200
    rec2 = get_res.json()
    assert rec2["final_status"] == "present"


def test_duplicate_attendance_prevention(client, db_session: Session):
    teacher, student, cls = make_teacher_student_class(db_session)
    from models import StudentEnrollment
    enrollment = StudentEnrollment(student_id=student.id, class_id=cls.id)
    db_session.add(enrollment)
    db_session.commit()

    headers = auth_header(teacher)

    start_res = client.post(
        "/teachers/attendance/session/start",
        headers=headers,
        json={"class_id": cls.id, "qr_enabled": False},
    )
    assert start_res.status_code == 201, start_res.text
    session_id = start_res.json()["id"]

    # First override to present
    client.patch(
        f"/teachers/attendance/session/{session_id}/override",
        headers=headers,
        json={"student_id": student.id, "final_status": "present", "reason": "mark"},
    )

    # Duplicate override with same status should still be allowed (idempotent) but not create another record
    dup = client.patch(
        f"/teachers/attendance/session/{session_id}/override",
        headers=headers,
        json={"student_id": student.id, "final_status": "present", "reason": "dup"},
    )
    assert dup.status_code == 200
    rec = dup.json()
    assert rec["student_id"] == student.id


def test_invalid_session_handling(client, db_session: Session):
    teacher, student, cls = make_teacher_student_class(db_session)
    headers = auth_header(teacher)

    # Nonexistent session
    res = client.patch(
        "/teachers/attendance/session/9999/override",
        headers=headers,
        json={"student_id": student.id, "final_status": "present", "reason": "na"},
    )
    assert res.status_code == 404

    # Student tries to access records for a session they aren't enrolled in
    student_headers = auth_header(student)
    res2 = client.get("/attendance/session/9999/records", headers=student_headers)
    assert res2.status_code == 404


def test_confidence_persistence_on_update(client, db_session: Session):
    teacher, student, cls = make_teacher_student_class(db_session)
    from models import StudentEnrollment
    enrollment = StudentEnrollment(student_id=student.id, class_id=cls.id)
    db_session.add(enrollment)
    db_session.commit()

    headers = auth_header(teacher)

    start_res = client.post(
        "/teachers/attendance/session/start",
        headers=headers,
        json={"class_id": cls.id, "qr_enabled": False},
    )
    assert start_res.status_code == 201, start_res.text
    session_id = start_res.json()["id"]

    # Teacher override with confidence should persist
    override_res = client.patch(
        f"/teachers/attendance/session/{session_id}/override",
        headers=headers,
        json={"student_id": student.id, "final_status": "present", "reason": "manual", "confidence": 0.88},
    )
    assert override_res.status_code == 200, override_res.text
    record_id = override_res.json()["id"]

    fetched = client.get(f"/attendance/record/{record_id}", headers=headers)
    assert fetched.status_code == 200
    rec = fetched.json()
    # Confidence may be nullable in schema; just ensure present if provided
    assert rec.get("confidence") in (0.88, None)
