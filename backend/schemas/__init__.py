"""
Pydantic schemas for API requests and responses.
"""

# Auth Schemas
from schemas.user import (
    UserRole,
    UserRegister,
    LoginRequest,
    GoogleAuthRequest,
    UserResponse,
    UserDetailResponse,
    TokenResponse,
    CurrentUserResponse,
)

# Subject Schemas
from schemas.subject import SubjectCreate, SubjectUpdate, SubjectResponse

# Class Schemas
from schemas.class_ import ClassCreate, ClassUpdate, ClassResponse, ClassDetailResponse

# Attendance Schemas
from schemas.attendance import (
    SessionStatus,
    AttendanceStatus,
    AttendanceSessionCreate,
    AttendanceSessionStart,
    AttendanceSessionResponse,
    AttendanceSessionDetailResponse,
    AttendanceRecordCreate,
    AttendanceRecordUpdate,
    TeacherOverride,
    AttendanceRecordResponse,
    TeacherAttendanceRecordResponse,
    FaceRecognitionResult,
    ImageUploadResponse,
    QRVerificationRequest,
    QRVerificationResponse,
    AttendanceCodeSubmit,
    AttendanceCodeResponse,
    QRCodeGenerateResponse,
    QRCodeSubmitRequest,
    QRCodeUploadResponse,
    AttendanceApprovalRequest,
    PendingAttendanceResponse,
)

# Student Schemas
from schemas.student import (
    StudentEnrollmentCreate,
    StudentEnrollmentResponse,
    StudentAttendanceStats,
    StudentAttendanceResponse,
)

# Enrollment & Schedule Schemas
from schemas.enrollment import (
    ClassScheduleCreate,
    ClassScheduleUpdate,
    ClassScheduleResponse,
    EnrollmentCodeCreate,
    EnrollmentCodeResponse,
    EnrollmentCodeWithDetails,
    EnrollByCodeRequest,
    ClassWithSchedules,
    EnrolledClassResponse,
)

__all__ = [
    # User
    "UserRole",
    "UserRegister",
    "LoginRequest",
    "GoogleAuthRequest",
    "UserResponse",
    "UserDetailResponse",
    "TokenResponse",
    "CurrentUserResponse",
    # Subject
    "SubjectCreate",
    "SubjectUpdate",
    "SubjectResponse",
    # Class
    "ClassCreate",
    "ClassUpdate",
    "ClassResponse",
    "ClassDetailResponse",
    # Attendance
    "SessionStatus",
    "AttendanceStatus",
    "AttendanceSessionCreate",
    "AttendanceSessionStart",
    "AttendanceSessionResponse",
    "AttendanceSessionDetailResponse",
    "AttendanceRecordCreate",
    "AttendanceRecordUpdate",
    "TeacherOverride",
    "AttendanceRecordResponse",
    "TeacherAttendanceRecordResponse",
    "FaceRecognitionResult",
    "ImageUploadResponse",
    "QRVerificationRequest",
    "QRVerificationResponse",
    # Student
    "StudentEnrollmentCreate",
    "StudentEnrollmentResponse",
    "StudentAttendanceStats",
    "StudentAttendanceResponse",
    # Enrollment & Schedule
    "ClassScheduleCreate",
    "ClassScheduleUpdate",
    "ClassScheduleResponse",
    "EnrollmentCodeCreate",
    "EnrollmentCodeResponse",
    "EnrollmentCodeWithDetails",
    "EnrollByCodeRequest",
    "ClassWithSchedules",
    "EnrolledClassResponse",
]
