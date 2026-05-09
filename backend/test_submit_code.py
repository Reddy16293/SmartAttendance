"""Test script to simulate student submitting attendance code"""
from database import SessionLocal
from models import AttendanceRecord, AttendanceSession, StudentEnrollment
from datetime import datetime

db = SessionLocal()

# Get the latest session
session = db.query(AttendanceSession).order_by(AttendanceSession.id.desc()).first()
print(f"Latest Session: ID={session.id}, Code={session.attendance_code}, Class={session.class_id}")

# Check if student is enrolled
student_id = 1  # Your student ID
enrollment = db.query(StudentEnrollment).filter(
    StudentEnrollment.class_id == session.class_id,
    StudentEnrollment.student_id == student_id
).first()

print(f"Student {student_id} enrolled in class {session.class_id}: {enrollment is not None}")

# Find existing attendance record
record = db.query(AttendanceRecord).filter(
    AttendanceRecord.session_id == session.id,
    AttendanceRecord.student_id == student_id
).first()

if record:
    print(f"Found existing record: ID={record.id}, Status={record.final_status}, qr_verified={record.qr_verified}")
    # Manually update it
    record.qr_verified = True
    record.final_status = "manual_review"
    record.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(record)
    print(f"Updated record: ID={record.id}, Status={record.final_status}, qr_verified={record.qr_verified}")
else:
    print("No existing record found - creating new one")
    record = AttendanceRecord(
        session_id=session.id,
        student_id=student_id,
        face_detected=False,
        qr_verified=True,
        final_status="manual_review"
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    print(f"Created record: ID={record.id}, Status={record.final_status}, qr_verified={record.qr_verified}")

# Verify it's in the pending list
pending = db.query(AttendanceRecord).filter(
    AttendanceRecord.final_status == "manual_review",
    AttendanceRecord.qr_verified == True
).all()
print(f"\nTotal pending records: {len(pending)}")

db.close()
