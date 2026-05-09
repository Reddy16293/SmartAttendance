from sqlalchemy.orm import Session

from utils.jwt_auth import create_access_token
from models import User, Subject, Class, StudentEnrollment


def make_token(user: User) -> str:
    return create_access_token(user_id=user.id, email=user.email, role=user.role)


def setup_class_with_enrollment(db: Session):
    teacher = User(name="Prof X", email="prof@example.com", role="teacher")
    student = User(name="Stud Y", email="stud@example.com", role="student")
    subj = Subject(name="Physics", code="PHY100")
    db.add_all([teacher, student, subj])
    db.commit()
    db.refresh(teacher)
    db.refresh(student)
    db.refresh(subj)

    cls = Class(subject_id=subj.id, teacher_id=teacher.id, year=1, section="A")
    db.add(cls)
    db.commit()
    db.refresh(cls)

    enrollment = StudentEnrollment(student_id=student.id, class_id=cls.id)
    db.add(enrollment)
    db.commit()

    return teacher, student, cls


def test_qr_verification_valid_and_invalid(client, db_session: Session):
    teacher, student, cls = setup_class_with_enrollment(db_session)

    teacher_headers = {"Authorization": f"Bearer {make_token(teacher)}"}
    student_headers = {"Authorization": f"Bearer {make_token(student)}"}

    # Start session with QR enabled
    res = client.post(
        "/teachers/attendance/session/start",
        headers=teacher_headers,
        json={"class_id": cls.id, "qr_enabled": True},
    )
    assert res.status_code == 201, res.text
    session_id = res.json()["id"]

    # Fetch session to get QR code
    res2 = client.get(f"/teachers/attendance/session/{session_id}", headers=teacher_headers)
    assert res2.status_code == 200
    qr_code = res2.json()["qr_code"]
    assert qr_code

    # Invalid QR -> verified False
    bad = client.post(
        f"/attendance/session/{session_id}/verify",
        headers=student_headers,
        json={"qr_code": "WRONG", "student_id": student.id},
    )
    assert bad.status_code == 200
    assert bad.json()["verified"] is False

    # Valid QR -> verified True
    good = client.post(
        f"/attendance/session/{session_id}/verify",
        headers=student_headers,
        json={"qr_code": qr_code, "student_id": student.id},
    )
    assert good.status_code == 200
    body = good.json()
    assert body["verified"] is True
    assert body["attendance_record"]["qr_verified"] is True

    # Finalize session then attempt again -> 400 Session is closed
    fin = client.post(f"/teachers/attendance/session/{session_id}/finalize", headers=teacher_headers)
    assert fin.status_code == 200

    closed = client.post(
        f"/attendance/session/{session_id}/verify",
        headers=student_headers,
        json={"qr_code": qr_code, "student_id": student.id},
    )
    assert closed.status_code == 400
    assert "Session is closed" in closed.text
