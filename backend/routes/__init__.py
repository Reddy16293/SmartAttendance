"""
API routes for College Attendance System.
"""

from routes.auth import router as auth_router
from routes.teacher import router as teacher_router
from routes.student import router as student_router
from routes.attendance import router as attendance_router
from routes.enrollments import router as enrollments_router
from routes.timetable import router as timetable_router

__all__ = [
    "auth_router",
    "teacher_router",
    "student_router",
    "attendance_router",
    "enrollments_router",
]
