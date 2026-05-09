#!/usr/bin/env python3
"""
Integration test for audit logging functionality.
Uses SQLite in-memory DB to avoid MySQL dependency.
"""

import sys
import os
from datetime import datetime

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base
from models import User, UserRole, Subject, Class, StudentEnrollment, AttendanceSession, AttendanceRecord, AuditLog
from services.audit_service import log_audit

# Create in-memory SQLite database
engine = create_engine("sqlite:///:memory:", echo=False)
Base.metadata.create_all(bind=engine)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def test_audit_register():
    """Test audit log for user registration"""
    db = SessionLocal()
    print("🧪 Test 1: Audit log for registration")
    
    # Create a user (simulating registration)
    user = User(
        name="John Doe",
        email="john@example.com",
        password_hash="hashed_pwd",
        role=UserRole.STUDENT.value,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Log the registration audit
    log_audit(db, user.id, "register", "user", user.id, {"email": user.email, "role": user.role})
    
    # Verify audit log exists
    logs = db.query(AuditLog).filter_by(event_type="register").all()
    assert len(logs) == 1, f"Expected 1 log, got {len(logs)}"
    assert logs[0].entity_type == "user"
    assert logs[0].user_id == user.id
    print(f"   ✅ Audit log created: {logs[0]}")
    print(f"   📝 Metadata: {logs[0].event_metadata}\n")
    db.close()

def test_audit_enroll():
    """Test audit log for student enrollment"""
    db = SessionLocal()
    print("🧪 Test 2: Audit log for enrollment")
    
    # Create subject and class
    subject = Subject(name="CS101", code="CS101")
    db.add(subject)
    db.commit()
    db.refresh(subject)
    
    teacher = User(name="Prof A", email="prof@example.com", password_hash="pwd", role=UserRole.TEACHER.value)
    db.add(teacher)
    db.commit()
    db.refresh(teacher)
    
    class_ = Class(subject_id=subject.id, teacher_id=teacher.id, year=1, section="A")
    db.add(class_)
    db.commit()
    db.refresh(class_)
    
    student = User(name="Jane Doe", email="jane@example.com", password_hash="pwd", role=UserRole.STUDENT.value)
    db.add(student)
    db.commit()
    db.refresh(student)
    
    # Enroll and log
    enrollment = StudentEnrollment(student_id=student.id, class_id=class_.id)
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    
    log_audit(db, student.id, "enroll", "student_enrollment", enrollment.id, {"class_id": class_.id})
    
    # Verify
    logs = db.query(AuditLog).filter_by(event_type="enroll").all()
    assert len(logs) == 1
    assert logs[0].event_metadata.get("class_id") == class_.id
    print(f"   ✅ Audit log created: {logs[0]}")
    print(f"   📝 Class enrolled: {class_.id}\n")
    db.close()

def test_audit_session_lifecycle():
    """Test audit logs for session start and finalize"""
    db = SessionLocal()
    print("🧪 Test 3: Audit log for session lifecycle")
    
    # Create class
    subject = Subject(name="CS202", code="CS202")
    db.add(subject)
    db.commit()
    
    teacher = User(name="Prof B", email="prof2@example.com", password_hash="pwd", role=UserRole.TEACHER.value)
    db.add(teacher)
    db.commit()
    
    class_ = Class(subject_id=subject.id, teacher_id=teacher.id, year=2, section="B")
    db.add(class_)
    db.commit()
    db.refresh(class_)
    
    # Start session
    session = AttendanceSession(class_id=class_.id, date=datetime.utcnow(), qr_enabled=True, qr_code="qr123", status="open")
    db.add(session)
    db.commit()
    db.refresh(session)
    
    log_audit(db, teacher.id, "session_start", "attendance_session", session.id, {"class_id": class_.id, "qr_enabled": True})
    
    # Verify start log
    logs_start = db.query(AuditLog).filter_by(event_type="session_start").all()
    assert len(logs_start) == 1
    print(f"   ✅ Session start audit: {logs_start[0]}")
    
    # Finalize session
    session.status = "closed"
    db.commit()
    
    log_audit(db, teacher.id, "session_finalize", "attendance_session", session.id, {})
    
    # Verify finalize log
    logs_finalize = db.query(AuditLog).filter_by(event_type="session_finalize").all()
    assert len(logs_finalize) == 1
    print(f"   ✅ Session finalize audit: {logs_finalize[0]}\n")
    db.close()

def test_audit_qr_verify():
    """Test audit log for QR verification"""
    db = SessionLocal()
    print("🧪 Test 4: Audit log for QR verification")
    
    # Create records
    subject = Subject(name="CS303", code="CS303")
    db.add(subject)
    db.commit()
    
    teacher = User(name="Prof C", email="prof3@example.com", password_hash="pwd", role=UserRole.TEACHER.value)
    student = User(name="Student X", email="student@example.com", password_hash="pwd", role=UserRole.STUDENT.value)
    db.add_all([teacher, student])
    db.commit()
    
    class_ = Class(subject_id=subject.id, teacher_id=teacher.id, year=3, section="C")
    db.add(class_)
    db.commit()
    db.refresh(class_)
    
    session = AttendanceSession(class_id=class_.id, date=datetime.utcnow(), qr_enabled=True, qr_code="qr456", status="open")
    db.add(session)
    db.commit()
    db.refresh(session)
    
    record = AttendanceRecord(session_id=session.id, student_id=student.id, qr_verified=True, final_status="present")
    db.add(record)
    db.commit()
    db.refresh(record)
    
    # Log QR verification
    log_audit(db, student.id, "qr_verify", "attendance_record", record.id, {"session_id": session.id})
    
    # Verify
    logs = db.query(AuditLog).filter_by(event_type="qr_verify").all()
    assert len(logs) == 1
    assert logs[0].event_metadata.get("session_id") == session.id
    print(f"   ✅ QR verify audit: {logs[0]}")
    print(f"   📝 Student: {student.email}, Session: {session.id}\n")
    db.close()

def test_audit_override():
    """Test audit log for attendance override"""
    db = SessionLocal()
    print("🧪 Test 5: Audit log for attendance override")
    
    # Setup records
    subject = Subject(name="CS404", code="CS404")
    db.add(subject)
    db.commit()
    
    teacher = User(name="Prof D", email="prof4@example.com", password_hash="pwd", role=UserRole.TEACHER.value)
    student = User(name="Student Y", email="student2@example.com", password_hash="pwd", role=UserRole.STUDENT.value)
    db.add_all([teacher, student])
    db.commit()
    
    class_ = Class(subject_id=subject.id, teacher_id=teacher.id, year=4, section="D")
    db.add(class_)
    db.commit()
    db.refresh(class_)
    
    session = AttendanceSession(class_id=class_.id, date=datetime.utcnow(), qr_enabled=False, status="open")
    db.add(session)
    db.commit()
    db.refresh(session)
    
    record = AttendanceRecord(session_id=session.id, student_id=student.id, final_status="absent")
    db.add(record)
    db.commit()
    db.refresh(record)
    
    # Override and log
    record.final_status = "present"
    record.overridden_by_teacher = True
    record.override_reason = "Late submission with evidence"
    db.commit()
    
    log_audit(db, teacher.id, "attendance_override", "attendance_record", record.id, 
              {"new_status": "present", "reason": "Late submission with evidence"})
    
    # Verify
    logs = db.query(AuditLog).filter_by(event_type="attendance_override").all()
    assert len(logs) == 1
    assert logs[0].event_metadata.get("new_status") == "present"
    print(f"   ✅ Override audit: {logs[0]}")
    print(f"   📝 Override reason: {logs[0].event_metadata.get('reason')}\n")
    db.close()

def test_list_all_audits():
    """Test retrieving all audit logs"""
    db = SessionLocal()
    print("🧪 Test 6: List all audit logs")
    
    # Get all logs
    all_logs = db.query(AuditLog).all()
    print(f"   ✅ Total audit logs: {len(all_logs)}")
    for log in all_logs[:5]:  # Show first 5
        print(f"      - {log.event_type} | {log.entity_type}:{log.entity_id} | User: {log.user_id} | {log.timestamp}")
    print()
    db.close()

if __name__ == "__main__":
    print("=" * 70)
    print("🧪 AUDIT LOGGING TEST SUITE (In-Memory SQLite)")
    print("=" * 70 + "\n")
    
    try:
        test_audit_register()
        test_audit_enroll()
        test_audit_session_lifecycle()
        test_audit_qr_verify()
        test_audit_override()
        test_list_all_audits()
        
        print("=" * 70)
        print("✅ ALL TESTS PASSED")
        print("=" * 70)
        
    except AssertionError as e:
        print(f"❌ TEST FAILED: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
