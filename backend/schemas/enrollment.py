"""
Pydantic schemas for enrollment codes and class schedules.
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import time, datetime


class ClassScheduleCreate(BaseModel):
    """Schema for creating a class schedule"""
    day_of_week: int = Field(..., ge=0, le=6, description="0=Monday, 6=Sunday")
    start_time: str = Field(..., description="Start time in HH:MM format")
    end_time: str = Field(..., description="End time in HH:MM format")
    room_number: Optional[str] = None


class ClassScheduleUpdate(BaseModel):
    """Schema for updating a class schedule"""
    day_of_week: Optional[int] = Field(None, ge=0, le=6)
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    room_number: Optional[str] = None


class ClassScheduleResponse(BaseModel):
    """Response schema for class schedule"""
    id: int
    class_id: int
    day_of_week: int
    start_time: str
    end_time: str
    room_number: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

    @property
    def day_name(self) -> str:
        days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        return days[self.day_of_week]


class EnrollmentCodeCreate(BaseModel):
    """Schema for creating an enrollment code"""
    class_id: int = Field(..., description="ID of the class")
    code: Optional[str] = Field(None, description="Custom code or auto-generated")


class EnrollmentCodeResponse(BaseModel):
    """Response schema for enrollment code"""
    id: int
    class_id: int
    code: str
    created_by: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class EnrollmentCodeWithDetails(BaseModel):
    """Enrollment code with class details"""
    id: int
    code: str
    is_active: bool
    created_at: datetime
    class_id: int
    class_name: Optional[str] = None  # Will be populated separately
    subject_name: Optional[str] = None


class EnrollByCodeRequest(BaseModel):
    """Schema for student enrolling via code"""
    code: str = Field(..., description="Enrollment code")


class ClassWithSchedules(BaseModel):
    """Class with its schedules"""
    id: int
    subject_id: int
    teacher_id: int
    year: int
    section: str
    schedules: List[ClassScheduleResponse] = []

    class Config:
        from_attributes = True


class EnrolledClassResponse(BaseModel):
    """Response for student's enrolled class with timings"""
    id: int
    subject_id: int
    teacher_id: int
    year: int
    section: str
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None
    teacher_name: Optional[str] = None
    schedules: List[ClassScheduleResponse] = []
    enrolled_at: datetime

    class Config:
        from_attributes = True
