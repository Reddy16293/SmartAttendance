"""
Audit logging service for recording key events to the database.
"""

import uuid
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from models import AuditLog


def log_audit(
    db: Session,
    user_id: Optional[int],
    event_type: str,
    entity_type: str,
    entity_id: Optional[int],
    metadata: Optional[Dict[str, Any]] = None,
) -> None:
    """
    Persist an audit log entry.
    """
    try:
        entry = AuditLog(
            event_id=str(uuid.uuid4()),
            event_type=event_type,
            entity_type=entity_type,
            entity_id=entity_id,
            user_id=user_id,
            event_metadata=metadata or {},
        )
        db.add(entry)
        db.commit()
    except Exception as e:
        # Fail silently to avoid breaking user flows
        print(f"⚠️ Audit log failed: {str(e)}")
