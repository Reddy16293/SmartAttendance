"""
Attendance routes for College Attendance System.
Handles attendance session image uploads, QR verification, and processing.
"""

from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta

from db.session import get_db
from models import (
    AttendanceSession,
    AttendanceRecord,
    User,
    StudentEnrollment,
)
from schemas import (
    AttendanceRecordResponse,
    QRVerificationRequest,
    QRVerificationResponse,
    ImageUploadResponse,
    FaceRecognitionResult,
    AttendanceCodeSubmit,
    AttendanceCodeResponse,
    QRCodeGenerateResponse,
    QRCodeSubmitRequest,
    QRCodeUploadResponse,
    AttendanceSessionResponse,
    AttendanceApprovalRequest,
    PendingAttendanceResponse,
)
from utils import (
    get_current_user,
    get_current_student,
    TokenData,
    get_user_by_id,
)
from services import (
    update_attendance_record,
    FaceRecognitionService,
    compute_attendance_status,
)
from services.storage_service import (
    build_session_image_path,
    decode_base64_image,
    upload_public_storage_object,
)
from services.audit_service import log_audit

router = APIRouter(prefix="/attendance", tags=["Attendance Operations"])

SESSION_DURATION_MINUTES = 5


def _session_expires_at(session: AttendanceSession) -> datetime:
    return session.date + timedelta(minutes=SESSION_DURATION_MINUTES)

def _requires_dual_verification(session):
    has_secondary = bool(session.attendance_code) or bool(session.qr_enabled)
    return bool(session.face_recognition_enabled) and has_secondary

def _is_session_expired(session: AttendanceSession, now: Optional[datetime] = None) -> bool:
    now = now or datetime.utcnow()
    return _session_expires_at(session) <= now


def _auto_close_expired_session(db: Session, session: AttendanceSession) -> bool:
    if session.status != "open":
        return False

    if not _is_session_expired(session):
        return False

    session.status = "closed"
    db.commit()
    db.refresh(session)
    return True


def _close_expired_open_sessions_for_class(db: Session, class_id: int) -> None:
    open_sessions = db.query(AttendanceSession).filter(
        AttendanceSession.class_id == class_id,
        AttendanceSession.status == "open",
    ).all()

    changed = False
    for session in open_sessions:
        if _is_session_expired(session):
            session.status = "closed"
            changed = True

    if changed:
        db.commit()


def _close_all_expired_open_sessions(db: Session) -> None:
    open_sessions = db.query(AttendanceSession).filter(
        AttendanceSession.status == "open",
    ).all()

    changed = False
    for session in open_sessions:
        if _is_session_expired(session):
            session.status = "closed"
            changed = True

    if changed:
        db.commit()


@router.get("/class/{class_id}/active-session")
async def get_active_session_for_class(
    class_id: int,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Return active session details with remaining time for professor config screens.
    """
    from models import Class

    class_obj = db.query(Class).filter(Class.id == class_id).first()
    if not class_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found",
        )

    if class_obj.teacher_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access sessions for your own classes",
        )

    _close_expired_open_sessions_for_class(db, class_id)

    session = db.query(AttendanceSession).filter(
        AttendanceSession.class_id == class_id,
        AttendanceSession.status == "open",
    ).order_by(AttendanceSession.date.desc()).first()

    if not session:
        return {"has_active_session": False, "session": None}

    expires_at = _session_expires_at(session)
    remaining_seconds = max(0, int((expires_at - datetime.utcnow()).total_seconds()))

    return {
        "has_active_session": True,
        "session": {
            "id": session.id,
            "class_id": session.class_id,
            "status": session.status,
            "created_at": session.date.isoformat(),
            "expires_at": expires_at.isoformat(),
            "remaining_seconds": remaining_seconds,
            "face_recognition_enabled": bool(session.face_recognition_enabled),
            "has_code": bool(session.attendance_code),
            "has_qr": bool(session.qr_enabled),
            "original_image": session.original_image,
            "annotated_image": session.annotated_image,
        },
    }


@router.post("/classes/active-sessions/batch")
async def get_active_sessions_batch(
    request: dict,  # {"class_ids": [1, 2, 3]}
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get active sessions for multiple classes in ONE batch call.
    This replaces N separate /class/{id}/active-session calls.
    
    Args:
        request: {"class_ids": [list of class IDs]}
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Dict mapping class_id to active session info
    """
    from models import Class
    
    class_ids = request.get("class_ids", [])
    if not class_ids:
        return {}
    
    # Verify all classes belong to this user (if teacher)
    if current_user.role == "professor":
        classes = db.query(Class).filter(Class.id.in_(class_ids)).all()
        for cls in classes:
            if cls.teacher_id != current_user.user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only access sessions for your own classes",
                )
    
    # Close expired sessions for all classes before fetching active ones
    _close_all_expired_open_sessions(db)
    
    # Fetch all active sessions for these classes in ONE query
    sessions = db.query(AttendanceSession).filter(
        AttendanceSession.class_id.in_(class_ids),
        AttendanceSession.status == "open",
    ).all()
    
    result = {}
    for session in sessions:
        class_id = session.class_id
        expires_at = _session_expires_at(session)
        remaining_seconds = max(0, int((expires_at - datetime.utcnow()).total_seconds()))
        
        result[class_id] = {
            "has_active_session": True,
            "session": {
                "id": session.id,
                "class_id": session.class_id,
                "status": session.status,
                "created_at": session.date.isoformat(),
                "expires_at": expires_at.isoformat(),
                "remaining_seconds": remaining_seconds,
                "face_recognition_enabled": bool(session.face_recognition_enabled),
                "has_code": bool(session.attendance_code),
                "has_qr": bool(session.qr_enabled),
                "original_image": session.original_image,
                "annotated_image": session.annotated_image,
            }
        }
    
    # Fill in classes with no active session
    for class_id in class_ids:
        if class_id not in result:
            result[class_id] = {"has_active_session": False, "session": None}
    
    return result


# ============================================================================
# TEACHER: IMAGE UPLOAD AND FACE RECOGNITION
# ============================================================================

@router.post("/session/{session_id}/upload-image", response_model=ImageUploadResponse)
async def upload_classroom_image(
    session_id: int,
    image: UploadFile = File(...),
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Upload a classroom image for face recognition.
    
    This endpoint:
    1. Receives classroom image from teacher
    2. Calls external face recognition service
    3. Maps recognized faces to enrolled students
    4. Updates attendance records with face detection results
    
    Args:
        session_id: Attendance session ID
        image: Classroom image file
        current_user: Current authenticated user (teacher)
        db: Database session
        
    Returns:
        List of recognized students and updated attendance records
        
    Raises:
        HTTPException: If session not found or user lacks permission
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
    
    # Verify user is the teacher of this class
    if session.class_.teacher_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only upload images for your own classes",
        )
    
    # Check if session is still open
    _auto_close_expired_session(db, session)
    if session.status != "open":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session is already closed",
        )
    
    # Read image bytes
    image_bytes = await image.read()
    
    print("\n" + "="*80)
    print("🔍 FACE RECOGNITION - ATTENDANCE PROCESSING")
    print("="*80)
    print(f"📋 Session ID: {session_id}")
    print(f"👨‍🏫 Professor: {current_user.email} (ID: {current_user.user_id})")
    print(f"📚 Class ID: {session.class_id}")
    print(f"📸 Image Size: {len(image_bytes)} bytes")
    
    # Always persist the latest original image for this session before processing.
    original_content_type = image.content_type or "image/jpeg"
    original_storage_path = build_session_image_path(session_id, "original", original_content_type)
    original_image_url = await upload_public_storage_object(
        original_storage_path,
        image_bytes,
        original_content_type,
    )

    # Call face recognition service and get annotated image.
    # Recognition failures should not block image persistence.
    print("\n🤖 Calling face recognition model...")
    recognized_students = []
    image_with_boxes = None
    try:
        recognized_students, image_with_boxes = await FaceRecognitionService.recognize_faces_with_image(image_bytes)
    except Exception as exc:
        print(f"⚠️ Face recognition failed: {exc}")
        recognized_students = []
        image_with_boxes = None

    print(f"\n✅ Model Response: {len(recognized_students)} faces recognized")
    for idx, rec in enumerate(recognized_students, 1):
        print(f"   {idx}. {rec.name} - Confidence: {rec.confidence:.2%}")
    
    # Get enrolled students for this class
    enrollments = db.query(StudentEnrollment).filter(
        StudentEnrollment.class_id == session.class_id
    ).all()
    enrolled_student_ids = {e.student_id for e in enrollments}
    
    # Get student details for mapping
    enrolled_students = db.query(User).filter(
        User.id.in_(enrolled_student_ids)
    ).all()
    student_map = {s.id: s for s in enrolled_students}
    
    # Create roll number map for direct matching (FaceModel returns roll numbers)
    roll_number_map = {str(s.roll_number).strip().upper(): s for s in enrolled_students if s.roll_number}
    
    print(f"\n📊 Total Enrolled Students: {len(enrolled_student_ids)}")
    print(f"📋 Roll number map: {list(roll_number_map.keys())}")
    
    # Update attendance records with recognized faces
    updated_count = 0
    matched_students = []
    unmatched_recognitions = []
    
    for recognition_result in recognized_students:
        try:
            matched_student = None
            recognized_value = recognition_result.name.strip()
            
            print(f"\n🔎 Matching: '{recognized_value}'")
            
            # Priority 1: Match by roll number (FaceModel returns roll numbers)
            if recognized_value.upper() in roll_number_map:
                matched_student = roll_number_map[recognized_value.upper()]
                print(f"   ✅ Matched by roll number -> {matched_student.name}")
            
            # Priority 2: Match by name (case-insensitive, flexible matching)
            if not matched_student:
                for student in enrolled_students:
                    if recognized_value.lower().replace("_", " ") in student.name.lower():
                        matched_student = student
                        print(f"   ✅ Matched by name -> {student.name}")
                        break
            
            # Priority 3: Try direct ID mapping
            if not matched_student:
                try:
                    student_id = FaceRecognitionService.get_student_id_from_name(recognized_value)
                    if student_id in enrolled_student_ids:
                        matched_student = student_map[student_id]
                        print(f"   ✅ Matched by ID -> {matched_student.name}")
                except ValueError:
                    pass
            
            if not matched_student:
                unmatched_recognitions.append(recognition_result.name)
                print(f"⚠️  NOT ENROLLED: {recognized_value} (not in this class)")
                continue
            
            # Find attendance record for this student
            record = db.query(AttendanceRecord).filter(
                AttendanceRecord.session_id == session_id,
                AttendanceRecord.student_id == matched_student.id,
            ).first()
            
            if record:
                # If dual verification mode is enabled, face-only or code-only remains pending.
                require_both = _requires_dual_verification(session)
                updated_record = update_attendance_record(
                    db,
                    record,
                    face_detected=True,
                    confidence=recognition_result.confidence,
                    require_both=require_both,
                )
                updated_count += 1
                matched_students.append({
                    "id": matched_student.id,
                    "name": matched_student.name,
                    "email": matched_student.email,
                    "confidence": recognition_result.confidence
                })
                if updated_record.final_status == "present":
                    print(f"✅ PRESENT: {matched_student.name} ({matched_student.email}) - {recognition_result.confidence:.2%}")
                elif updated_record.final_status == "pending_approval":
                    print(f"⏳ PENDING REVIEW: {matched_student.name} ({matched_student.email}) - face verified, waiting for code/QR")
                else:
                    print(f"❌ ABSENT: {matched_student.name} ({matched_student.email})")
                
        except ValueError as e:
            unmatched_recognitions.append(recognition_result.name)
            print(f"❌ ERROR: {recognition_result.name} - {str(e)}")
            continue
    
    print(f"\n📈 SUMMARY:")
    print(f"   ✅ Marked Present: {updated_count} students")
    print(f"   ⚠️  Unmatched: {len(unmatched_recognitions)} recognitions")
    if unmatched_recognitions:
        print(f"   Unmatched names: {', '.join(unmatched_recognitions)}")
    print("="*80 + "\n")

    # Persist an annotated image for every upload.
    # If recognition does not return boxed output, store the original as fallback.
    if image_with_boxes:
        annotated_bytes, annotated_content_type = decode_base64_image(image_with_boxes)
    else:
        annotated_bytes, annotated_content_type = image_bytes, original_content_type

    annotated_storage_path = build_session_image_path(
        session_id,
        "annotated",
        annotated_content_type,
    )
    annotated_image_url = await upload_public_storage_object(
        annotated_storage_path,
        annotated_bytes,
        annotated_content_type,
    )

    session.original_image = original_image_url
    session.annotated_image = annotated_image_url
    db.commit()
    db.refresh(session)

    # Audit: image upload processed
    try:
        log_audit(
            db,
            current_user.user_id,
            "image_upload",
            "attendance_session",
            session_id,
            {
                "recognized_students": len(recognized_students),
                "updated_records": updated_count,
                "matched_students": matched_students,
                "unmatched": unmatched_recognitions
            },
        )
    except Exception:
        pass

    return ImageUploadResponse(
        session_id=session_id,
        recognized_students=recognized_students,
        updated_records=updated_count,
        image_with_boxes=image_with_boxes,
        original_image_url=original_image_url,
        annotated_image_url=annotated_image_url,
    )


# ============================================================================
# STUDENT: QR VERIFICATION
# ============================================================================

@router.post("/session/{session_id}/verify", response_model=QRVerificationResponse)
async def verify_qr_code(
    session_id: int,
    request: QRVerificationRequest,
    current_user: TokenData = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    """
    Verify attendance using QR code.
    
    This endpoint:
    1. Verifies QR code matches the session
    2. Marks student as QR verified
    3. Recomputes final attendance status
    4. Returns updated attendance record
    
    Args:
        session_id: Attendance session ID
        request: QR code from student
        current_user: Current authenticated student
        db: Database session
        
    Returns:
        Verification result and updated attendance record
        
    Raises:
        HTTPException: If session not found, not enrolled, QR invalid, etc.
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
    
    # Check if QR is enabled for this session
    if not session.qr_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="QR verification is not enabled for this session",
        )
    
    # Check if session is still open
    _auto_close_expired_session(db, session)
    if session.status != "open":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session is closed",
        )

    if session.qr_expires_at and session.qr_expires_at < datetime.utcnow():
        session.status = "closed"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session has expired",
        )
    
    # Verify student is enrolled in this class
    from utils import is_student_enrolled
    if not is_student_enrolled(db, current_user.user_id, session.class_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not enrolled in this class",
        )
    
    # Verify QR code
    if request.qr_code != session.qr_code:
        return QRVerificationResponse(
            verified=False,
            message="Invalid QR code",
            attendance_record=None,
        )
    
    # Find attendance record
    record = db.query(AttendanceRecord).filter(
        AttendanceRecord.session_id == session_id,
        AttendanceRecord.student_id == current_user.user_id,
    ).first()
    
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attendance record not found",
        )
    
    # Update record with QR verification
    require_both = _requires_dual_verification(session) and True  # QR is part of dual verification
    updated_record = update_attendance_record(
        db,
        record,
        qr_verified=True,
        require_both=require_both,
    )
    log_audit(db, current_user.user_id, "qr_verify", "attendance_record", updated_record.id, {"session_id": session_id})
    
    return QRVerificationResponse(
        verified=True,
        message="QR code verified successfully",
        attendance_record=AttendanceRecordResponse.from_orm(updated_record),
    )


# ============================================================================
# RETRIEVE ATTENDANCE RECORDS
# ============================================================================

@router.get("/record/{record_id}", response_model=AttendanceRecordResponse)
async def get_attendance_record(
    record_id: int,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get an attendance record.
    Students can only access their own records; teachers can access their class records.
    
    Args:
        record_id: Attendance record ID
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Attendance record details
        
    Raises:
        HTTPException: If record not found or permission denied
    """
    record = db.query(AttendanceRecord).filter(
        AttendanceRecord.id == record_id
    ).first()
    
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attendance record not found",
        )
    
    # Check permissions
    if current_user.role == "student":
        if record.student_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only access your own records",
            )
    elif current_user.role == "teacher":
        if record.session.class_.teacher_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only access records for your own classes",
            )
    
    return record


@router.get("/session/{session_id}/records", response_model=List[AttendanceRecordResponse])
async def get_session_records(
    session_id: int,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get all attendance records for a session.
    Teachers can access their class records; students can access their own.
    
    Args:
        session_id: Attendance session ID
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        List of attendance records for the session
        
    Raises:
        HTTPException: If session not found or permission denied
    """
    session = db.query(AttendanceSession).filter(
        AttendanceSession.id == session_id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )
    
    # Check permissions
    if current_user.role == "student":
        # Students can only see their own record
        records = db.query(AttendanceRecord).filter(
            AttendanceRecord.session_id == session_id,
            AttendanceRecord.student_id == current_user.user_id,
        ).all()
    elif current_user.role == "teacher":
        # Teachers can see all records for their class
        if session.class_.teacher_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only access records for your own classes",
            )
        records = db.query(AttendanceRecord).filter(
            AttendanceRecord.session_id == session_id
        ).all()
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid user role",
        )
    
    return records

# ============================================================================
# ATTENDANCE CODE SYSTEM
# ============================================================================

@router.post("/session/create-with-code", response_model=AttendanceSessionResponse)
async def create_attendance_session_with_code(
    class_id: int,
    face_recognition_enabled: bool = False,
    generate_code: bool = True,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create attendance session with a simple 6-digit attendance code.
    Professor creates this for a class session.
    
    Args:
        class_id: Class ID for which to create attendance session
        face_recognition_enabled: Whether to require dual verification (face + code)
        generate_code: Whether to generate code now (false for face-only start)
        current_user: Current authenticated user (must be teacher)
        db: Database session
        
    Returns:
        Created attendance session with code
        
    Raises:
        HTTPException: If class not found or user not authorized
    """
    from models import Class
    from datetime import timedelta
    import random
    import string
    
    # Verify class exists and user is the teacher
    class_obj = db.query(Class).filter(Class.id == class_id).first()
    if not class_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found",
        )
    
    if class_obj.teacher_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only create attendance for your own classes",
        )

    # Auto-close expired sessions first so professors can start fresh after timeout.
    _close_expired_open_sessions_for_class(db, class_id)

    # Reuse existing active session for this class to keep a strict single-session policy.
    existing_open = db.query(AttendanceSession).filter(
        AttendanceSession.class_id == class_id,
        AttendanceSession.status == "open",
    ).first()
    if existing_open:
        if generate_code:
            attendance_code = ''.join(random.choices(string.digits, k=6))
            while db.query(AttendanceSession).filter(
                AttendanceSession.attendance_code == attendance_code,
                AttendanceSession.status == "open"
            ).first():
                attendance_code = ''.join(random.choices(string.digits, k=6))

            existing_open.attendance_code = attendance_code
            existing_open.code_expires_at = _session_expires_at(existing_open)
            db.commit()
            db.refresh(existing_open)
        return existing_open

    attendance_code = None
    if generate_code:
        # Generate 6-digit attendance code
        attendance_code = ''.join(random.choices(string.digits, k=6))

        # Check if code already exists (unlikely but possible)
        while db.query(AttendanceSession).filter(
            AttendanceSession.attendance_code == attendance_code,
            AttendanceSession.status == "open"
        ).first():
            attendance_code = ''.join(random.choices(string.digits, k=6))

    session_start = datetime.utcnow()
    code_expires_at = session_start + timedelta(minutes=SESSION_DURATION_MINUTES)
    
    # Create attendance session
    session = AttendanceSession(
        class_id=class_id,
        date=session_start,
        attendance_code=attendance_code,
        code_expires_at=code_expires_at,
        face_recognition_enabled=face_recognition_enabled,
        status="open",
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    
    # Create attendance records for all enrolled students
    enrollments = db.query(StudentEnrollment).filter(
        StudentEnrollment.class_id == class_id
    ).all()
    
    for enrollment in enrollments:
        record = AttendanceRecord(
            session_id=session.id,
            student_id=enrollment.student_id,
            face_detected=False,
            qr_verified=False,
            final_status="manual_review",
        )
        db.add(record)
    
    db.commit()
    
    # Log audit
    try:
        log_audit(
            db,
            current_user.user_id,
            "create_attendance_session",
            "attendance_session",
            session.id,
            {
                "class_id": class_id,
                "attendance_code": attendance_code,
                "face_recognition_enabled": face_recognition_enabled,
                "generate_code": generate_code,
                "session_expires_at": code_expires_at.isoformat(),
            },
        )
    except Exception:
        pass
    
    return session


@router.post("/submit-code", response_model=AttendanceCodeResponse)
async def submit_attendance_code(
    request: AttendanceCodeSubmit,
    current_user: TokenData = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    """
    Student submits attendance code to mark attendance.
    
    Args:
        request: Contains the attendance code
        current_user: Current authenticated student
        db: Database session
        
    Returns:
        Response indicating success or failure
        
    Raises:
        HTTPException: If code invalid, expired, or student not enrolled
    """
    # Find session with this code
    _close_all_expired_open_sessions(db)

    session = db.query(AttendanceSession).filter(
        AttendanceSession.attendance_code == request.code,
        AttendanceSession.status == "open"
    ).first()
    
    if not session:
        return AttendanceCodeResponse(
            success=False,
            message="Wrong attendance code or code expired"
        )
    
    _auto_close_expired_session(db, session)
    if session.status != "open":
        return AttendanceCodeResponse(
            success=False,
            message="Session has ended"
        )

    # Check if code is expired
    if session.code_expires_at and session.code_expires_at < datetime.utcnow():
        session.status = "closed"
        db.commit()
        return AttendanceCodeResponse(
            success=False,
            message="Attendance code has expired"
        )

    if session.face_recognition_enabled and not session.attendance_code:
        return AttendanceCodeResponse(
            success=False,
            message="Professor has not generated code for this session yet"
        )
    
    # Check if student is enrolled in this class
    enrollment = db.query(StudentEnrollment).filter(
        StudentEnrollment.class_id == session.class_id,
        StudentEnrollment.student_id == current_user.user_id
    ).first()
    
    if not enrollment:
        return AttendanceCodeResponse(
            success=False,
            message="You are not enrolled in this class"
        )
    
    # Find or create attendance record
    record = db.query(AttendanceRecord).filter(
        AttendanceRecord.session_id == session.id,
        AttendanceRecord.student_id == current_user.user_id
    ).first()
    
    if not record:
        record = AttendanceRecord(
            session_id=session.id,
            student_id=current_user.user_id,
            face_detected=False,
            qr_verified=False,
            final_status="manual_review",
        )
        db.add(record)
        db.flush()
    
    # Update with code verification using centralized logic
    require_both = _requires_dual_verification(session) and True  # Code is part of dual verification
    updated_record = update_attendance_record(
        db,
        record,
        qr_verified=True,
        require_both=require_both,
    )
    
    # Determine success message based on final status
    if updated_record.final_status == "present":
        message = "Attendance marked as present (code verified)"
    elif updated_record.final_status == "pending_approval":
        message = "Code verified, awaiting face verification"
    else:
        message = "Code submission recorded"
    
    # Log audit
    try:
        log_audit(
            db,
            current_user.user_id,
            "submit_attendance_code",
            "attendance_record",
            updated_record.id,
            {"session_id": session.id, "code": request.code},
        )
    except Exception:
        pass
    
    return AttendanceCodeResponse(
        success=True,
        message=message,
        session_id=session.id,
        record_id=updated_record.id
    )


# ============================================================================
# QR CODE ATTENDANCE SYSTEM
# ============================================================================

@router.post("/session/generate-qr-code", response_model=QRCodeGenerateResponse)
async def generate_qr_code_for_attendance(
    class_id: int,
    face_recognition_enabled: bool = False,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generate a QR code for attendance marking.
    Professor creates this for a class session.
    QR code is valid for 3 minutes only.
    
    Args:
        class_id: Class ID for which to generate QR code
        face_recognition_enabled: Whether to require dual verification (face + QR)
        current_user: Current authenticated user (must be teacher)
        db: Database session
        
    Returns:
        QR code data and image (base64 encoded PNG)
        
    Raises:
        HTTPException: If class not found or user not authorized
    """
    from models import Class
    from datetime import timedelta
    import random
    import string
    import qrcode
    import io
    import base64
    
    # Verify class exists and user is the teacher
    class_obj = db.query(Class).filter(Class.id == class_id).first()
    if not class_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found",
        )
    
    if class_obj.teacher_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only create QR codes for your own classes",
        )
    
    # Auto-close expired sessions first so professors can start fresh after timeout.
    _close_expired_open_sessions_for_class(db, class_id)

    # Prevent multiple active sessions for same class.
    existing_open = db.query(AttendanceSession).filter(
        AttendanceSession.class_id == class_id,
        AttendanceSession.status == "open",
    ).first()
    if existing_open:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An active session already exists. Disconnect it before creating another.",
        )

    # Generate unique QR code data (session_id will be added after session creation)
    # Format: "ATTEND_{session_id}_{random_token}"
    random_token = ''.join(random.choices(string.ascii_uppercase + string.digits, k=12))

    # Session and QR both expire in 5 minutes from now
    current_time_utc = datetime.utcnow()
    session_expires_at = current_time_utc + timedelta(minutes=SESSION_DURATION_MINUTES)
    
    print(f"[QR BACKEND] Current UTC time: {current_time_utc}")
    print(f"[QR BACKEND] Session expires at UTC: {session_expires_at}")
    
    # Create attendance session
    session = AttendanceSession(
        class_id=class_id,
        date=datetime.utcnow(),
        qr_enabled=True,
        qr_code=f"TEMP_{random_token}",  # Temporary, will be updated
        qr_expires_at=session_expires_at,
        code_expires_at=session_expires_at,
        face_recognition_enabled=face_recognition_enabled,
        status="open",
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    
    # Update QR code with actual session ID
    qr_code_data = f"ATTEND_{session.id}_{random_token}"
    session.qr_code = qr_code_data
    db.commit()
    db.refresh(session)
    
    # Generate QR code image
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(qr_code_data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert image to base64
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    qr_code_image = base64.b64encode(buffer.getvalue()).decode('utf-8')
    
    print(f"[QR BACKEND] Generated QR code for session {session.id}")
    print(f"[QR BACKEND] QR code data: {qr_code_data}")
    print(f"[QR BACKEND] QR code image length: {len(qr_code_image)} chars")
    print(f"[QR BACKEND] Expires at: {session_expires_at}")
    
    # Create attendance records for all enrolled students
    enrollments = db.query(StudentEnrollment).filter(
        StudentEnrollment.class_id == class_id
    ).all()
    
    for enrollment in enrollments:
        record = AttendanceRecord(
            session_id=session.id,
            student_id=enrollment.student_id,
            face_detected=False,
            qr_verified=False,
            final_status="manual_review",
        )
        db.add(record)
    
    db.commit()
    
    # Log audit
    try:
        log_audit(
            db,
            current_user.user_id,
            "generate_qr_code",
            "attendance_session",
            session.id,
            {"class_id": class_id, "expires_at": session_expires_at.isoformat()},
        )
    except Exception:
        pass
    
    response = QRCodeGenerateResponse(
        success=True,
        message="QR code generated successfully. Valid for 5 minutes.",
        session_id=session.id,
        qr_code_data=qr_code_data,
        qr_code_image=qr_code_image,
        expires_at=session_expires_at
    )
    
    print(f"[QR BACKEND] Returning response with session_id={response.session_id}, image_length={len(response.qr_code_image)}")
    
    return response


@router.post("/submit-qr-code", response_model=QRCodeUploadResponse)
async def submit_qr_code(
    request: QRCodeSubmitRequest,
    current_user: TokenData = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    """
    Student submits QR code data (from scanning) to mark attendance.
    
    Args:
        request: Contains the QR code data
        current_user: Current authenticated student
        db: Database session
        
    Returns:
        Response indicating success or failure
        
    Raises:
        HTTPException: If QR code invalid, expired, or student not enrolled
    """
    # Find session with this QR code
    _close_all_expired_open_sessions(db)

    session = db.query(AttendanceSession).filter(
        AttendanceSession.qr_code == request.qr_code_data,
        AttendanceSession.status == "open"
    ).first()
    
    if not session:
        return QRCodeUploadResponse(
            success=False,
            message="Invalid or expired QR code"
        )
    
    _auto_close_expired_session(db, session)
    if session.status != "open":
        return QRCodeUploadResponse(
            success=False,
            message="Session has ended"
        )

    # Check if QR code is expired (5 minutes)
    if session.qr_expires_at and session.qr_expires_at < datetime.utcnow():
        session.status = "closed"
        db.commit()
        return QRCodeUploadResponse(
            success=False,
            message="QR code has expired (valid for 5 minutes only)"
        )
    
    # Check if student is enrolled in this class
    enrollment = db.query(StudentEnrollment).filter(
        StudentEnrollment.class_id == session.class_id,
        StudentEnrollment.student_id == current_user.user_id
    ).first()
    
    if not enrollment:
        return QRCodeUploadResponse(
            success=False,
            message="You are not enrolled in this class"
        )
    
    # Find or create attendance record
    record = db.query(AttendanceRecord).filter(
        AttendanceRecord.session_id == session.id,
        AttendanceRecord.student_id == current_user.user_id
    ).first()
    
    if not record:
        record = AttendanceRecord(
            session_id=session.id,
            student_id=current_user.user_id,
            face_detected=False,
            qr_verified=False,
            final_status="manual_review",
        )
        db.add(record)
        db.flush()
    
    # Update with QR verification using centralized logic
    require_both = _requires_dual_verification(session) and True  # QR is part of dual verification
    updated_record = update_attendance_record(
        db,
        record,
        qr_verified=True,
        require_both=require_both,
    )
    
    # Log audit
    try:
        log_audit(
            db,
            current_user.user_id,
            "submit_qr_code",
            "attendance_record",
            updated_record.id,
            {"session_id": session.id, "qr_code": request.qr_code_data},
        )
    except Exception:
        pass
    
    # Generate response message based on final status
    if updated_record.final_status == "present":
        message = "Attendance marked as present"
    elif updated_record.final_status == "pending_approval":
        message = "Attendance submitted for professor approval (partial verification)"
    else:
        message = "QR code verified but attendance not confirmed"

    return QRCodeUploadResponse(
        success=True,
        message=message,
        qr_code_data=request.qr_code_data,
        session_id=session.id,
        record_id=updated_record.id
    )


@router.post("/upload-qr-image", response_model=QRCodeUploadResponse)
async def upload_qr_code_image(
    image: UploadFile = File(...),
    current_user: TokenData = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    """
    Student uploads an image containing a QR code for attendance.
    System will decode the QR code from the image and mark attendance.
    
    Args:
        image: Image file containing QR code
        current_user: Current authenticated student
        db: Database session
        
    Returns:
        Response indicating success or failure
        
    Raises:
        HTTPException: If QR code cannot be decoded or is invalid
    """
    from pyzbar.pyzbar import decode
    from PIL import Image
    import io
    
    try:
        # Read and decode image
        contents = await image.read()
        img = Image.open(io.BytesIO(contents))
        
        # Decode QR codes from image
        decoded_objects = decode(img)
        
        if not decoded_objects:
            return QRCodeUploadResponse(
                success=False,
                message="No QR code found in the image. Please ensure the QR code is clearly visible."
            )
        
        # Get the first QR code data
        qr_code_data = decoded_objects[0].data.decode('utf-8')
        
        # Now process the QR code (same logic as submit_qr_code)
        _close_all_expired_open_sessions(db)

        session = db.query(AttendanceSession).filter(
            AttendanceSession.qr_code == qr_code_data,
            AttendanceSession.status == "open"
        ).first()
        
        if not session:
            return QRCodeUploadResponse(
                success=False,
                message="Invalid or expired QR code",
                qr_code_data=qr_code_data
            )
        
        _auto_close_expired_session(db, session)
        if session.status != "open":
            return QRCodeUploadResponse(
                success=False,
                message="Session has ended",
                qr_code_data=qr_code_data
            )

        # Check if QR code is expired (5 minutes)
        if session.qr_expires_at and session.qr_expires_at < datetime.utcnow():
            session.status = "closed"
            db.commit()
            return QRCodeUploadResponse(
                success=False,
                message="QR code has expired (valid for 5 minutes only)",
                qr_code_data=qr_code_data
            )
        
        # Check if student is enrolled in this class
        enrollment = db.query(StudentEnrollment).filter(
            StudentEnrollment.class_id == session.class_id,
            StudentEnrollment.student_id == current_user.user_id
        ).first()
        
        if not enrollment:
            return QRCodeUploadResponse(
                success=False,
                message="You are not enrolled in this class",
                qr_code_data=qr_code_data
            )
        
        # Find or create attendance record
        record = db.query(AttendanceRecord).filter(
            AttendanceRecord.session_id == session.id,
            AttendanceRecord.student_id == current_user.user_id
        ).first()
        
        if not record:
            record = AttendanceRecord(
                session_id=session.id,
                student_id=current_user.user_id,
                face_detected=False,
                qr_verified=False,
                final_status="manual_review",
            )
            db.add(record)
            db.flush()
        
        # Update with QR verification using centralized logic
        require_both = _requires_dual_verification(session) and True  # QR is part of dual verification
        updated_record = update_attendance_record(
            db,
            record,
            qr_verified=True,
            require_both=require_both,
        )
        
        # Log audit
        try:
            log_audit(
                db,
                current_user.user_id,
                "upload_qr_image",
                "attendance_record",
                updated_record.id,
                {"session_id": session.id, "qr_code": qr_code_data},
            )
        except Exception:
            pass
        
        # Generate response message based on final status
        if updated_record.final_status == "present":
            message = "QR code decoded successfully. Attendance marked as present."
        elif updated_record.final_status == "pending_approval":
            message = "QR code decoded successfully. Attendance submitted for professor approval (partial verification)."
        else:
            message = "QR code decoded but attendance not confirmed."

        return QRCodeUploadResponse(
            success=True,
            message=message,
            qr_code_data=qr_code_data,
            session_id=session.id,
            record_id=updated_record.id
        )
        
    except Exception as e:
        return QRCodeUploadResponse(
            success=False,
            message=f"Error processing image: {str(e)}"
        )


@router.get("/my-attendance", response_model=List[dict])
async def get_my_attendance(
    current_user: TokenData = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    """
    Get attendance records for the current student across all enrolled classes.
    
    Returns:
        List of attendance records with class details
    """
    from models import Class
    from sqlalchemy import func
    
    # Get all enrollments for this student
    enrollments = db.query(StudentEnrollment).filter(
        StudentEnrollment.student_id == current_user.user_id
    ).all()
    
    result = []
    for enrollment in enrollments:
        # Get class details
        class_obj = db.query(Class).filter(Class.id == enrollment.class_id).first()
        if not class_obj:
            continue
        
        # Get subject details from the related Subject record
        subject_name = class_obj.subject.name if class_obj.subject else "Unknown"
        subject_code = class_obj.subject.code if class_obj.subject else "N/A"
        
        # Get total sessions for this class
        total_sessions = db.query(func.count(AttendanceSession.id)).filter(
            AttendanceSession.class_id == enrollment.class_id
        ).scalar() or 0
        
        # Get attended sessions (where student is present)
        attended_sessions = db.query(func.count(AttendanceRecord.id)).filter(
            AttendanceRecord.student_id == current_user.user_id,
            AttendanceRecord.session_id.in_(
                db.query(AttendanceSession.id).filter(
                    AttendanceSession.class_id == enrollment.class_id
                )
            ),
            AttendanceRecord.final_status == "present"
        ).scalar() or 0
        
        # Calculate percentage
        percentage = (attended_sessions / total_sessions * 100) if total_sessions > 0 else 0
        
        # Get recent attendance records
        records = db.query(AttendanceRecord).join(
            AttendanceSession,
            AttendanceRecord.session_id == AttendanceSession.id
        ).filter(
            AttendanceSession.class_id == enrollment.class_id,
            AttendanceRecord.student_id == current_user.user_id
        ).order_by(AttendanceSession.date.desc()).limit(10).all()
        
        result.append({
            "class_id": class_obj.id,
            "subject_id": class_obj.subject_id,
            "subject_name": subject_name,
            "subject_code": subject_code,
            "year": class_obj.year,
            "section": class_obj.section,
            "total_sessions": total_sessions,
            "attended_sessions": attended_sessions,
            "attendance_percentage": round(percentage, 2),
            "recent_records": [
                {
                    "id": r.id,
                    "session_id": r.session_id,
                    "date": r.created_at.isoformat(),
                    "status": r.final_status,
                    "subject_name": subject_name,
                    "subject_code": subject_code,
                }
                for r in records
            ]
        })
    
    return result


@router.post("/session/{session_id}/disconnect", response_model=AttendanceSessionResponse)
async def disconnect_attendance_session(
    session_id: int,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Manually disconnect an active session before timeout.
    """
    session = db.query(AttendanceSession).filter(
        AttendanceSession.id == session_id
    ).first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    if session.class_.teacher_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only disconnect sessions for your own classes",
        )

    if session.status == "closed":
        return session

    session.status = "closed"
    db.commit()
    db.refresh(session)

    try:
        log_audit(
            db,
            current_user.user_id,
            "disconnect_attendance_session",
            "attendance_session",
            session.id,
            {"class_id": session.class_id},
        )
    except Exception:
        pass

    return session


@router.delete("/session/{session_id}")
async def delete_attendance_session(
    session_id: int,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Delete a session so professor can create a new one immediately.
    """
    session = db.query(AttendanceSession).filter(
        AttendanceSession.id == session_id
    ).first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    if session.class_.teacher_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete sessions for your own classes",
        )

    class_id = session.class_id
    db.delete(session)
    db.commit()

    try:
        log_audit(
            db,
            current_user.user_id,
            "delete_attendance_session",
            "attendance_session",
            session_id,
            {"class_id": class_id},
        )
    except Exception:
        pass

    return {
        "success": True,
        "message": "Session deleted successfully",
        "session_id": session_id,
    }

@router.get("/student/{student_id}/class/{class_id}")
async def get_student_attendance_in_class(
    student_id: int,
    class_id: int,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get attendance percentage for a specific student in a specific class."""
    from models import Class
    from sqlalchemy import func
    
    # Verify class exists and user is the teacher
    class_obj = db.query(Class).filter(Class.id == class_id).first()
    if not class_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found",
        )
    
    if class_obj.teacher_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access students from your own classes",
        )
    
    # Verify student is enrolled in this class
    enrollment = db.query(StudentEnrollment).filter(
        StudentEnrollment.student_id == student_id,
        StudentEnrollment.class_id == class_id
    ).first()
    
    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student is not enrolled in this class",
        )
    
    # Get total sessions for this class
    total_sessions = db.query(func.count(AttendanceSession.id)).filter(
        AttendanceSession.class_id == class_id
    ).scalar() or 0
    
    # Get attended sessions (where student is present)
    attended_sessions = db.query(func.count(AttendanceRecord.id)).filter(
        AttendanceRecord.student_id == student_id,
        AttendanceRecord.session_id.in_(
            db.query(AttendanceSession.id).filter(
                AttendanceSession.class_id == class_id
            )
        ),
        AttendanceRecord.final_status == "present"
    ).scalar() or 0
    
    # Calculate percentage
    percentage = (attended_sessions / total_sessions * 100) if total_sessions > 0 else 0
    
    return {
        "student_id": student_id,
        "class_id": class_id,
        "total_sessions": total_sessions,
        "attended_sessions": attended_sessions,
        "attendance_percentage": round(percentage, 2),
    }


# ============================================================================
# PROFESSOR: ATTENDANCE APPROVAL WORKFLOW
# ============================================================================

@router.get("/pending/code-submissions", response_model=List[PendingAttendanceResponse])
async def get_pending_attendance_approvals(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get all pending attendance submissions that require professor approval.
    
    Only returns pending records for classes taught by the current professor.
    
    Returns:
        List of pending attendance records with student and class details
    """
    from models import Class, Subject
    
    # Get all classes taught by this professor
    professor_classes = db.query(Class).filter(
        Class.teacher_id == current_user.user_id
    ).all()
    
    if not professor_classes:
        return []
    
    class_ids = [c.id for c in professor_classes]
    
    # Get all pending attendance records for these classes
    pending_records = db.query(AttendanceRecord).join(
        AttendanceSession, AttendanceRecord.session_id == AttendanceSession.id
    ).filter(
        AttendanceSession.class_id.in_(class_ids),
        AttendanceRecord.final_status == "pending_approval"
    ).all()
    
    # Build response with student and class details
    result = []
    for record in pending_records:
        session = record.session
        class_obj = session.class_
        student = record.student
        subject = db.query(Subject).filter(Subject.id == class_obj.subject_id).first()
        
        # Build class name from subject code, year, and section
        class_name = f"{subject.code if subject else 'Unknown'} - Year {class_obj.year} - Section {class_obj.section}"
        
        result.append(PendingAttendanceResponse(
            id=record.id,
            session_id=session.id,
            student_id=student.id,
            student_name=student.name,
            student_email=student.email,
            class_id=class_obj.id,
            class_name=class_name,
            subject_name=subject.name if subject else "Unknown",
            session_date=session.date,
            submitted_at=record.created_at,
            final_status=record.final_status,
        ))
    
    return result


@router.post("/approve-attendance")
async def approve_or_reject_attendance(
    request: AttendanceApprovalRequest,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Approve or reject a pending attendance record.
    
    Args:
        request: Contains record_id, action (approve/reject), and optional reason
        current_user: Current authenticated professor
        db: Database session
        
    Returns:
        Success message with updated attendance status
        
    Raises:
        HTTPException: If record not found or professor doesn't have permission
    """
    from models import Class
    
    # Get the attendance record
    record = db.query(AttendanceRecord).filter(
        AttendanceRecord.id == request.record_id
    ).first()
    
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attendance record not found"
        )
    
    # Check if record is in pending status
    if record.final_status != "pending_approval":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Attendance record is not pending (current status: {record.final_status})"
        )
    
    # Verify professor owns the class
    session = record.session
    class_obj = db.query(Class).filter(Class.id == session.class_id).first()
    
    if not class_obj or class_obj.teacher_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only approve attendance for your own classes"
        )
    
    # Update attendance status based on action
    if request.action == "approve":
        record.final_status = "present"
        message = "Attendance approved successfully"
    else:  # reject
        record.final_status = "absent"
        message = "Attendance rejected"
    
    record.overridden_by_teacher = True
    record.override_reason = request.reason or f"Professor {request.action}ed attendance submission"
    record.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(record)
    
    # Log audit
    try:
        log_audit(
            db,
            current_user.user_id,
            f"attendance_{request.action}",
            "attendance_record",
            record.id,
            {
                "student_id": record.student_id,
                "session_id": record.session_id,
                "action": request.action,
                "reason": request.reason,
            },
        )
    except Exception:
        pass
    
    return {
        "success": True,
        "message": message,
        "record_id": record.id,
        "final_status": record.final_status,
    }


@router.post("/code-submissions/{record_id}/approve")
async def approve_attendance_submission(
    record_id: int,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Approve a pending attendance submission (alternative endpoint for frontend compatibility).
    
    Args:
        record_id: ID of the attendance record to approve
        current_user: Current authenticated professor
        db: Database session
        
    Returns:
        Success message with updated attendance status
    """
    from models import Class
    
    # Get the attendance record
    record = db.query(AttendanceRecord).filter(
        AttendanceRecord.id == record_id
    ).first()
    
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attendance record not found"
        )
    
    # Check if record is in pending status
    if record.final_status != "pending_approval":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Attendance record is not pending (current status: {record.final_status})"
        )
    
    # Verify professor owns the class
    session = record.session
    class_obj = db.query(Class).filter(Class.id == session.class_id).first()
    
    if not class_obj or class_obj.teacher_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only approve attendance for your own classes"
        )
    
    # Approve the attendance
    record.final_status = "present"
    record.overridden_by_teacher = True
    record.override_reason = "Professor approved attendance submission"
    record.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(record)
    
    # Log audit
    try:
        log_audit(
            db,
            current_user.user_id,
            "attendance_approve",
            "attendance_record",
            record.id,
            {
                "student_id": record.student_id,
                "session_id": record.session_id,
                "action": "approve",
            },
        )
    except Exception:
        pass
    
    return {
        "success": True,
        "message": "Attendance approved successfully",
        "record_id": record.id,
        "final_status": record.final_status,
    }


@router.post("/code-submissions/{record_id}/reject")
async def reject_attendance_submission(
    record_id: int,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Reject a pending attendance submission (alternative endpoint for frontend compatibility).
    
    Args:
        record_id: ID of the attendance record to reject
        current_user: Current authenticated professor
        db: Database session
        
    Returns:
        Success message with updated attendance status
    """
    from models import Class
    
    # Get the attendance record
    record = db.query(AttendanceRecord).filter(
        AttendanceRecord.id == record_id
    ).first()
    
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attendance record not found"
        )
    
    # Check if record is in pending status
    if record.final_status != "pending_approval":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Attendance record is not pending (current status: {record.final_status})"
        )
    
    # Verify professor owns the class
    session = record.session
    class_obj = db.query(Class).filter(Class.id == session.class_id).first()
    
    if not class_obj or class_obj.teacher_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only reject attendance for your own classes"
        )
    
    # Reject the attendance
    record.final_status = "absent"
    record.overridden_by_teacher = True
    record.override_reason = "Professor rejected attendance submission"
    record.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(record)
    
    # Log audit
    try:
        log_audit(
            db,
            current_user.user_id,
            "attendance_reject",
            "attendance_record",
            record.id,
            {
                "student_id": record.student_id,
                "session_id": record.session_id,
                "action": "reject",
            },
        )
    except Exception:
        pass
    
    return {
        "success": True,
        "message": "Attendance rejected",
        "record_id": record.id,
        "final_status": record.final_status,
    }