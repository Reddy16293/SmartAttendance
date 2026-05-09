"""
Pydantic schemas for Subject-related API requests and responses.
"""

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class SubjectCreate(BaseModel):
    """Schema for creating a subject"""
    name: str = Field(..., min_length=2, max_length=255)
    code: str = Field(..., min_length=2, max_length=50)


class SubjectUpdate(BaseModel):
    """Schema for updating a subject"""
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    code: Optional[str] = Field(None, min_length=2, max_length=50)

    class Config:
        from_attributes = True


class SubjectResponse(BaseModel):
    """Subject response schema"""
    id: int
    name: str
    code: str

    class Config:
        from_attributes = True
