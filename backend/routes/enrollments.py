"""
Enrollment routes for College Attendance System.
Handles enrollment codes and class schedules.
"""

from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from datetime import datetime, time

from db.session import get_db
from models import EnrollmentCode, ClassSchedule, StudentEnrollment, Class, User
from schemas import (
    EnrollmentCodeCreate,
    EnrollmentCodeResponse,
    EnrollByCodeRequest,
    ClassScheduleCreate,
    ClassScheduleResponse,
    EnrolledClassResponse,
)
from utils import get_current_user, TokenData, get_user_by_id

router = APIRouter(prefix="/enrollments", tags=["Enrollments"])


# -------------------- Helpers --------------------
def _serialize_schedule(schedule: ClassSchedule) -> dict:
    """Serialize a ClassSchedule ORM object to API response with HH:MM strings."""
    return {
        "id": schedule.id,
        "class_id": schedule.class_id,
        "day_of_week": schedule.day_of_week,
        "start_time": schedule.start_time.strftime("%H:%M") if isinstance(schedule.start_time, time) else str(schedule.start_time),
        "end_time": schedule.end_time.strftime("%H:%M") if isinstance(schedule.end_time, time) else str(schedule.end_time),
        "room_number": schedule.room_number,
        "created_at": schedule.created_at,
        "updated_at": schedule.updated_at,
    }


# ==================== TEACHER ENDPOINTS ====================

@router.post("/codes", response_model=EnrollmentCodeResponse, status_code=status.HTTP_201_CREATED)
async def create_enrollment_code(
    request: EnrollmentCodeCreate,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create an enrollment code for a class (Teacher only).
    
    Args:
        request: Class ID and optional custom code
        current_user: Current authenticated teacher
        db: Database session
        
    Returns:
        Created enrollment code
        
    Raises:
        HTTPException: If user is not a teacher, class not found, or user doesn't teach this class
    """
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can create enrollment codes"
        )
    
    # Check if class exists and user is the teacher
    class_obj = db.query(Class).filter(Class.id == request.class_id).first()
    if not class_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )
    
    if class_obj.teacher_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only create codes for classes you teach"
        )
    
    # Generate or use provided code
    code = request.code if request.code else EnrollmentCode.generate_code()
    
    # Check if code already exists
    existing = db.query(EnrollmentCode).filter(EnrollmentCode.code == code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This enrollment code already exists. Please try again."
        )
    
    # Create enrollment code
    enrollment_code = EnrollmentCode(
        class_id=request.class_id,
        code=code,
        created_by=current_user.user_id,
        is_active=True
    )
    db.add(enrollment_code)
    db.commit()
    db.refresh(enrollment_code)
    
    return enrollment_code


@router.get("/codes/class/{class_id}", response_model=list[EnrollmentCodeResponse])
async def get_class_enrollment_codes(
    class_id: int,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get all enrollment codes for a class (Teacher only).
    
    Args:
        class_id: ID of the class
        current_user: Current authenticated teacher
        db: Database session
        
    Returns:
        List of enrollment codes
        
    Raises:
        HTTPException: If user is not a teacher or doesn't teach this class
    """
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can view enrollment codes"
        )
    
    # Verify teacher owns this class
    class_obj = db.query(Class).filter(Class.id == class_id).first()
    if not class_obj or class_obj.teacher_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view codes for classes you teach"
        )
    
    codes = db.query(EnrollmentCode).filter(EnrollmentCode.class_id == class_id).all()
    return codes


@router.post("/codes/batch")
async def get_enrollment_codes_batch(
    request: dict,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get enrollment codes for multiple classes in ONE batch call.
    
    Args:
        request: {"class_ids": [1, 2, 3, ...]}
        current_user: Current authenticated teacher
        db: Database session
        
    Returns:
        Dictionary mapping class_id to list of enrollment codes
    """
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can view enrollment codes"
        )
    
    class_ids: list[int] = request.get("class_ids", [])
    if not class_ids:
        return {}
    
    # Verify teacher owns all these classes
    classes = db.query(Class).filter(Class.id.in_(class_ids)).all()
    for cls in classes:
        if cls.teacher_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view codes for classes you teach"
            )
    
    # Fetch all codes for these classes in one query
    codes = db.query(EnrollmentCode).filter(EnrollmentCode.class_id.in_(class_ids)).all()
    
    # Group codes by class_id
    result = {class_id: [] for class_id in class_ids}
    for code in codes:
        result[code.class_id].append(code)
    
    return result


@router.delete("/codes/{code_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_enrollment_code(
    code_id: int,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Deactivate an enrollment code (Teacher only).
    
    Args:
        code_id: ID of the enrollment code
        current_user: Current authenticated teacher
        db: Database session
        
    Raises:
        HTTPException: If code not found or user is not the creator
    """
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can deactivate enrollment codes"
        )
    
    code = db.query(EnrollmentCode).filter(EnrollmentCode.id == code_id).first()
    if not code:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Enrollment code not found"
        )
    
    # Verify teacher created this code
    class_obj = db.query(Class).filter(Class.id == code.class_id).first()
    if not class_obj or class_obj.teacher_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only deactivate codes for your classes"
        )
    
    code.is_active = False
    db.commit()


# ==================== CLASS SCHEDULE ENDPOINTS ====================

@router.post("/schedules", response_model=ClassScheduleResponse, status_code=status.HTTP_201_CREATED)
async def create_class_schedule(
    class_id: int,
    request: ClassScheduleCreate,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a schedule/timing for a class (Teacher only).
    
    Args:
        class_id: ID of the class
        request: Schedule details (day, start time, end time, room)
        current_user: Current authenticated teacher
        db: Database session
        
    Returns:
        Created class schedule
        
    Raises:
        HTTPException: If user is not a teacher or doesn't teach this class
    """
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can create schedules"
        )
    
    # Verify teacher owns this class
    class_obj = db.query(Class).filter(Class.id == class_id).first()
    if not class_obj or class_obj.teacher_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only create schedules for classes you teach"
        )
    
    # Parse time strings
    try:
        start_time = datetime.strptime(request.start_time, "%H:%M").time()
        end_time = datetime.strptime(request.end_time, "%H:%M").time()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid time format. Use HH:MM (24-hour format)"
        )
    
    if start_time >= end_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Start time must be before end time"
        )
    
    schedule = ClassSchedule(
        class_id=class_id,
        day_of_week=request.day_of_week,
        start_time=start_time,
        end_time=end_time,
        room_number=request.room_number
    )
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    
    # Ensure time fields are strings per schema
    return _serialize_schedule(schedule)


@router.get("/schedules/class/{class_id}", response_model=list[ClassScheduleResponse])
async def get_class_schedules(
    class_id: int,
    db: Session = Depends(get_db),
):
    """
    Get all schedules for a class (Public).
    
    Args:
        class_id: ID of the class
        db: Database session
        
    Returns:
        List of class schedules
    """
    class_obj = db.query(Class).filter(Class.id == class_id).first()
    if not class_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )
    
    schedules = db.query(ClassSchedule).filter(ClassSchedule.class_id == class_id).all()
    return [_serialize_schedule(s) for s in schedules]


@router.post("/schedules/batch")
async def get_class_schedules_batch(
    request: dict,  # {"class_ids": [1, 2, 3]}
    db: Session = Depends(get_db),
):
    """
    Get schedules for multiple classes in ONE batch call.
    Replaces N separate /schedules/class/{id} calls.
    
    Args:
        request: {"class_ids": [list of class IDs]}
        db: Database session
        
    Returns:
        Dict mapping class_id to list of schedules
    """
    class_ids = request.get("class_ids", [])
    if not class_ids:
        return {}
    
    # Fetch ALL schedules for ALL these classes in ONE query
    schedules = db.query(ClassSchedule).filter(
        ClassSchedule.class_id.in_(class_ids)
    ).all()
    
    # Organize by class_id
    result = {}
    for class_id in class_ids:
        result[class_id] = []
    
    for schedule in schedules:
        if schedule.class_id in result:
            result[schedule.class_id].append(_serialize_schedule(schedule))
    
    return result


@router.put("/schedules/{schedule_id}", response_model=ClassScheduleResponse)
async def update_class_schedule(
    schedule_id: int,
    request: ClassScheduleCreate,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update a class schedule (Teacher only).
    
    Args:
        schedule_id: ID of the schedule
        request: Updated schedule details
        current_user: Current authenticated teacher
        db: Database session
        
    Returns:
        Updated class schedule
        
    Raises:
        HTTPException: If schedule not found or user doesn't teach this class
    """
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can update schedules"
        )
    
    schedule = db.query(ClassSchedule).filter(ClassSchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule not found"
        )
    
    # Verify teacher owns this class
    class_obj = db.query(Class).filter(Class.id == schedule.class_id).first()
    if class_obj.teacher_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update schedules for classes you teach"
        )
    
    # Parse time strings
    try:
        start_time = datetime.strptime(request.start_time, "%H:%M").time()
        end_time = datetime.strptime(request.end_time, "%H:%M").time()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid time format. Use HH:MM (24-hour format)"
        )
    
    if start_time >= end_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Start time must be before end time"
        )
    
    schedule.day_of_week = request.day_of_week
    schedule.start_time = start_time
    schedule.end_time = end_time
    schedule.room_number = request.room_number
    db.commit()
    db.refresh(schedule)
    
    return _serialize_schedule(schedule)


@router.delete("/schedules/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_class_schedule(
    schedule_id: int,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Delete a class schedule (Teacher only).
    
    Args:
        schedule_id: ID of the schedule
        current_user: Current authenticated teacher
        db: Database session
        
    Raises:
        HTTPException: If schedule not found or user doesn't teach this class
    """
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can delete schedules"
        )
    
    schedule = db.query(ClassSchedule).filter(ClassSchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule not found"
        )
    
    # Verify teacher owns this class
    class_obj = db.query(Class).filter(Class.id == schedule.class_id).first()
    if class_obj.teacher_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete schedules for classes you teach"
        )
    
    db.delete(schedule)
    db.commit()


# ==================== STUDENT ENDPOINTS ====================

@router.post("/enroll", status_code=status.HTTP_201_CREATED)
async def enroll_by_code(
    request: EnrollByCodeRequest,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Student enrolls in a class using an enrollment code.
    
    Args:
        request: Enrollment code
        current_user: Current authenticated student
        db: Database session
        
    Returns:
        Success message with class details
        
    Raises:
        HTTPException: If code invalid, student already enrolled, or user is not a student
    """
    if current_user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can use enrollment codes"
        )
    
    # Find enrollment code
    enrollment_code = db.query(EnrollmentCode).filter(
        EnrollmentCode.code == request.code.upper()
    ).first()
    
    if not enrollment_code:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid enrollment code"
        )
    
    if not enrollment_code.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This enrollment code is no longer active"
        )
    
    # Check if student already enrolled
    existing = db.query(StudentEnrollment).filter(
        StudentEnrollment.student_id == current_user.user_id,
        StudentEnrollment.class_id == enrollment_code.class_id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already enrolled in this class"
        )
    
    # Create enrollment
    enrollment = StudentEnrollment(
        student_id=current_user.user_id,
        class_id=enrollment_code.class_id
    )
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    
    return {"message": "Successfully enrolled in the class", "class_id": enrollment_code.class_id}


@router.get("/my-classes", response_model=list[EnrolledClassResponse])
async def get_my_enrolled_classes(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get all classes student is enrolled in with their schedules.
    
    Args:
        current_user: Current authenticated student
        db: Database session
        
    Returns:
        List of enrolled classes with schedules and details
    """
    if current_user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can view enrolled classes"
        )
    
    enrollments = db.query(StudentEnrollment).filter(
        StudentEnrollment.student_id == current_user.user_id
    ).all()
    
    enrolled_classes = []
    for enrollment in enrollments:
        class_obj = enrollment.class_
        subject = class_obj.subject
        teacher = class_obj.teacher
        schedules = db.query(ClassSchedule).filter(ClassSchedule.class_id == class_obj.id).all()
        schedules_data = [_serialize_schedule(s) for s in schedules]
        
        enrolled_classes.append(EnrolledClassResponse(
            id=class_obj.id,
            subject_id=class_obj.subject_id,
            teacher_id=class_obj.teacher_id,
            year=class_obj.year,
            section=class_obj.section,
            subject_name=subject.name if subject else None,
            subject_code=subject.code if subject else None,
            teacher_name=teacher.name if teacher else None,
            schedules=schedules_data,
            enrolled_at=enrollment.enrolled_at
        ))
    
    return enrolled_classes
