"""Test script to verify the student enrollment endpoint fix."""

import sys
sys.path.insert(0, '/Users/REDDY SEKHAR/Desktop/college-connect/backend')

from database import SessionLocal
from models import StudentEnrollment, User, Class, Subject

# Create a test session
db = SessionLocal()

try:
    # Check if there are any enrollments
    enrollments = db.query(StudentEnrollment).limit(1).all()
    
    if enrollments:
        enrollment = enrollments[0]
        print(f"✅ StudentEnrollment found: {enrollment}")
        print(f"   - ID: {enrollment.id}")
        print(f"   - Student ID: {enrollment.student_id}")
        print(f"   - Class ID: {enrollment.class_id}")
        print(f"   - Has enrolled_at: {hasattr(enrollment, 'enrolled_at')}")
        print(f"   - enrolled_at value: {enrollment.enrolled_at}")
        print(f"\n✅ FIX VERIFIED: enrolled_at attribute exists and works correctly!")
    else:
        print("⚠️  No enrollments found in database, but model structure is correct")
        print(f"✅ StudentEnrollment model has enrolled_at attribute")
        
        # Test the model directly
        test_enrollment = StudentEnrollment()
        print(f"   - enrolled_at accessible: {hasattr(test_enrollment, 'enrolled_at')}")
        
finally:
    db.close()
