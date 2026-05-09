"""
Utility functions for College Attendance System.
"""

from typing import Optional
from sqlalchemy.orm import Session, joinedload
from models import User, Class, StudentEnrollment, Subject


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """
    Get user by email address.
    
    Args:
        db: Database session
        email: User email
        
    Returns:
        User object if found, None otherwise
    """
    return db.query(User).filter(User.email == email).first()


def get_user_by_roll_number(db: Session, roll_number: str) -> Optional[User]:
    """
    Get user by roll number.
    
    Args:
        db: Database session
        roll_number: User roll number
        
    Returns:
        User object if found, None otherwise
    """
    return db.query(User).filter(User.roll_number == roll_number).first()


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    """
    Get user by ID.
    
    Args:
        db: Database session
        user_id: User ID
        
    Returns:
        User object if found, None otherwise
    """
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_google_id(db: Session, google_id: str) -> Optional[User]:
    """
    Get user by Google ID.
    
    Args:
        db: Database session
        google_id: Google OAuth ID
        
    Returns:
        User object if found, None otherwise
    """
    return db.query(User).filter(User.google_id == google_id).first()


def is_student_enrolled(db: Session, student_id: int, class_id: int) -> bool:
    """
    Check if student is enrolled in a class.
    
    Args:
        db: Database session
        student_id: Student ID
        class_id: Class ID
        
    Returns:
        True if enrolled, False otherwise
    """
    return (
        db.query(StudentEnrollment)
        .filter(
            StudentEnrollment.student_id == student_id,
            StudentEnrollment.class_id == class_id,
        )
        .first()
    ) is not None


def get_student_classes(db: Session, student_id: int) -> list:
    """
    Get all classes a student is enrolled in.
    
    Args:
        db: Database session
        student_id: Student ID
        
    Returns:
        List of Class objects
    """
    enrollments = db.query(StudentEnrollment).filter(
        StudentEnrollment.student_id == student_id
    ).all()
    return [enrollment.class_ for enrollment in enrollments]


def get_class_students(db: Session, class_id: int) -> list:
    """
    Get all students enrolled in a class.
    
    Args:
        db: Database session
        class_id: Class ID
        
    Returns:
        List of User objects (students)
    """
    enrollments = db.query(StudentEnrollment).filter(
        StudentEnrollment.class_id == class_id
    ).all()
    return [enrollment.student for enrollment in enrollments]


def get_teacher_classes(db: Session, teacher_id: int) -> list:
    """
    Get all classes taught by a teacher with their subject information.
    
    Args:
        db: Database session
        teacher_id: Teacher ID
        
    Returns:
        List of Class objects with subject relationships populated
    """
    return db.query(Class).filter(Class.teacher_id == teacher_id).options(joinedload(Class.subject)).all()
