"""
Pydantic schemas for Timetable related API requests and responses.
"""

from pydantic import BaseModel, Field
from datetime import datetime, time
from typing import Optional, List


class TimetableCreate(BaseModel):
    """Schema for creating timetable entry"""
    class_id: int
    day_of_week: int  # 0=Monday, 1=Tuesday, etc., 6=Sunday
    start_time: time  # HH:MM format
    end_time: time
    room_number: Optional[str] = None


class TimetableUpdate(BaseModel):
    """Schema for updating timetable entry"""
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    room_number: Optional[str] = None


class TimetableResponse(BaseModel):
    """Timetable response schema"""
    id: int
    class_id: int
    day_of_week: int
    start_time: time
    end_time: time
    room_number: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SubjectColorCreate(BaseModel):
    """Schema for creating subject color mapping"""
    subject_id: int
    color_code: str = Field(..., pattern="^#[0-9A-Fa-f]{6}$")  # Hex color validation
    text_color: Optional[str] = Field("#FFFFFF", pattern="^#[0-9A-Fa-f]{6}$")


class SubjectColorResponse(BaseModel):
    """Subject color response schema"""
    id: int
    subject_id: int
    color_code: str
    text_color: str
    created_at: datetime

    class Config:
        from_attributes = True


class TimetableWithClassInfo(BaseModel):
    """Detailed timetable response with class information"""
    id: int
    class_id: int
    day_of_week: int
    start_time: time
    end_time: time
    room_number: Optional[str] = None
    subject_name: str
    subject_code: str
    subject_color: Optional[str] = None
    text_color: Optional[str] = None
    teacher_name: str
    year: int
    section: str

    class Config:
        from_attributes = True


class WeeklyTimetable(BaseModel):
    """Weekly timetable for a student/class"""
    class_id: int
    subject_name: str
    subject_code: str
    year: int
    section: str
    teacher_name: str
    timetable_entries: List[TimetableWithClassInfo]

    class Config:
        from_attributes = True
