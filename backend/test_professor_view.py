"""Test what the professor endpoint returns"""
from database import SessionLocal
from models import AttendanceRecord, AttendanceSession, User, Class, Subject
from sqlalchemy import and_

db = SessionLocal()

# Simulate the professor query (teacher_id = 2 based on your setup)
teacher_id = 2  # Update this if different

records = (
    db.query(
        AttendanceRecord.id,
        AttendanceRecord.session_id,
        AttendanceRecord.student_id,
        User.name.label("student_name"),
        User.email.label("student_email"),
        AttendanceSession.class_id,
        AttendanceSession.date,
        Class.year,
        Class.section,
        Subject.name.label("subject_name"),
        Subject.code.label("subject_code"),
    )
    .join(AttendanceSession, AttendanceRecord.session_id == AttendanceSession.id)
    .join(Class, AttendanceSession.class_id == Class.id)
    .join(Subject, Class.subject_id == Subject.id)
    .join(User, AttendanceRecord.student_id == User.id)
    .filter(
        Class.teacher_id == teacher_id,
        AttendanceRecord.final_status == "manual_review",
        AttendanceRecord.qr_verified.is_(True),
    )
    .order_by(AttendanceSession.date.desc())
    .all()
)

print(f"Records found for teacher {teacher_id}: {len(records)}")

for r in records:
    print(f"\nRecord ID: {r.id}")
    print(f"  Student: {r.student_name} ({r.student_email})")
    print(f"  Subject: {r.subject_name} ({r.subject_code})")
    print(f"  Class: Year {r.year}, Section {r.section}")
    print(f"  Date: {r.date}")

db.close()
