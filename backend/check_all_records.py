"""Check all attendance records"""
from database import SessionLocal
from models import AttendanceRecord, AttendanceSession, User

db = SessionLocal()

print("ALL ATTENDANCE RECORDS")
print("=" * 60)
records = db.query(AttendanceRecord).all()
print(f"Total records: {len(records)}\n")

for r in records:
    student = db.query(User).filter(User.id == r.student_id).first()
    session = db.query(AttendanceSession).filter(AttendanceSession.id == r.session_id).first()
    print(f"Record ID: {r.id}")
    print(f"  Student: {student.name if student else 'Unknown'} (ID: {r.student_id})")
    print(f"  Session ID: {r.session_id}, Code: {session.attendance_code if session else 'N/A'}")
    print(f"  face_detected: {r.face_detected}, qr_verified: {r.qr_verified}")
    print(f"  final_status: {r.final_status}")
    print(f"  Created: {r.created_at}")
    print(f"  Updated: {r.updated_at}")
    print()

db.close()
