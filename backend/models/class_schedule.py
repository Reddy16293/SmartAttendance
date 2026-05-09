"""
ClassSchedule model for the College Attendance System.
Represents the weekly schedule/timings for a class.
"""

from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Time
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class ClassSchedule(Base):
    """
    ClassSchedule model for storing class timings.
    Teachers can set multiple timings per week (e.g., Monday 10:00-11:00, Wednesday 2:00-3:00).
    
    Attributes:
        id: Primary key (auto-increment)
        class_id: Foreign key to Class
        day_of_week: Day (0=Monday, 1=Tuesday, ..., 6=Sunday)
        start_time: Class start time (HH:MM)
        end_time: Class end time (HH:MM)
        room_number: Room/location (optional, e.g., "A101", "Lab-2")
        created_at: Schedule creation timestamp
        updated_at: Last update timestamp
    """
    __tablename__ = "class_schedules"

    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False, index=True)
    day_of_week = Column(Integer, nullable=False)  # 0-6 (Monday to Sunday)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    room_number = Column(String(50), nullable=True)  # A101, Lab-2, etc.
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    class_rel = relationship(
        "Class",
        back_populates="schedules",
        foreign_keys=[class_id],
    )

    def __repr__(self):
        days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        return f"<ClassSchedule {days[self.day_of_week]} {self.start_time}-{self.end_time}>"
