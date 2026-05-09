"""
AuditLog model for recording key events.
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from datetime import datetime
from database import Base


class AuditLog(Base):
    """
    Audit log entries capturing important actions.
    """
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String(36), nullable=False, index=True)  # UUID string
    event_type = Column(String(100), nullable=False, index=True)
    entity_type = Column(String(100), nullable=False)
    entity_id = Column(Integer, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    event_metadata = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<AuditLog {self.id}: {self.event_type} {self.entity_type}:{self.entity_id}>"
