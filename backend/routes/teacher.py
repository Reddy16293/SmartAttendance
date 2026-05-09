"""
Teacher routes for College Attendance System.
Handles subject/class management and attendance session operations.
"""

from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List
import uuid

from db.session import get_db
from sqlalchemy.exc import IntegrityError
from models import (
    User,
    Subject,
    Class,
    AttendanceSession,
    AttendanceRecord,
    StudentEnrollment,
    UserRole,
    EnrollmentCode,
    ClassSchedule,
)
from schemas import (
    SubjectCreate,
    SubjectResponse,
    SubjectUpdate,
    ClassCreate,
    ClassResponse,
    ClassUpdate,
    AttendanceSessionStart,
    AttendanceSessionResponse,
    AttendanceRecordResponse,
    TeacherAttendanceRecordResponse,
    TeacherOverride,
)
from utils import (
    get_current_teacher,
    get_user_by_id,
    get_teacher_classes,
    get_class_students,
    TokenData,
)
from services import override_attendance, finalize_session
from services.audit_service import log_audit

# Backward compatibility alias for legacy dependency names
verify_teacher = get_current_teacher

router = APIRouter(prefix="/teachers", tags=["Teacher Operations"])


# ============================================================================
# SUBJECT MANAGEMENT
# ============================================================================

@router.post("/subjects", response_model=SubjectResponse, status_code=status.HTTP_201_CREATED)
async def create_subject(
    request: SubjectCreate,
    current_user: TokenData = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    """
    Create a new subject.
    Only teachers can create subjects.
    
    Args:
        request: Subject details (name, code)
        current_user: Current authenticated teacher
        db: Database session
        
    Returns:
        Created subject
        
    Raises:
        HTTPException: If subject code already exists
    """
    # Check if code already exists
    existing = db.query(Subject).filter(Subject.code == request.code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Subject code already exists",
        )
    
    subject = Subject(
        name=request.name,
        code=request.code,
    )
    
    db.add(subject)
    db.commit()
    db.refresh(subject)
    
    return subject


@router.get("/subjects", response_model=List[SubjectResponse])
async def list_subjects(
    current_user: TokenData = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    """
    List all subjects.
    
    Args:
        current_user: Current authenticated teacher
        db: Database session
        
    Returns:
        List of all subjects
    """
    subjects = db.query(Subject).all()
    return subjects


@router.get("/subjects/{subject_id}", response_model=SubjectResponse)
async def get_subject(
    subject_id: int,
    current_user: TokenData = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    """
    Get a single subject by ID.
    """
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
    return subject


@router.patch("/subjects/{subject_id}", response_model=SubjectResponse)
async def update_subject(
    subject_id: int,
    request: SubjectUpdate,
    current_user: TokenData = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    """
    Update subject fields.
    """
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
    if request.name is not None:
        subject.name = request.name
    if request.code is not None:
        # ensure unique code
        existing = db.query(Subject).filter(Subject.code == request.code, Subject.id != subject_id).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Subject code already exists")
        subject.code = request.code
    db.commit()
    db.refresh(subject)
    log_audit(db, current_user.user_id, "subject_update", "subject", subject.id, {"name": subject.name, "code": subject.code})
    return subject


@router.delete("/subjects/{subject_id}", response_model=dict)
async def delete_subject(
    subject_id: int,
    current_user: TokenData = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    """
    Delete a subject. Will cascade to related classes.
    """
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
    db.delete(subject)
    db.commit()
    log_audit(db, current_user.user_id, "subject_delete", "subject", subject_id, {})
    return {"success": True}


# ============================================================================
# CLASS MANAGEMENT
# ============================================================================

@router.post("/classes", response_model=ClassResponse, status_code=status.HTTP_201_CREATED)
async def create_class(
    request: ClassCreate,
    current_user: TokenData = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    """
    Create a new class.
    A class is a section of a subject taught by a teacher.
    
    Args:
        request: Class details (subject_id, teacher_id, year, section)
        current_user: Current authenticated teacher
        db: Database session
        
    Returns:
        Created class
        
    Raises:
        HTTPException: If subject or teacher not found
    """
    # Verify subject exists
    subject = db.query(Subject).filter(Subject.id == request.subject_id).first()
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found",
        )
    
    # Verify teacher exists
    teacher = get_user_by_id(db, request.teacher_id)
    if not teacher or teacher.role != UserRole.TEACHER:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher not found",
        )
    
    class_ = Class(
        subject_id=request.subject_id,
        teacher_id=request.teacher_id,
        year=request.year,
        section=request.section,
    )
    
    db.add(class_)
    db.commit()
    db.refresh(class_)
    
    # Auto-generate enrollment code for the new class.
    # In rare cases the generated code may collide with an existing unique code
    # which would raise an IntegrityError. Retry a few times to avoid surfacing
    # a 5xx to the client after the class row was already created.
    attempts = 0
    max_attempts = 5
    while attempts < max_attempts:
        attempts += 1
        code_val = EnrollmentCode.generate_code()
        enrollment_code = EnrollmentCode(
            class_id=class_.id,
            code=code_val,
            created_by=request.teacher_id,
            is_active=True,
        )
        db.add(enrollment_code)
        try:
            db.commit()
            break
        except IntegrityError:
            db.rollback()
            # collision on unique code; try again
            if attempts >= max_attempts:
                # give up but don't fail the whole request — log and continue
                try:
                    # best-effort: add a non-unique fallback code
                    enrollment_code.code = f"{class_.id}-{int(datetime.utcnow().timestamp())}"
                    db.add(enrollment_code)
                    db.commit()
                except Exception:
                    db.rollback()
                break
            continue
    
    return class_


@router.get("/classes", response_model=List[dict])
async def list_teacher_classes(
    current_user: TokenData = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    """
    Get all classes taught by the current teacher.
    
    Args:
        current_user: Current authenticated teacher
        db: Database session
        
    Returns:
        List of classes taught by this teacher with flattened subject info
    """
    classes = get_teacher_classes(db, current_user.user_id)
    result = []
    for cls in classes:
        result.append({
            "id": cls.id,
            "subject_id": cls.subject_id,
            "teacher_id": cls.teacher_id,
            "year": cls.year,
            "section": cls.section,
            "subject_name": cls.subject.name if cls.subject else None,
            "subject_code": cls.subject.code if cls.subject else None,
            "subject": {
                "id": cls.subject.id,
                "name": cls.subject.name,
                "code": cls.subject.code,
            } if cls.subject else None,
            "created_at": cls.created_at,
            "updated_at": cls.updated_at,
        })
    return result


@router.get("/classes/{class_id}", response_model=ClassResponse)
async def get_class_detail(
    class_id: int,
    current_user: TokenData = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    """
    Get class details for a teacher's class.
    """
    class_ = db.query(Class).filter(Class.id == class_id).first()
    if not class_:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")
    if class_.teacher_id != current_user.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only access your own classes")
    return class_


@router.get("/classes/{class_id}/students", response_model=List[dict])
async def get_class_students_detail(
    class_id: int,
    current_user: TokenData = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    """
    Get all students enrolled in a teacher's class with enrollment details.
    Uses a JOIN to avoid N+1 query problem.
    
    Args:
        class_id: ID of the class
        current_user: Current authenticated teacher
        db: Database session
        
    Returns:
        List of enrolled students with their details
    """
    from sqlalchemy.orm import joinedload
    
    # Verify class exists and belongs to this teacher
    class_ = db.query(Class).filter(Class.id == class_id).first()
    if not class_:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")
    if class_.teacher_id != current_user.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only access your own classes")
    
    # Use JOIN to fetch enrollments with students in ONE query (not N+1)
    enrollments = db.query(StudentEnrollment).filter(
        StudentEnrollment.class_id == class_id
    ).options(joinedload(StudentEnrollment.student)).all()
    
    result = []
    for enrollment in enrollments:
        student = enrollment.student
        if student:
            result.append({
                "enrollment_id": enrollment.id,
                "student_id": student.id,
                "student_name": student.name,
                "email": student.email,
                "roll_number": student.roll_number if hasattr(student, 'roll_number') else None,
                "enrolled_date": enrollment.enrolled_at.isoformat() if enrollment.enrolled_at else None,
                "status": "active",
            })
    
    return result


@router.post("/classes/students/batch", response_model=dict)
async def get_class_students_batch(
    request: dict,  # {"class_ids": [1, 2, 3]}
    current_user: TokenData = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    """
    Get students for multiple classes in ONE batch call.
    Replaces N separate /classes/{id}/students calls.
    Uses JOINs to avoid N+1 queries.
    
    Args:
        request: {"class_ids": [list of class IDs]}
        current_user: Current authenticated teacher
        db: Database session
        
    Returns:
        Dict mapping class_id to list of students
    """
    from sqlalchemy.orm import joinedload
    
    class_ids = request.get("class_ids", [])
    if not class_ids:
        return {}
    
    # Verify all classes belong to this teacher
    classes = db.query(Class).filter(Class.id.in_(class_ids)).all()
    class_map = {c.id: c for c in classes}
    
    for class_id in class_ids:
        if class_id not in class_map:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Class {class_id} not found")
        if class_map[class_id].teacher_id != current_user.user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only access your own classes")
    
    # Fetch ALL enrollments for ALL these classes in ONE query with JOIN
    enrollments = db.query(StudentEnrollment).filter(
        StudentEnrollment.class_id.in_(class_ids)
    ).options(joinedload(StudentEnrollment.student)).all()
    
    # Organize by class_id
    result = {}
    for class_id in class_ids:
        result[class_id] = []
    
    for enrollment in enrollments:
        student = enrollment.student
        if student and enrollment.class_id in result:
            result[enrollment.class_id].append({
                "enrollment_id": enrollment.id,
                "student_id": student.id,
                "student_name": student.name,
                "email": student.email,
                "roll_number": student.roll_number if hasattr(student, 'roll_number') else None,
                "enrolled_date": enrollment.enrolled_at.isoformat() if enrollment.enrolled_at else None,
                "status": "active",
            })
    
    return result


@router.delete("/classes/{class_id}/students/{student_id}", response_model=dict)
async def remove_student_from_class(
    class_id: int,
    student_id: int,
    current_user: TokenData = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    """
    Remove a student from a class (unenroll).
    
    Args:
        class_id: ID of the class
        student_id: ID of the student to remove
        current_user: Current authenticated teacher
        db: Database session
        
    Returns:
        Success message
    """
    # Verify class exists and belongs to this teacher
    class_ = db.query(Class).filter(Class.id == class_id).first()
    if not class_:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")
    if class_.teacher_id != current_user.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only manage your own classes")
    
    # Find and delete the enrollment
    enrollment = db.query(StudentEnrollment).filter(
        StudentEnrollment.class_id == class_id,
        StudentEnrollment.student_id == student_id
    ).first()
    
    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student is not enrolled in this class"
        )
    
    student = db.query(User).filter(User.id == student_id).first()
    student_name = student.name if student else f"Student {student_id}"
    
    db.delete(enrollment)
    db.commit()
    
    log_audit(
        db,
        current_user.user_id,
        "student_removed_from_class",
        "student_enrollment",
        enrollment.id,
        {"class_id": class_id, "student_id": student_id, "student_name": student_name}
    )
    
    return {
        "success": True,
        "message": f"Student {student_name} has been removed from the class",
        "student_id": student_id,
        "class_id": class_id
    }


@router.post("/classes/{class_id}/students", response_model=dict)
async def add_student_to_class(
    class_id: int,
    payload: dict,
    current_user: TokenData = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    """
    Add a student to a class (manual enrollment).
    
    Args:
        class_id: ID of the class
        payload: Contains 'student_id'
        current_user: Current authenticated teacher
        db: Database session
        
    Returns:
        Success message with enrollment details
    """
    # Verify class exists and belongs to this teacher
    class_ = db.query(Class).filter(Class.id == class_id).first()
    if not class_:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")
    if class_.teacher_id != current_user.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only manage your own classes")
    
    student_id = payload.get("student_id")
    if not student_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="student_id is required"
        )
    
    # Verify student exists
    student = db.query(User).filter(User.id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    
    # Check if already enrolled
    existing = db.query(StudentEnrollment).filter(
        StudentEnrollment.class_id == class_id,
        StudentEnrollment.student_id == student_id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student is already enrolled in this class"
        )
    
    # Create enrollment
    enrollment = StudentEnrollment(
        class_id=class_id,
        student_id=student_id
    )
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    
    log_audit(
        db,
        current_user.user_id,
        "student_added_to_class",
        "student_enrollment",
        enrollment.id,
        {"class_id": class_id, "student_id": student_id, "student_name": student.name}
    )
    
    return {
        "success": True,
        "message": f"Student {student.name} has been enrolled in the class",
        "enrollment_id": enrollment.id,
        "student_id": student_id,
        "class_id": class_id
    }

async def update_class(
    class_id: int,
    request: ClassUpdate,
    current_user: TokenData = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    """
    Update class fields.
    """
    class_ = db.query(Class).filter(Class.id == class_id).first()
    if not class_:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")
    if class_.teacher_id != current_user.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only update your own classes")
    if request.subject_id is not None:
        subject = db.query(Subject).filter(Subject.id == request.subject_id).first()
        if not subject:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
        class_.subject_id = request.subject_id
    if request.teacher_id is not None:
        teacher = get_user_by_id(db, request.teacher_id)
        if not teacher or teacher.role != UserRole.TEACHER:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher not found")
        class_.teacher_id = request.teacher_id
    if request.year is not None:
        class_.year = request.year
    if request.section is not None:
        class_.section = request.section
    db.commit()
    db.refresh(class_)
    log_audit(db, current_user.user_id, "class_update", "class", class_id, {"section": class_.section, "year": class_.year})
    return class_


@router.delete("/classes/{class_id}", response_model=dict)
async def delete_class(
    class_id: int,
    current_user: TokenData = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    """
    Delete a class.
    """
    class_ = db.query(Class).filter(Class.id == class_id).first()
    if not class_:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")
    if class_.teacher_id != current_user.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only delete your own classes")
    db.delete(class_)
    db.commit()
    log_audit(db, current_user.user_id, "class_delete", "class", class_id, {})
    return {"success": True}


# ============================================================================
# ATTENDANCE SESSION MANAGEMENT
# ============================================================================

@router.post("/attendance/session/start", response_model=AttendanceSessionResponse, status_code=status.HTTP_201_CREATED)
async def start_attendance_session(
    request: AttendanceSessionStart,
    current_user: TokenData = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    """
    Start a new attendance session for a class.
    Generates QR code if QR verification is enabled.
    
    Args:
        request: Class ID and QR enabled flag
        current_user: Current authenticated teacher
        db: Database session
        
    Returns:
        Created attendance session
        
    Raises:
        HTTPException: If class not found or teacher doesn't teach this class
    """
    # Verify class exists and teacher teaches it
    class_ = db.query(Class).filter(Class.id == request.class_id).first()
    if not class_:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found",
        )
    
    if class_.teacher_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only start sessions for your own classes",
        )

    # Prevent multiple active sessions for the same class
    existing_open = db.query(AttendanceSession).filter(
        AttendanceSession.class_id == request.class_id,
        AttendanceSession.status == "open",
    ).first()
    if existing_open:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An active session already exists for this class",
        )
    
    # Generate QR code if needed
    qr_code = None
    if request.qr_enabled:
        qr_code = str(uuid.uuid4())  # Generate unique QR code
    
    session = AttendanceSession(
        class_id=request.class_id,
        date=datetime.utcnow(),
        qr_enabled=request.qr_enabled,
        qr_code=qr_code,
        original_image=None,
        annotated_image=None,
        status="open",
    )
    
    db.add(session)
    db.flush()  # Flush to get session ID before creating records
    
    # Create attendance records for all enrolled students
    students = get_class_students(db, request.class_id)
    for student in students:
        record = AttendanceRecord(
            session_id=session.id,
            student_id=student.id,
            face_detected=False,
            qr_verified=False,
            final_status="absent",
        )
        db.add(record)
    
    db.commit()
    db.refresh(session)
    log_audit(db, current_user.user_id, "session_start", "attendance_session", session.id, {"class_id": request.class_id, "qr_enabled": request.qr_enabled})
    
    return session


@router.get("/attendance/session/{session_id}", response_model=AttendanceSessionResponse)
async def get_attendance_session(
    session_id: int,
    current_user: TokenData = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    """
    Get attendance session details.
    
    Args:
        session_id: Attendance session ID
        current_user: Current authenticated teacher
        db: Database session
        
    Returns:
        Attendance session details
        
    Raises:
        HTTPException: If session not found
    """
    session = db.query(AttendanceSession).filter(
        AttendanceSession.id == session_id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )
    
    # Verify teacher teaches this class
    if session.class_.teacher_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access sessions for your own classes",
        )
    
    return session


@router.get("/classes/{class_id}/sessions", response_model=List[AttendanceSessionResponse])
async def list_class_sessions(
    class_id: int,
    current_user: TokenData = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    """
    List all attendance sessions for a class.
    """
    class_ = db.query(Class).filter(Class.id == class_id).first()
    if not class_:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")
    if class_.teacher_id != current_user.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only access your own classes")
    sessions = db.query(AttendanceSession).filter(AttendanceSession.class_id == class_id).order_by(AttendanceSession.date.desc()).all()
    return sessions


@router.get("/attendance/session/{session_id}/records", response_model=List[TeacherAttendanceRecordResponse])
async def get_session_records(
    session_id: int,
    current_user: TokenData = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    """
    Get all attendance records for a session.
    
    Args:
        session_id: Attendance session ID
        current_user: Current authenticated teacher
        db: Database session
        
    Returns:
        List of attendance records
        
    Raises:
        HTTPException: If session not found
    """
    session = db.query(AttendanceSession).filter(
        AttendanceSession.id == session_id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )
    
    # Verify teacher teaches this class
    if session.class_.teacher_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access records for your own classes",
        )
    
    records = db.query(AttendanceRecord).filter(
        AttendanceRecord.session_id == session_id
    ).all()

    response = []
    for record in records:
        student = record.student
        response.append(
            {
                "id": record.id,
                "session_id": record.session_id,
                "student_id": record.student_id,
                "face_detected": record.face_detected,
                "qr_verified": record.qr_verified,
                "confidence": record.confidence,
                "final_status": record.final_status,
                "overridden_by_teacher": record.overridden_by_teacher,
                "override_reason": record.override_reason,
                "created_at": record.created_at,
                "updated_at": record.updated_at,
                "student_name": student.name if student else None,
                "student_email": student.email if student else None,
                "roll_number": student.roll_number if student else None,
            }
        )

    return response


# ============================================================================
# ATTENDANCE OVERRIDE
# ============================================================================

@router.patch("/attendance/session/{session_id}/override", response_model=AttendanceRecordResponse)
async def override_student_attendance(
    session_id: int,
    request: TeacherOverride,
    current_user: TokenData = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    """
    Manually override a student's attendance status.
    Override is allowed even after session is finalized.
    
    Args:
        session_id: Attendance session ID
        request: Override details (student_id, final_status, reason)
        current_user: Current authenticated teacher
        db: Database session
        
    Returns:
        Updated attendance record
        
    Raises:
        HTTPException: If session/record not found or permission denied
    """
    # Verify session exists
    session = db.query(AttendanceSession).filter(
        AttendanceSession.id == session_id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )
    
    # Verify teacher teaches this class
    if session.class_.teacher_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only override attendance for your own classes",
        )
    
    # Find attendance record
    record = db.query(AttendanceRecord).filter(
        AttendanceRecord.session_id == session_id,
        AttendanceRecord.student_id == request.student_id,
    ).first()
    
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attendance record not found",
        )
    
    # Apply override
    success, message, updated_record = override_attendance(
        db,
        record,
        request.final_status.value,
        request.reason,
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message,
        )
    
    log_audit(db, current_user.user_id, "attendance_override", "attendance_record", updated_record.id, {"new_status": request.final_status.value, "reason": request.reason})
    return updated_record


# ============================================================================
# SESSION FINALIZATION
# ============================================================================

@router.post("/attendance/session/{session_id}/finalize", response_model=dict)
async def finalize_attendance_session(
    session_id: int,
    current_user: TokenData = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    """
    Finalize an attendance session.
    Finalization closes automated collection, but manual teacher overrides remain allowed.
    
    Args:
        session_id: Attendance session ID
        current_user: Current authenticated teacher
        db: Database session
        
    Returns:
        Success message and statistics
        
    Raises:
        HTTPException: If session not found, already finalized, or permission denied
    """
    # Verify session exists
    session = db.query(AttendanceSession).filter(
        AttendanceSession.id == session_id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )
    
    # Verify teacher teaches this class
    if session.class_.teacher_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only finalize sessions for your own classes",
        )
    
    # Finalize session
    success, message = finalize_session(db, session)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message,
        )
    
    log_audit(db, current_user.user_id, "session_finalize", "attendance_session", session_id, {})
    return {"success": True, "message": message}


# ============================================================================
# SCHEDULE MANAGEMENT ENDPOINTS
# ============================================================================

@router.get("/classes/{class_id}/schedules", response_model=List[dict])
async def get_class_schedules(
    class_id: int,
    current_user: TokenData = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    """Get all schedules for a class."""
    # Verify class exists and belongs to this teacher
    class_ = db.query(Class).filter(Class.id == class_id).first()
    if not class_:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")
    if class_.teacher_id != current_user.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only access your own classes")
    
    # Get all schedules for this class
    schedules = db.query(ClassSchedule).filter(
        ClassSchedule.class_id == class_id
    ).order_by(ClassSchedule.day_of_week, ClassSchedule.start_time).all()
    
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    
    result = []
    for schedule in schedules:
        result.append({
            "id": schedule.id,
            "class_id": schedule.class_id,
            "day_of_week": schedule.day_of_week,
            "day_name": days[schedule.day_of_week],
            "start_time": schedule.start_time.isoformat() if schedule.start_time else None,
            "end_time": schedule.end_time.isoformat() if schedule.end_time else None,
            "room_number": schedule.room_number,
            "created_at": schedule.created_at.isoformat() if schedule.created_at else None,
        })
    
    return result


@router.post("/classes/{class_id}/schedules", response_model=dict, status_code=status.HTTP_201_CREATED)
async def add_class_schedule(
    class_id: int,
    schedule_data: dict,
    current_user: TokenData = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    """Add a new schedule to a class."""
    # Verify class exists and belongs to this teacher
    class_ = db.query(Class).filter(Class.id == class_id).first()
    if not class_:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")
    if class_.teacher_id != current_user.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only manage your own classes")
    
    try:
        # Validate input
        day_of_week = schedule_data.get("day_of_week")
        start_time = schedule_data.get("start_time")
        end_time = schedule_data.get("end_time")
        room_number = schedule_data.get("room_number")
        
        if day_of_week is None or start_time is None or end_time is None:
            raise ValueError("day_of_week, start_time, and end_time are required")
        
        if not (0 <= day_of_week <= 6):
            raise ValueError("day_of_week must be between 0 and 6")
        
        # Create schedule
        new_schedule = ClassSchedule(
            class_id=class_id,
            day_of_week=day_of_week,
            start_time=start_time,
            end_time=end_time,
            room_number=room_number,
        )
        db.add(new_schedule)
        db.commit()
        db.refresh(new_schedule)
        
        days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        
        log_audit(db, current_user.user_id, "schedule_create", "class_schedule", new_schedule.id, {
            "class_id": class_id,
            "day": days[day_of_week],
            "time": f"{start_time}-{end_time}",
        })
        
        return {
            "success": True,
            "message": f"Schedule added: {days[day_of_week]} {start_time}-{end_time}",
            "schedule_id": new_schedule.id,
        }
    
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.delete("/classes/{class_id}/schedules/{schedule_id}", response_model=dict)
async def delete_class_schedule(
    class_id: int,
    schedule_id: int,
    current_user: TokenData = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    """Delete a schedule from a class."""
    # Verify class exists and belongs to this teacher
    class_ = db.query(Class).filter(Class.id == class_id).first()
    if not class_:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")
    if class_.teacher_id != current_user.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only manage your own classes")
    
    # Get schedule
    schedule = db.query(ClassSchedule).filter(
        ClassSchedule.id == schedule_id,
        ClassSchedule.class_id == class_id
    ).first()
    
    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found")
    
    try:
        days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        day_name = days[schedule.day_of_week]
        
        db.delete(schedule)
        db.commit()
        
        log_audit(db, current_user.user_id, "schedule_delete", "class_schedule", schedule_id, {
            "class_id": class_id,
            "day": day_name,
        })
        
        return {
            "success": True,
            "message": f"Schedule for {day_name} has been deleted",
            "schedule_id": schedule_id,
        }
    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    TeacherClassResponse,

    result = []
    for class_obj in classes:
        subject = class_obj.subject
        if subject is None:
            subject = db.query(Subject).filter(Subject.id == class_obj.subject_id).first()

        teacher = class_obj.teacher
        if teacher is None:
            teacher = db.query(User).filter(User.id == class_obj.teacher_id).first()

        result.append(TeacherClassResponse(
            id=class_obj.id,
            subject_id=class_obj.subject_id,
            teacher_id=class_obj.teacher_id,
            year=class_obj.year,
            section=class_obj.section,
            subject_name=subject.name if subject else 'Unknown',
            subject_code=subject.code if subject else 'N/A',
            teacher_name=teacher.name if teacher else 'Unknown',
            created_at=class_obj.created_at,
            updated_at=class_obj.updated_at,
        ))
    return result