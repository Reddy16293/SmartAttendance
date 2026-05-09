"""
Pydantic schemas for Student enrollment and attendance related API requests and responses.
"""

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List


class StudentEnrollmentCreate(BaseModel):
    """Schema for enrolling a student in a class"""
    class_id: int


class StudentEnrollmentResponse(BaseModel):
    """Student enrollment response schema"""
    id: int
    student_id: int
    class_id: int
    enrolled_at: datetime

    class Config:
        from_attributes = True


class StudentAttendanceStats(BaseModel):
    """Schema for student attendance statistics"""
    class_id: int
    subject_name: str
    subject_code: str
    total_sessions: int
    present_count: int
    absent_count: int
    manual_review_count: int
    attendance_percentage: float


class StudentAttendanceResponse(BaseModel):
    """Student attendance report response"""
    student_id: int
    student_name: str
    attendance_by_subject: List[StudentAttendanceStats]
    overall_percentage: float
