"""
Student routes for College Attendance System.
Handles student enrollment and attendance verification.
"""

from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from typing import List

from db.session import get_db
from models import (
    User,
    Class,
    StudentEnrollment,
    AttendanceRecord,
    UserRole,
)
from schemas import (
    StudentEnrollmentCreate,
    StudentEnrollmentResponse,
    StudentAttendanceResponse,
    StudentAttendanceStats,
)
from utils import (
    get_current_student,
    get_user_by_id,
    get_student_classes,
    TokenData,
)
from services import get_attendance_percentage
from services.audit_service import log_audit

router = APIRouter(prefix="/students", tags=["Student Operations"])


# ============================================================================
# ENROLLMENT MANAGEMENT
# ============================================================================

@router.post("/enroll", response_model=StudentEnrollmentResponse, status_code=status.HTTP_201_CREATED)
async def enroll_student(
    request: StudentEnrollmentCreate,
    current_user: TokenData = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    """
    Enroll the current student in a class.
    
    Args:
        request: Class ID to enroll in
        current_user: Current authenticated student
        db: Database session
        
    Returns:
        Created enrollment record
        
    Raises:
        HTTPException: If class not found or already enrolled
    """
    # Verify class exists
    class_ = db.query(Class).filter(Class.id == request.class_id).first()
    if not class_:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found",
        )
    
    # Check if already enrolled
    existing = db.query(StudentEnrollment).filter(
        StudentEnrollment.student_id == current_user.user_id,
        StudentEnrollment.class_id == request.class_id,
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already enrolled in this class",
        )
    
    # Create enrollment
    enrollment = StudentEnrollment(
        student_id=current_user.user_id,
        class_id=request.class_id,
    )
    
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    log_audit(db, current_user.user_id, "enroll", "student_enrollment", enrollment.id, {"class_id": request.class_id})
    
    return enrollment


@router.get("/enrollments", response_model=List[StudentEnrollmentResponse])
async def list_enrollments(
    current_user: TokenData = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    """
    Get all classes the current student is enrolled in.
    
    Args:
        current_user: Current authenticated student
        db: Database session
        
    Returns:
        List of enrollment records
    """
    enrollments = db.query(StudentEnrollment).filter(
        StudentEnrollment.student_id == current_user.user_id
    ).all()
    
    return enrollments


@router.delete("/enroll/{class_id}", response_model=dict)
async def unenroll_student(
    class_id: int,
    current_user: TokenData = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    """
    Unenroll the current student from a class.
    """
    enrollment = db.query(StudentEnrollment).filter(
        StudentEnrollment.student_id == current_user.user_id,
        StudentEnrollment.class_id == class_id,
    ).first()
    if not enrollment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enrollment not found")
    db.delete(enrollment)
    db.commit()
    log_audit(db, current_user.user_id, "unenroll", "student_enrollment", enrollment.id, {"class_id": class_id})
    return {"success": True}


# ============================================================================
# ATTENDANCE RECORDS
# ============================================================================

@router.get("/attendance", response_model=StudentAttendanceResponse)
async def get_student_attendance(
    current_user: TokenData = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    """
    Get attendance report for the current student.
    Shows attendance percentage for each enrolled class.
    
    Args:
        current_user: Current authenticated student
        db: Database session
        
    Returns:
        Student attendance statistics by subject
    """
    student = get_user_by_id(db, current_user.user_id)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )
    
    # Get all enrolled classes
    classes = get_student_classes(db, current_user.user_id)
    
    attendance_by_subject = []
    total_percentage = 0.0
    
    for class_ in classes:
        stats = get_attendance_percentage(db, current_user.user_id, class_.id)
        
        attendance_by_subject.append(
            StudentAttendanceStats(
                class_id=class_.id,
                subject_name=class_.subject.name,
                subject_code=class_.subject.code,
                total_sessions=stats["total_sessions"],
                present_count=stats["present"],
                absent_count=stats["absent"],
                manual_review_count=stats["manual_review"],
                attendance_percentage=stats["percentage"],
            )
        )
    
    # Calculate overall percentage
    if attendance_by_subject:
        total_percentage = sum(a.attendance_percentage for a in attendance_by_subject) / len(attendance_by_subject)
    
    return StudentAttendanceResponse(
        student_id=current_user.user_id,
        student_name=student.name,
        attendance_by_subject=attendance_by_subject,
        overall_percentage=round(total_percentage, 2),
    )
