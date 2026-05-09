"""
Pydantic schemas for Attendance Session and Record related API requests and responses.
"""

from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum
from typing import Optional, List


class SessionStatus(str, Enum):
    """Attendance session status"""
    OPEN = "open"
    CLOSED = "closed"


class AttendanceStatus(str, Enum):
    """Final attendance status"""
    PRESENT = "present"
    ABSENT = "absent"
    MANUAL_REVIEW = "manual_review"
    PENDING_APPROVAL = "pending_approval"


# Attendance Session Schemas
class AttendanceSessionCreate(BaseModel):
    """Schema for creating an attendance session"""
    class_id: int
    date: datetime
    qr_enabled: bool = False


class AttendanceSessionStart(BaseModel):
    """Schema for starting an attendance session"""
    class_id: int
    qr_enabled: bool = False


class AttendanceSessionResponse(BaseModel):
    """Attendance session response schema"""
    id: int
    class_id: int
    date: datetime
    qr_enabled: bool
    qr_code: Optional[str] = None
    qr_expires_at: Optional[datetime] = None
    attendance_code: Optional[str] = None
    code_expires_at: Optional[datetime] = None
    status: str
    created_at: datetime
    updated_at: datetime
    original_image: Optional[str] = None
    annotated_image: Optional[str] = None

    class Config:
        from_attributes = True


class AttendanceSessionDetailResponse(AttendanceSessionResponse):
    """Detailed session response with attendance records"""
    attendance_records: List['AttendanceRecordResponse'] = []


# Attendance Record Schemas
class AttendanceRecordCreate(BaseModel):
    """Schema for creating an attendance record"""
    session_id: int
    student_id: int
    face_detected: bool = False
    qr_verified: bool = False
    confidence: Optional[float] = None


class AttendanceRecordUpdate(BaseModel):
    """Schema for updating attendance signals"""
    face_detected: Optional[bool] = None
    qr_verified: Optional[bool] = None
    confidence: Optional[float] = None


class TeacherOverride(BaseModel):
    """Schema for teacher manual override"""
    student_id: int
    final_status: AttendanceStatus
    reason: Optional[str] = Field(None, max_length=500)


class AttendanceRecordResponse(BaseModel):
    """Attendance record response schema"""
    id: int
    session_id: int
    student_id: int
    face_detected: bool
    qr_verified: bool
    confidence: Optional[float]
    final_status: str
    overridden_by_teacher: bool
    override_reason: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TeacherAttendanceRecordResponse(AttendanceRecordResponse):
    """Teacher-facing attendance record response with student details"""
    student_name: Optional[str] = None
    student_email: Optional[str] = None
    roll_number: Optional[str] = None


class AttendanceCodeSubmit(BaseModel):
    """Schema for student submitting attendance code"""
    code: str


class AttendanceCodeResponse(BaseModel):
    """Response after submitting attendance code"""
    success: bool
    message: str
    session_id: Optional[int] = None
    record_id: Optional[int] = None


class QRCodeGenerateResponse(BaseModel):
    """Response after generating QR code for attendance"""
    success: bool
    message: str
    session_id: int
    qr_code_data: str  # The actual data in QR code
    qr_code_image: str  # Base64 encoded PNG image
    expires_at: datetime


class QRCodeSubmitRequest(BaseModel):
    """Schema for student submitting QR code (scanned or typed)"""
    qr_code_data: str


class QRCodeUploadResponse(BaseModel):
    """Response after uploading QR code image"""
    success: bool
    message: str
    qr_code_data: Optional[str] = None  # Decoded QR code data
    session_id: Optional[int] = None
    record_id: Optional[int] = None


class FaceRecognitionResult(BaseModel):
    """Schema for face recognition service response"""
    name: str  # Student identifier (e.g., "student_101")
    confidence: float  # Confidence score 0.0-1.0


class ImageUploadResponse(BaseModel):
    """Schema for image upload and processing response"""
    session_id: int
    recognized_students: List[FaceRecognitionResult]
    updated_records: int
    image_with_boxes: Optional[str] = None  # Base64 encoded image with bounding boxes
    original_image_url: Optional[str] = None
    annotated_image_url: Optional[str] = None


class QRVerificationRequest(BaseModel):
    """Schema for QR code verification"""
    qr_code: str
    student_id: int


class QRVerificationResponse(BaseModel):
    """Schema for QR verification response"""
    verified: bool
    message: str
    attendance_record: Optional[AttendanceRecordResponse]


class AttendanceApprovalRequest(BaseModel):
    """Schema for professor to approve/reject attendance"""
    record_id: int
    action: str = Field(..., pattern="^(approve|reject)$")  # approve or reject
    reason: Optional[str] = Field(None, max_length=500)


class PendingAttendanceResponse(BaseModel):
    """Response for pending attendance records"""
    id: int
    session_id: int
    student_id: int
    student_name: str
    student_email: str
    class_id: int
    class_name: str
    subject_name: str
    session_date: datetime
    submitted_at: datetime
    final_status: str

    class Config:
        from_attributes = True
