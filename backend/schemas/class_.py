"""
Pydantic schemas for Class-related API requests and responses.
"""

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class SubjectInClass(BaseModel):
    """Subject details in class response"""
    id: int
    name: str
    code: str

    class Config:
        from_attributes = True


class ClassCreate(BaseModel):
    """Schema for creating a class"""
    subject_id: int
    teacher_id: int
    year: int = Field(..., ge=1, le=4)
    section: str = Field(..., min_length=1, max_length=50)


class ClassUpdate(BaseModel):
    """Schema for updating a class"""
    subject_id: Optional[int] = None
    teacher_id: Optional[int] = None
    year: Optional[int] = Field(None, ge=1, le=4)
    section: Optional[str] = Field(None, min_length=1, max_length=50)


class ClassResponse(BaseModel):
    """Class response schema"""
    id: int
    subject_id: int
    teacher_id: int
    year: int
    section: str
    created_at: datetime
    updated_at: datetime
    subject: Optional[SubjectInClass] = None  # Include subject details when loaded

    class Config:
        from_attributes = True


class ClassDetailResponse(ClassResponse):
    """Detailed class response with subject and teacher info"""
    subject: dict  # Subject details
    teacher: dict  # Teacher details


class TeacherClassResponse(BaseModel):
    """Response for teacher's class with subject details"""
    id: int
    subject_id: int
    teacher_id: int
    year: int
    section: str
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None
    teacher_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
