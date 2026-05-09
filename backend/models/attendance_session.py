"""
AttendanceSession model for the College Attendance System.
Represents one lecture/class attendance event.
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import enum


from database import Base


class SessionStatus(str, enum.Enum):
    """Attendance session status enumeration"""
    OPEN = "open"
    CLOSED = "closed"


class AttendanceSession(Base):
    """
    AttendanceSession model representing one lecture attendance event.
    
    Important: QR code is session-specific, not class-specific.
    
    Attributes:
        id: Primary key (auto-increment)
        class_id: Foreign key to Class
        date: Session date and time
        qr_enabled: Whether QR code verification is enabled for this session
        qr_code: Optional QR code value (unique for this session)
        status: Session status (open or closed)
        created_at: Session creation timestamp
        updated_at: Last update timestamp
    """
    __tablename__ = "attendance_sessions"

    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False, index=True)
    date = Column(DateTime, nullable=False, index=True)
    qr_enabled = Column(Boolean, default=False)
    qr_code = Column(String(255), unique=True, nullable=True, index=True)
    qr_expires_at = Column(DateTime, nullable=True)  # QR code expiration time (3 minutes)
    attendance_code = Column(String(10), nullable=True, index=True)  # Simple attendance code
    code_expires_at = Column(DateTime, nullable=True)  # Code expiration time
    face_recognition_enabled = Column(Boolean, default=False)  # Dual verification mode
    # URLs to stored images (original upload and annotated result)
    original_image = Column(String(500), nullable=True)
    annotated_image = Column(String(500), nullable=True)
    status = Column(String(50), default=SessionStatus.OPEN.value, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    class_ = relationship(
        "Class",
        back_populates="attendance_sessions",
        foreign_keys=[class_id],
    )
    attendance_records = relationship(
        "AttendanceRecord",
        back_populates="session",
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<AttendanceSession {self.id}: Class {self.class_id} on {self.date}>"
