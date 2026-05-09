"""
Attendance decision logic and processing service.
Handles automatic and manual attendance status computation.
"""

from sqlalchemy.orm import Session
from models import AttendanceRecord, AttendanceSession, AttendanceStatus
from typing import Tuple


def compute_attendance_status(
    face_detected: bool,
    qr_verified: bool,
    require_both: bool = False,
) -> str:
    """
    Compute automatic attendance status based on detection signals.
    
        Logic:
        - If require_both=True:
            * both face_detected and qr_verified => PRESENT
            * only one of face_detected/qr_verified => PENDING_APPROVAL
            * neither => ABSENT
        - If require_both=False:
            * either face_detected or qr_verified => PRESENT
            * neither => ABSENT
    
    Args:
        face_detected: Whether face was detected in the classroom image
        qr_verified: Whether QR code was successfully verified
        require_both: Whether both signals are required for auto-present
        
    Returns:
        Attendance status string (present, absent, or pending_approval)
    """
    if require_both:
        if face_detected and qr_verified:
            return AttendanceStatus.PRESENT.value
        elif face_detected or qr_verified:
            return AttendanceStatus.PENDING_APPROVAL.value
        else:
            return AttendanceStatus.ABSENT.value

    if face_detected or qr_verified:
        return AttendanceStatus.PRESENT.value
    return AttendanceStatus.ABSENT.value


def update_attendance_record(
    db: Session,
    record: AttendanceRecord,
    face_detected: bool = None,
    qr_verified: bool = None,
    confidence: float = None,
    require_both: bool = False,
) -> AttendanceRecord:
    """
    Update attendance record with new signals and recompute status.
    Does not update if already overridden by teacher.
    
    Args:
        db: Database session
        record: AttendanceRecord to update
        face_detected: New face detection status (optional)
        qr_verified: New QR verification status (optional)
        confidence: New confidence score (optional)
        require_both: Whether both verification signals are required
        
    Returns:
        Updated AttendanceRecord
    """
    # Don't update signals if teacher has already overridden
    if record.overridden_by_teacher:
        return record
    
    # Update signals if provided
    if face_detected is not None:
        record.face_detected = face_detected
    if qr_verified is not None:
        record.qr_verified = qr_verified
    if confidence is not None:
        record.confidence = confidence
    
    # Recompute status based on new signals
    record.final_status = compute_attendance_status(
        record.face_detected,
        record.qr_verified,
        require_both=require_both,
    )
    
    db.commit()
    db.refresh(record)
    return record


def override_attendance(
    db: Session,
    record: AttendanceRecord,
    new_status: str,
    reason: str = None,
) -> Tuple[bool, str, AttendanceRecord]:
    """
    Allow teacher to manually override attendance status.
    Override is allowed even after session finalization.
    
    Args:
        db: Database session
        record: AttendanceRecord to override
        new_status: New attendance status
        reason: Optional reason for override
        
    Returns:
        Tuple of (success: bool, message: str, updated_record: AttendanceRecord)
    """
    # Apply override
    record.final_status = new_status
    record.overridden_by_teacher = True
    record.override_reason = reason
    
    db.commit()
    db.refresh(record)
    
    return (
        True,
        f"Attendance overridden to {new_status}",
        record,
    )


def finalize_session(db: Session, session: AttendanceSession) -> Tuple[bool, str]:
    """
    Finalize an attendance session.
    After finalization, no more overrides are allowed.
    
    Args:
        db: Database session
        session: AttendanceSession to finalize
        
    Returns:
        Tuple of (success: bool, message: str)
    """
    if session.status == "closed":
        return False, "Session is already finalized"
    
    session.status = "closed"
    db.commit()
    
    # Count attendance statistics
    records = db.query(AttendanceRecord).filter(
        AttendanceRecord.session_id == session.id
    ).all()
    
    stats = {
        "total": len(records),
        "present": sum(1 for r in records if r.final_status == AttendanceStatus.PRESENT.value),
        "absent": sum(1 for r in records if r.final_status == AttendanceStatus.ABSENT.value),
        "pending_approval": sum(
            1
            for r in records
            if r.final_status in (
                AttendanceStatus.PENDING_APPROVAL.value,
                AttendanceStatus.MANUAL_REVIEW.value,
            )
        ),
    }
    
    message = (
        f"Session finalized. "
        f"Present: {stats['present']}, "
        f"Absent: {stats['absent']}, "
        f"Pending Approval: {stats['pending_approval']}"
    )
    
    return True, message


def get_attendance_percentage(
    db: Session,
    student_id: int,
    class_id: int,
) -> dict:
    """
    Calculate attendance percentage for a student in a specific class.
    
    Args:
        db: Database session
        student_id: Student ID
        class_id: Class ID
        
    Returns:
        Dictionary with attendance statistics
    """
    records = db.query(AttendanceRecord).join(
        AttendanceSession
    ).filter(
        AttendanceRecord.student_id == student_id,
        AttendanceSession.class_id == class_id,
    ).all()
    
    if not records:
        return {
            "total_sessions": 0,
            "present": 0,
            "absent": 0,
            "manual_review": 0,
            "percentage": 0.0,
        }
    
    present_count = sum(1 for r in records if r.final_status == AttendanceStatus.PRESENT.value)
    absent_count = sum(1 for r in records if r.final_status == AttendanceStatus.ABSENT.value)
    manual_review_count = sum(1 for r in records if r.final_status == AttendanceStatus.MANUAL_REVIEW.value)
    
    percentage = (present_count / len(records)) * 100 if records else 0.0
    
    return {
        "total_sessions": len(records),
        "present": present_count,
        "absent": absent_count,
        "manual_review": manual_review_count,
        "percentage": round(percentage, 2),
    }