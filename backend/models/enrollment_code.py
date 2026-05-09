"""
EnrollmentCode model for the College Attendance System.
Represents enrollment codes that teachers create for students to join classes.
"""

from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base
import secrets


class EnrollmentCode(Base):
    """
    EnrollmentCode model for allowing students to enroll in classes.
    Teachers can create multiple enrollment codes for their classes.
    
    Attributes:
        id: Primary key (auto-increment)
        class_id: Foreign key to Class
        code: Unique enrollment code (6-8 alphanumeric characters)
        created_by: Foreign key to User (teacher who created it)
        is_active: Whether the code is currently active
        created_at: Code creation timestamp
        updated_at: Last update timestamp
    """
    __tablename__ = "enrollment_codes"

    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False, index=True)
    code = Column(String(20), unique=True, nullable=False, index=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    class_rel = relationship(
        "Class",
        back_populates="enrollment_codes",
        foreign_keys=[class_id],
    )
    creator = relationship(
        "User",
        back_populates="created_enrollment_codes",
        foreign_keys=[created_by],
    )

    @staticmethod
    def generate_code():
        """Generate a unique 6-character alphanumeric code"""
        return secrets.token_hex(3).upper()[:6]

    def __repr__(self):
        return f"<EnrollmentCode {self.code}: Class {self.class_id}>"
