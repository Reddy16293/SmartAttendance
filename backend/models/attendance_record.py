"""
AttendanceRecord model for the College Attendance System.
Stores raw signals (face detection, QR verification) and final attendance decision.
"""

from sqlalchemy import Column, Integer, Boolean, Float, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from database import Base


class AttendanceStatus(str, enum.Enum):
    """Final attendance status enumeration"""
    PRESENT = "present"
    ABSENT = "absent"
    MANUAL_REVIEW = "manual_review"
    PENDING_APPROVAL = "pending_approval"


class AttendanceRecord(Base):
    """
    AttendanceRecord model storing attendance information.
    
    Stores both raw signals and the final decision.
    Automatically computed based on face detection and QR verification.
    Can be manually overridden by teacher.
    
    Attendance Decision Logic:
    - if face_detected and qr_verified: present
    - elif face_detected or qr_verified: manual_review
    - else: absent
    
    Attributes:
        id: Primary key (auto-increment)
        session_id: Foreign key to AttendanceSession
        student_id: Foreign key to User (student)
        face_detected: Boolean indicating face was detected
        qr_verified: Boolean indicating QR code was verified
        confidence: Face detection confidence score (0.0-1.0)
        final_status: Computed or overridden attendance status
        overridden_by_teacher: Whether status was manually overridden
        override_reason: Optional reason for override
        created_at: Record creation timestamp
        updated_at: Last update timestamp
    """
    __tablename__ = "attendance_records"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("attendance_sessions.id"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    face_detected = Column(Boolean, default=False)
    qr_verified = Column(Boolean, default=False)
    confidence = Column(Float, nullable=True)  # Confidence score for face detection
    final_status = Column(String(50), nullable=False, default=AttendanceStatus.ABSENT.value)
    overridden_by_teacher = Column(Boolean, default=False)
    override_reason = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    session = relationship(
        "AttendanceSession",
        back_populates="attendance_records",
        foreign_keys=[session_id],
    )
    student = relationship(
        "User",
        back_populates="attendance_records",
        foreign_keys=[student_id],
    )

    def __repr__(self):
        return f"<AttendanceRecord {self.id}: Student {self.student_id} - {self.final_status}>"
