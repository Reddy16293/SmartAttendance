"""
Timetable routes for managing class schedules.
Professors can update timetables, students can view them.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import time
from typing import List

from db.session import get_db
from models.timetable import Timetable, SubjectColor
from models.class_ import Class
from models.subject import Subject
from models.user import User
from schemas.timetable import (
    TimetableCreate,
    TimetableUpdate,
    TimetableResponse,
    SubjectColorCreate,
    SubjectColorResponse,
    TimetableWithClassInfo,
)
from utils import get_current_user
from utils.color_manager import get_next_color, get_contrast_text_color
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/timetable", tags=["timetable"])


# ============================================================================
# TIMETABLE MANAGEMENT (PROFESSOR)
# ============================================================================

@router.post("/add", response_model=TimetableResponse)
async def add_timetable_entry(
    entry: TimetableCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Add a new timetable entry for a class.
    Only professors can add timetable entries.
    """
    # Verify the class exists and user is the teacher
    class_obj = db.query(Class).filter(Class.id == entry.class_id).first()
    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")
    
    if class_obj.teacher_id != current_user.user_id:
        raise HTTPException(
            status_code=403,
            detail="You can only add timetable for your own classes"
        )
    
    # Validate time
    if entry.start_time >= entry.end_time:
        raise HTTPException(
            status_code=400,
            detail="Start time must be before end time"
        )
    
    # Check for duplicate entry (same day and time)
    existing = db.query(Timetable).filter(
        Timetable.class_id == entry.class_id,
        Timetable.day_of_week == entry.day_of_week,
        Timetable.start_time == entry.start_time,
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Timetable entry already exists for this day and time"
        )
    
    timetable = Timetable(**entry.dict())
    db.add(timetable)
    db.commit()
    db.refresh(timetable)
    
    logger.info(f"✅ Timetable entry added for class {entry.class_id}")
    return timetable


@router.put("/{timetable_id}", response_model=TimetableResponse)
async def update_timetable_entry(
    timetable_id: int,
    update: TimetableUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update timetable entry.
    Only the professor who teaches the class can update.
    """
    timetable = db.query(Timetable).filter(Timetable.id == timetable_id).first()
    if not timetable:
        raise HTTPException(status_code=404, detail="Timetable entry not found")
    
    class_obj = db.query(Class).filter(Class.id == timetable.class_id).first()
    if class_obj.teacher_id != current_user.user_id:
        raise HTTPException(
            status_code=403,
            detail="You can only update timetable for your own classes"
        )
    
    # Validate time if both provided
    start_time = update.start_time or timetable.start_time
    end_time = update.end_time or timetable.end_time
    
    if start_time >= end_time:
        raise HTTPException(
            status_code=400,
            detail="Start time must be before end time"
        )
    
    # Update fields
    for key, value in update.dict(exclude_unset=True).items():
        setattr(timetable, key, value)
    
    db.commit()
    db.refresh(timetable)
    
    logger.info(f"✅ Timetable entry {timetable_id} updated")
    return timetable


@router.delete("/{timetable_id}")
async def delete_timetable_entry(
    timetable_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete timetable entry.
    """
    timetable = db.query(Timetable).filter(Timetable.id == timetable_id).first()
    if not timetable:
        raise HTTPException(status_code=404, detail="Timetable entry not found")
    
    class_obj = db.query(Class).filter(Class.id == timetable.class_id).first()
    if class_obj.teacher_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    db.delete(timetable)
    db.commit()
    
    logger.info(f"✅ Timetable entry {timetable_id} deleted")
    return {"message": "Timetable entry deleted successfully"}


# ============================================================================
# SUBJECT COLORS
# ============================================================================

@router.post("/colors/assign", response_model=SubjectColorResponse)
async def assign_subject_color(
    color: SubjectColorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Assign a color to a subject.
    Admin only operation.
    """
    # Check if subject exists
    subject = db.query(Subject).filter(Subject.id == color.subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    # Check if color already exists for this subject
    existing_color = db.query(SubjectColor).filter(
        SubjectColor.subject_id == color.subject_id
    ).first()
    
    if existing_color:
        raise HTTPException(
            status_code=400,
            detail="Color already assigned to this subject"
        )
    
    # Auto-determine text color based on background
    text_color = get_contrast_text_color(color.color_code)
    
    subject_color = SubjectColor(
        subject_id=color.subject_id,
        color_code=color.color_code,
        text_color=text_color,
    )
    
    db.add(subject_color)
    db.commit()
    db.refresh(subject_color)
    
    logger.info(f"✅ Color assigned to subject {color.subject_id}: {color.color_code}")
    return subject_color


@router.get("/colors/{subject_id}", response_model=SubjectColorResponse)
async def get_subject_color(
    subject_id: int,
    db: Session = Depends(get_db),
):
    """
    Get color assigned to a subject.
    """
    color = db.query(SubjectColor).filter(
        SubjectColor.subject_id == subject_id
    ).first()
    
    if not color:
        raise HTTPException(status_code=404, detail="Color not assigned for this subject")
    
    return color


# ============================================================================
# TIMETABLE VIEWING (STUDENTS/PROFESSORS)
# ============================================================================

@router.get("/class/{class_id}", response_model=List[TimetableWithClassInfo])
async def get_class_timetable(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get full timetable for a class.
    """
    class_obj = db.query(Class).filter(Class.id == class_id).first()
    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")
    
    # Get all timetable entries for this class, ordered by day and time
    timetables = db.query(Timetable).filter(
        Timetable.class_id == class_id
    ).order_by(Timetable.day_of_week, Timetable.start_time).all()
    
    # Enrich with subject and color info
    result = []
    for tt in timetables:
        color_obj = db.query(SubjectColor).filter(
            SubjectColor.subject_id == class_obj.subject_id
        ).first()
        
        result.append(TimetableWithClassInfo(
            id=tt.id,
            class_id=tt.class_id,
            day_of_week=tt.day_of_week,
            start_time=tt.start_time,
            end_time=tt.end_time,
            room_number=tt.room_number,
            subject_name=class_obj.subject.name,
            subject_code=class_obj.subject.code,
            subject_color=color_obj.color_code if color_obj else "#4ECDC4",
            text_color=color_obj.text_color if color_obj else "#FFFFFF",
            teacher_name=class_obj.teacher.name,
            year=class_obj.year,
            section=class_obj.section,
        ))
    
    return result


@router.get("/student/my-timetable", response_model=List[TimetableWithClassInfo])
async def get_student_timetable(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get timetable for all classes the student is enrolled in.
    """
    from models.student_enrollment import StudentEnrollment
    
    # Get all enrollments for this student
    enrollments = db.query(StudentEnrollment).filter(
        StudentEnrollment.student_id == current_user.user_id
    ).all()
    
    if not enrollments:
        return []
    
    class_ids = [e.class_id for e in enrollments]
    
    # Get all timetable entries for these classes
    timetables = db.query(Timetable).filter(
        Timetable.class_id.in_(class_ids)
    ).order_by(Timetable.day_of_week, Timetable.start_time).all()
    
    # Enrich with class and color info
    result = []
    for tt in timetables:
        class_obj = db.query(Class).filter(Class.id == tt.class_id).first()
        color_obj = db.query(SubjectColor).filter(
            SubjectColor.subject_id == class_obj.subject_id
        ).first()
        
        result.append(TimetableWithClassInfo(
            id=tt.id,
            class_id=tt.class_id,
            day_of_week=tt.day_of_week,
            start_time=tt.start_time,
            end_time=tt.end_time,
            room_number=tt.room_number,
            subject_name=class_obj.subject.name,
            subject_code=class_obj.subject.code,
            subject_color=color_obj.color_code if color_obj else "#4ECDC4",
            text_color=color_obj.text_color if color_obj else "#FFFFFF",
            teacher_name=class_obj.teacher.name,
            year=class_obj.year,
            section=class_obj.section,
        ))
    
    return result
