"""
User model for the College Attendance System.
Stores information about students and teachers.
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from database import Base


class UserRole(str, enum.Enum):
    """User role enumeration"""
    STUDENT = "student"
    TEACHER = "teacher"


class AuthProvider(str, enum.Enum):
    """Auth provider enumeration"""
    LOCAL = "LOCAL"
    GOOGLE = "GOOGLE"


class User(Base):
    """
    User model representing both students and teachers.
    
    Attributes:
        id: Primary key (auto-increment)
        name: User's full name
        email: Unique email address
        roll_number: Optional unique roll number
        password_hash: Hashed password for email+password auth
        role: User role (student or teacher)
        provider: Auth provider (LOCAL or GOOGLE)
        google_id: Optional Google OAuth ID
        created_at: Account creation timestamp
        updated_at: Last update timestamp
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    roll_number = Column(String(50), unique=True, nullable=True, index=True)
    password_hash = Column(String(255), nullable=True)  # Null for Google OAuth users
    role = Column(String(20), nullable=False, index=True)
    provider = Column(String(20), nullable=False, default=AuthProvider.LOCAL.value, index=True)
    google_id = Column(String(255), unique=True, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    classes_taught = relationship(
        "Class",
        back_populates="teacher",
        foreign_keys="Class.teacher_id",
    )
    enrollments = relationship(
        "StudentEnrollment",
        back_populates="student",
        foreign_keys="StudentEnrollment.student_id",
    )
    attendance_records = relationship(
        "AttendanceRecord",
        back_populates="student",
        foreign_keys="AttendanceRecord.student_id",
    )
    created_enrollment_codes = relationship(
        "EnrollmentCode",
        back_populates="creator",
        foreign_keys="EnrollmentCode.created_by",
    )

    def __repr__(self):
        return f"<User {self.id}: {self.email} ({self.role})>"
