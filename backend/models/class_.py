"""
Class model for the College Attendance System.
Represents a section of a subject taught by a teacher.
"""

from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class Class(Base):
    """
    Class model representing a section of a subject.
    One subject can have multiple classes (e.g., CS101-Section A, CS101-Section B).
    
    Attributes:
        id: Primary key (auto-increment)
        subject_id: Foreign key to Subject
        teacher_id: Foreign key to User (teacher)
        year: Academic year (e.g., 1, 2, 3, 4)
        section: Section identifier (e.g., "A", "B", "MORNING", "EVENING")
        created_at: Class creation timestamp
        updated_at: Last update timestamp
    """
    __tablename__ = "classes"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False, index=True)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    year = Column(Integer, nullable=False)  # 1, 2, 3, 4
    section = Column(String(50), nullable=False)  # A, B, C or MORNING, EVENING
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    subject = relationship(
        "Subject",
        back_populates="classes",
        foreign_keys=[subject_id],
    )
    teacher = relationship(
        "User",
        back_populates="classes_taught",
        foreign_keys=[teacher_id],
    )
    enrollments = relationship(
        "StudentEnrollment",
        back_populates="class_",
        cascade="all, delete-orphan",
    )
    attendance_sessions = relationship(
        "AttendanceSession",
        back_populates="class_",
        cascade="all, delete-orphan",
    )
    enrollment_codes = relationship(
        "EnrollmentCode",
        back_populates="class_rel",
        cascade="all, delete-orphan",
    )
    schedules = relationship(
        "ClassSchedule",
        back_populates="class_rel",
        cascade="all, delete-orphan",
    )
    timetable_entries = relationship(
        "Timetable",
        back_populates="class_info",
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<Class {self.id}: {self.subject_id}-{self.section} (Year {self.year})>"
