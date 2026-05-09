"""
StudentEnrollment model for the College Attendance System.
Represents the many-to-many relationship between students and classes.
"""

from sqlalchemy import Column, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class StudentEnrollment(Base):
    """
    StudentEnrollment model for mapping students to classes.
    Many-to-many relationship between students and classes.
    
    Attributes:
        id: Primary key (auto-increment)
        student_id: Foreign key to User (student)
        class_id: Foreign key to Class
        enrolled_at: Enrollment timestamp
    """
    __tablename__ = "student_enrollments"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False, index=True)
    enrolled_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    student = relationship(
        "User",
        back_populates="enrollments",
        foreign_keys=[student_id],
    )
    class_ = relationship(
        "Class",
        back_populates="enrollments",
        foreign_keys=[class_id],
    )

    def __repr__(self):
        return f"<StudentEnrollment {self.id}: Student {self.student_id} -> Class {self.class_id}>"
