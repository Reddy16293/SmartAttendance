"""
Subject model for the College Attendance System.
Represents academic subjects/courses.
"""

from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from database import Base


class Subject(Base):
    """
    Subject model representing a course/subject.
    
    Attributes:
        id: Primary key (auto-increment)
        name: Subject name (e.g., "Data Structures")
        code: Unique subject code (e.g., "CS101")
    """
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)

    # Relationships
    classes = relationship(
        "Class",
        back_populates="subject",
        cascade="all, delete-orphan",
    )
    color_mapping = relationship(
        "SubjectColor",
        back_populates="subject",
        cascade="all, delete-orphan",
        uselist=False,
    )

    def __repr__(self):
        return f"<Subject {self.id}: {self.code} - {self.name}>"
