"""
Timetable model for class schedules.
Stores class timings for each day and time slot.
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Time
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class Timetable(Base):
    """
    Timetable model for class schedules.
    
    Attributes:
        id: Primary key
        class_id: Foreign key to Class
        day_of_week: Day of week (0=Monday, 6=Sunday)
        start_time: Class start time (HH:MM)
        end_time: Class end time (HH:MM)
        room_number: Classroom/room number
        created_at: Creation timestamp
        updated_at: Last update timestamp
    """
    __tablename__ = "timetables"

    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False, index=True)
    day_of_week = Column(Integer, nullable=False)  # 0=Monday, 1=Tuesday, etc.
    start_time = Column(Time, nullable=False)  # HH:MM format
    end_time = Column(Time, nullable=False)
    room_number = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    class_info = relationship("Class", back_populates="timetable_entries")


class SubjectColor(Base):
    """
    Subject Color Mapping - ensures each subject has a unique color.
    
    Attributes:
        id: Primary key
        subject_id: Foreign key to Subject
        color_code: Hex color code (e.g., #FF5733)
        text_color: Text color (light or dark) for contrast
        created_at: Creation timestamp
    """
    __tablename__ = "subject_colors"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), unique=True, nullable=False, index=True)
    color_code = Column(String(7), nullable=False)  # Hex color like #FF5733
    text_color = Column(String(7), default="#FFFFFF", nullable=False)  # Text color (white or black)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    subject = relationship("Subject", back_populates="color_mapping")
