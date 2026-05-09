"""Script to check database state for debugging attendance code issue"""
from database import SessionLocal
from models import AttendanceSession, AttendanceRecord, StudentEnrollment, User, Class, Subject
from datetime import datetime

db = SessionLocal()

print("=" * 60)
print("ACTIVE ATTENDANCE SESSIONS")
print("=" * 60)
sessions = db.query(AttendanceSession).filter(AttendanceSession.status == 'open').all()
print(f"Total active sessions: {len(sessions)}\n")
for s in sessions[:5]:
    class_obj = db.query(Class).filter(Class.id == s.class_id).first()
    subject = db.query(Subject).filter(Subject.id == class_obj.subject_id).first() if class_obj else None
    print(f"Session ID: {s.id}")
    print(f"  Code: {s.attendance_code}")
    print(f"  Class ID: {s.class_id}")
    print(f"  Subject: {subject.name if subject else 'N/A'} ({subject.code if subject else 'N/A'})")
    print(f"  Expires: {s.code_expires_at}")
    print(f"  Created: {s.date}")
    print()

print("\n" + "=" * 60)
print("RECORDS IN MANUAL_REVIEW STATUS")
print("=" * 60)
records = db.query(AttendanceRecord).filter(
    AttendanceRecord.final_status == 'manual_review'
).all()
print(f"Total records in manual_review: {len(records)}\n")
for r in records[:10]:
    student = db.query(User).filter(User.id == r.student_id).first()
    session = db.query(AttendanceSession).filter(AttendanceSession.id == r.session_id).first()
    print(f"Record ID: {r.id}")
    print(f"  Student: {student.name if student else 'Unknown'} (ID: {r.student_id})")
    print(f"  Session ID: {r.session_id}")
    print(f"  Code: {session.attendance_code if session else 'N/A'}")
    print(f"  qr_verified: {r.qr_verified}")
    print(f"  Status: {r.final_status}")
    print(f"  Created: {r.created_at}")
    print()

print("\n" + "=" * 60)
print("STUDENT ENROLLMENTS")
print("=" * 60)
enrollments = db.query(StudentEnrollment).all()
print(f"Total enrollments: {len(enrollments)}\n")
for e in enrollments[:5]:
    student = db.query(User).filter(User.id == e.student_id).first()
    class_obj = db.query(Class).filter(Class.id == e.class_id).first()
    subject = db.query(Subject).filter(Subject.id == class_obj.subject_id).first() if class_obj else None
    print(f"Student: {student.name if student else 'Unknown'} (ID: {e.student_id})")
    print(f"  Class ID: {e.class_id}")
    print(f"  Subject: {subject.name if subject else 'N/A'}")
    print()

db.close()
print("\n" + "=" * 60)
print("CHECK COMPLETE")
print("=" * 60)
