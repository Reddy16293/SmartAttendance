#!/usr/bin/env python3
"""Debug script to check student enrollments and attendance records."""

from database import SessionLocal
from models import StudentEnrollment, AttendanceRecord, User
from sqlalchemy import func

def main():
    db = SessionLocal()
    
    # Get all students
    students = db.query(User).filter(User.role == "student").all()
    
    print(f"\n[DEBUG] Found {len(students)} students:\n")
    
    for student in students:
        enrollments = db.query(StudentEnrollment).filter(
            StudentEnrollment.student_id == student.id
        ).all()
        
        print(f"Student {student.id}: {student.name} ({student.email})")
        print(f"  Enrollments: {len(enrollments)} classes")
        for enrollment in enrollments:
            print(f"    - Class {enrollment.class_id}")
            
            # Get attendance records for this student
            records = db.query(AttendanceRecord).filter(
                AttendanceRecord.student_id == student.id,
            ).all()
            print(f"      Total Attendance records: {len(records)}")
            for record in records:
                print(f"        - Session {record.session_id}: {record.final_status} (qr_verified={record.qr_verified})")
        print()
    
    db.close()

if __name__ == "__main__":
    main()
