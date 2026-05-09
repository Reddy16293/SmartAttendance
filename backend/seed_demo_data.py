"""Seed deterministic demo data across core backend tables.

This script is idempotent for the demo keys used below, so it can be run multiple times.
"""

from __future__ import annotations

from datetime import datetime, timedelta, time
from uuid import uuid4

from passlib.context import CryptContext
from sqlalchemy.orm import Session

from database import SessionLocal
from models import (
    AttendanceRecord,
    AttendanceSession,
    AttendanceStatus,
    AuditLog,
    Class,
    ClassSchedule,
    EnrollmentCode,
    SessionStatus,
    StudentEnrollment,
    Subject,
    User,
    UserRole,
)
from models.timetable import SubjectColor, Timetable


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def upsert_user(
    db: Session,
    *,
    email: str,
    name: str,
    roll_number: str,
    role: str,
    password: str,
) -> User:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email)
        db.add(user)

    user.name = name
    user.roll_number = roll_number
    user.role = role
    user.provider = "LOCAL"
    user.password_hash = pwd_context.hash(password)
    return user


def upsert_subject(db: Session, *, code: str, name: str) -> Subject:
    subject = db.query(Subject).filter(Subject.code == code).first()
    if not subject:
        subject = Subject(code=code, name=name)
        db.add(subject)
    else:
        subject.name = name
    return subject


def upsert_subject_color(db: Session, *, subject_id: int, color_code: str, text_color: str) -> SubjectColor:
    color = db.query(SubjectColor).filter(SubjectColor.subject_id == subject_id).first()
    if not color:
        color = SubjectColor(subject_id=subject_id)
        db.add(color)

    color.color_code = color_code
    color.text_color = text_color
    return color


def upsert_class(db: Session, *, subject_id: int, teacher_id: int, year: int, section: str) -> Class:
    cls = (
        db.query(Class)
        .filter(
            Class.subject_id == subject_id,
            Class.teacher_id == teacher_id,
            Class.year == year,
            Class.section == section,
        )
        .first()
    )
    if not cls:
        cls = Class(
            subject_id=subject_id,
            teacher_id=teacher_id,
            year=year,
            section=section,
        )
        db.add(cls)
    return cls


def upsert_schedule(
    db: Session,
    *,
    class_id: int,
    day_of_week: int,
    start_time: time,
    end_time: time,
    room_number: str,
) -> ClassSchedule:
    schedule = (
        db.query(ClassSchedule)
        .filter(
            ClassSchedule.class_id == class_id,
            ClassSchedule.day_of_week == day_of_week,
            ClassSchedule.start_time == start_time,
        )
        .first()
    )
    if not schedule:
        schedule = ClassSchedule(
            class_id=class_id,
            day_of_week=day_of_week,
            start_time=start_time,
            end_time=end_time,
            room_number=room_number,
        )
        db.add(schedule)
    else:
        schedule.end_time = end_time
        schedule.room_number = room_number
    return schedule


def upsert_timetable(
    db: Session,
    *,
    class_id: int,
    day_of_week: int,
    start_time: time,
    end_time: time,
    room_number: str,
) -> Timetable:
    entry = (
        db.query(Timetable)
        .filter(
            Timetable.class_id == class_id,
            Timetable.day_of_week == day_of_week,
            Timetable.start_time == start_time,
        )
        .first()
    )
    if not entry:
        entry = Timetable(
            class_id=class_id,
            day_of_week=day_of_week,
            start_time=start_time,
            end_time=end_time,
            room_number=room_number,
        )
        db.add(entry)
    else:
        entry.end_time = end_time
        entry.room_number = room_number
    return entry


def ensure_enrollment(db: Session, *, student_id: int, class_id: int) -> StudentEnrollment:
    enrollment = (
        db.query(StudentEnrollment)
        .filter(StudentEnrollment.student_id == student_id, StudentEnrollment.class_id == class_id)
        .first()
    )
    if not enrollment:
        enrollment = StudentEnrollment(student_id=student_id, class_id=class_id)
        db.add(enrollment)
    return enrollment


def upsert_enrollment_code(db: Session, *, code: str, class_id: int, created_by: int, is_active: bool) -> EnrollmentCode:
    record = db.query(EnrollmentCode).filter(EnrollmentCode.code == code).first()
    if not record:
        record = EnrollmentCode(code=code, class_id=class_id, created_by=created_by, is_active=is_active)
        db.add(record)
    else:
        record.class_id = class_id
        record.created_by = created_by
        record.is_active = is_active
    return record


def upsert_session(
    db: Session,
    *,
    class_id: int,
    qr_code: str,
    attendance_code: str,
    session_date: datetime,
    status: str,
    qr_enabled: bool,
    face_enabled: bool,
) -> AttendanceSession:
    session = db.query(AttendanceSession).filter(AttendanceSession.qr_code == qr_code).first()
    if not session:
        session = AttendanceSession(class_id=class_id, qr_code=qr_code)
        db.add(session)

    session.class_id = class_id
    session.date = session_date
    session.qr_enabled = qr_enabled
    session.qr_expires_at = session_date + timedelta(minutes=3) if qr_enabled else None
    session.attendance_code = attendance_code
    session.code_expires_at = session_date + timedelta(minutes=10)
    session.face_recognition_enabled = face_enabled
    session.status = status
    return session


def upsert_record(
    db: Session,
    *,
    session_id: int,
    student_id: int,
    face_detected: bool,
    qr_verified: bool,
    confidence: float | None,
    final_status: str,
    overridden: bool,
    override_reason: str | None,
) -> AttendanceRecord:
    record = (
        db.query(AttendanceRecord)
        .filter(AttendanceRecord.session_id == session_id, AttendanceRecord.student_id == student_id)
        .first()
    )
    if not record:
        record = AttendanceRecord(session_id=session_id, student_id=student_id)
        db.add(record)

    record.face_detected = face_detected
    record.qr_verified = qr_verified
    record.confidence = confidence
    record.final_status = final_status
    record.overridden_by_teacher = overridden
    record.override_reason = override_reason
    return record


def add_audit_log(db: Session, *, event_type: str, entity_type: str, entity_id: int | None, user_id: int | None, metadata: dict) -> None:
    db.add(
        AuditLog(
            event_id=str(uuid4()),
            event_type=event_type,
            entity_type=entity_type,
            entity_id=entity_id,
            user_id=user_id,
            event_metadata=metadata,
        )
    )


def seed_demo_data() -> None:
    db = SessionLocal()
    try:
        # Users with credentials matching UI hints.
        professor = upsert_user(
            db,
            email="professor@college.edu",
            name="Dr. Ada Professor",
            roll_number="TCH001",
            role=UserRole.TEACHER.value,
            password="demo12345",
        )
        student = upsert_user(
            db,
            email="student@college.edu",
            name="Alex Student",
            roll_number="STU001",
            role=UserRole.STUDENT.value,
            password="demo12345",
        )
        student2 = upsert_user(
            db,
            email="student2@college.edu",
            name="Morgan Learner",
            roll_number="STU002",
            role=UserRole.STUDENT.value,
            password="demo12345",
        )
        teacher2 = upsert_user(
            db,
            email="teacher2@college.edu",
            name="Prof. Grace Hopper",
            roll_number="TCH002",
            role=UserRole.TEACHER.value,
            password="demo12345",
        )

        db.flush()

        subj_cs = upsert_subject(db, code="CSE101", name="Data Structures")
        subj_ai = upsert_subject(db, code="CSE202", name="Introduction to AI")
        subj_db = upsert_subject(db, code="CSE203", name="Database Systems")
        db.flush()

        upsert_subject_color(db, subject_id=subj_cs.id, color_code="#1E88E5", text_color="#FFFFFF")
        upsert_subject_color(db, subject_id=subj_ai.id, color_code="#2E7D32", text_color="#FFFFFF")
        upsert_subject_color(db, subject_id=subj_db.id, color_code="#EF6C00", text_color="#FFFFFF")

        class_cs_a = upsert_class(db, subject_id=subj_cs.id, teacher_id=professor.id, year=2, section="A")
        class_ai_b = upsert_class(db, subject_id=subj_ai.id, teacher_id=professor.id, year=3, section="B")
        class_db_a = upsert_class(db, subject_id=subj_db.id, teacher_id=teacher2.id, year=2, section="A")
        db.flush()

        upsert_schedule(db, class_id=class_cs_a.id, day_of_week=0, start_time=time(9, 0), end_time=time(10, 0), room_number="A-101")
        upsert_schedule(db, class_id=class_cs_a.id, day_of_week=2, start_time=time(9, 0), end_time=time(10, 0), room_number="A-101")
        upsert_schedule(db, class_id=class_ai_b.id, day_of_week=1, start_time=time(11, 0), end_time=time(12, 0), room_number="LAB-2")
        upsert_schedule(db, class_id=class_db_a.id, day_of_week=4, start_time=time(14, 0), end_time=time(15, 0), room_number="B-204")

        upsert_timetable(db, class_id=class_cs_a.id, day_of_week=0, start_time=time(9, 0), end_time=time(10, 0), room_number="A-101")
        upsert_timetable(db, class_id=class_cs_a.id, day_of_week=2, start_time=time(9, 0), end_time=time(10, 0), room_number="A-101")
        upsert_timetable(db, class_id=class_ai_b.id, day_of_week=1, start_time=time(11, 0), end_time=time(12, 0), room_number="LAB-2")
        upsert_timetable(db, class_id=class_db_a.id, day_of_week=4, start_time=time(14, 0), end_time=time(15, 0), room_number="B-204")

        ensure_enrollment(db, student_id=student.id, class_id=class_cs_a.id)
        ensure_enrollment(db, student_id=student.id, class_id=class_ai_b.id)
        ensure_enrollment(db, student_id=student2.id, class_id=class_cs_a.id)
        ensure_enrollment(db, student_id=student2.id, class_id=class_db_a.id)

        upsert_enrollment_code(db, code="ENRCSA", class_id=class_cs_a.id, created_by=professor.id, is_active=True)
        upsert_enrollment_code(db, code="ENRAIB", class_id=class_ai_b.id, created_by=professor.id, is_active=True)
        upsert_enrollment_code(db, code="ENRDBA", class_id=class_db_a.id, created_by=teacher2.id, is_active=False)

        now = datetime.utcnow()
        session_open = upsert_session(
            db,
            class_id=class_cs_a.id,
            qr_code="QR-CSE101-OPEN",
            attendance_code="CSA101",
            session_date=now,
            status=SessionStatus.OPEN.value,
            qr_enabled=True,
            face_enabled=True,
        )
        session_closed = upsert_session(
            db,
            class_id=class_ai_b.id,
            qr_code="QR-CSE202-CLOSED",
            attendance_code="AIB202",
            session_date=now - timedelta(days=1),
            status=SessionStatus.CLOSED.value,
            qr_enabled=True,
            face_enabled=False,
        )
        session_db = upsert_session(
            db,
            class_id=class_db_a.id,
            qr_code="QR-CSE203-CLOSED",
            attendance_code="DBA203",
            session_date=now - timedelta(days=2),
            status=SessionStatus.CLOSED.value,
            qr_enabled=False,
            face_enabled=True,
        )
        db.flush()

        upsert_record(
            db,
            session_id=session_open.id,
            student_id=student.id,
            face_detected=True,
            qr_verified=True,
            confidence=0.97,
            final_status=AttendanceStatus.PRESENT.value,
            overridden=False,
            override_reason=None,
        )
        upsert_record(
            db,
            session_id=session_open.id,
            student_id=student2.id,
            face_detected=True,
            qr_verified=False,
            confidence=0.81,
            final_status=AttendanceStatus.MANUAL_REVIEW.value,
            overridden=False,
            override_reason=None,
        )
        upsert_record(
            db,
            session_id=session_closed.id,
            student_id=student.id,
            face_detected=False,
            qr_verified=False,
            confidence=None,
            final_status=AttendanceStatus.ABSENT.value,
            overridden=False,
            override_reason=None,
        )
        upsert_record(
            db,
            session_id=session_db.id,
            student_id=student2.id,
            face_detected=True,
            qr_verified=False,
            confidence=0.89,
            final_status=AttendanceStatus.PRESENT.value,
            overridden=True,
            override_reason="Marked present after lab verification",
        )

        add_audit_log(
            db,
            event_type="session.started",
            entity_type="attendance_session",
            entity_id=session_open.id,
            user_id=professor.id,
            metadata={"class_id": class_cs_a.id, "attendance_code": session_open.attendance_code},
        )
        add_audit_log(
            db,
            event_type="attendance.override",
            entity_type="attendance_record",
            entity_id=None,
            user_id=teacher2.id,
            metadata={"reason": "Marked present after lab verification", "class_id": class_db_a.id},
        )

        db.commit()

        print("✅ Demo data seeded successfully")
        print("\nDemo login credentials:")
        print("- professor@college.edu / demo12345")
        print("- student@college.edu / demo12345")
        print("- student2@college.edu / demo12345")
        print("- teacher2@college.edu / demo12345")
    finally:
        db.close()


if __name__ == "__main__":
    seed_demo_data()
