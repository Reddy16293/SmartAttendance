"""
Utilities for College Attendance System.
"""

from utils.jwt_auth import (
    hash_password,
    verify_password,
    create_access_token,
    verify_token,
    get_current_user,
    get_current_teacher,
    get_current_student,
    TokenData,
)
from utils.helpers import (
    get_user_by_email,
    get_user_by_roll_number,
    get_user_by_id,
    get_user_by_google_id,
    is_student_enrolled,
    get_student_classes,
    get_class_students,
    get_teacher_classes,
)

__all__ = [
    # JWT
    "hash_password",
    "verify_password",
    "create_access_token",
    "verify_token",
    "get_current_user",
    "get_current_teacher",
    "get_current_student",
    "TokenData",
    # Helpers
    "get_user_by_email",
    "get_user_by_roll_number",
    "get_user_by_id",
    "get_user_by_google_id",
    "is_student_enrolled",
    "get_student_classes",
    "get_class_students",
    "get_teacher_classes",
]
