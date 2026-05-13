# Entity-Relationship Diagram (ERD)
## Complete Database Schema with Relationships

```mermaid
erDiagram
    USER ||--o{ CLASS_ENTITY : teaches
    USER ||--o{ STUDENT_ENROLLMENT : "enrolled as"
    USER ||--o{ AUDIT_LOG : generates
    USER ||--o{ ENROLLMENT_CODE : creates
    
    SUBJECT ||--o{ CLASS_ENTITY : "offered as"
    SUBJECT ||--o{ SUBJECT_COLOR : "assigned to"
    
    CLASS_ENTITY ||--o{ STUDENT_ENROLLMENT : has
    CLASS_ENTITY ||--o{ ATTENDANCE_SESSION : contains
    CLASS_ENTITY ||--o{ CLASS_SCHEDULE : "scheduled"
    CLASS_ENTITY ||--o{ TIMETABLE : "has entries"
    CLASS_ENTITY ||--o{ ENROLLMENT_CODE : "enrolls via"
    
    STUDENT_ENROLLMENT ||--o{ ATTENDANCE_RECORD : "tracks"
    
    ATTENDANCE_SESSION ||--o{ ATTENDANCE_RECORD : "creates"
    
    
    
    USER {
        int id PK
        string email UK
        string name
        string roll_number UK
        string password_hash "nullable for OAuth"
        enum role "student|teacher"
        enum provider "LOCAL|GOOGLE"
        string google_id UK
        datetime created_at
        datetime updated_at
    }
    
    SUBJECT {
        int id PK
        string code UK
        string name
    }
    
    CLASS_ENTITY {
        int id PK
        int subject_id FK
        int teacher_id FK
        int year "1-4"
        string section "A,B,Morning,Evening"
        datetime created_at
        datetime updated_at
    }
    
    STUDENT_ENROLLMENT {
        int id PK
        int student_id FK
        int class_id FK
        datetime enrolled_at
    }
    
    ATTENDANCE_SESSION {
        int id PK
        int class_id FK
        datetime date
        boolean qr_enabled
        string qr_code UK
        datetime qr_expires_at "3 minutes"
        string attendance_code "6 digits"
        datetime code_expires_at "10 minutes"
        boolean face_recognition_enabled
        string original_image "nullable"
        string annotated_image "nullable"
        enum status "open|closed"
        datetime created_at
        datetime updated_at
    }
    
    ATTENDANCE_RECORD {
        int id PK
        int session_id FK
        int student_id FK
        boolean face_detected
        boolean qr_verified
        float confidence "face score"
        string final_status "present|absent|manual_review|pending_approval"
        boolean overridden_by_teacher
        string override_reason "nullable"
        datetime created_at
        datetime updated_at
    }
    
    ENROLLMENT_CODE {
        int id PK
        int class_id FK
        string code UK "6 chars"
        int created_by FK
        boolean is_active
        datetime created_at
        datetime updated_at
    }
    
    AUDIT_LOG {
        int id PK
        string event_id UK "UUID"
        string event_type "login_jwt|login_google|qr_verification|code_submission|image_upload|attendance.override|session_finalized"
        string entity_type "user|attendance_session|attendance_record|class"
        int entity_id "nullable"
        int user_id FK
        json event_metadata "custom fields"
        datetime timestamp
    }
    
    CLASS_SCHEDULE {
        int id PK
        int class_id FK
        int day_of_week "0-6 Mon-Sun"
        time start_time "HH:MM"
        time end_time "HH:MM"
        string room_number "nullable"
        datetime created_at
        datetime updated_at
    }
    
    TIMETABLE {
        int id PK
        int class_id FK
        int day_of_week "0-6 Mon-Sun"
        time start_time "HH:MM"
        time end_time "HH:MM"
        string room_number "nullable"
        datetime created_at
        datetime updated_at
    }
    
    SUBJECT_COLOR {
        int id PK
        int subject_id FK
        string color_code "#RRGGBB"
        string text_color "#RRGGBB"
        datetime created_at
    }
```

## Attendance Decision Logic (in ATTENDANCE_RECORD.final_status)

```
if face_detected AND qr_verified:
    final_status = "present"
elif face_detected OR qr_verified:
    final_status = "manual_review" (or "pending_approval")
else:
    final_status = "absent"
    
If overridden_by_teacher = true:
    final_status = teacher's chosen value (highest priority)
```

## Key Relationships Summary

| Table | Related Table | Type | Foreign Key | Cascade |
|-------|---------------|------|-------------|---------|
| CLASS | USER | N:1 | teacher_id | NO |
| CLASS | SUBJECT | N:1 | subject_id | NO |
| STUDENT_ENROLLMENT | USER | N:1 | student_id | YES |
| STUDENT_ENROLLMENT | CLASS | N:1 | class_id | YES |
| ATTENDANCE_SESSION | CLASS | N:1 | class_id | YES |
| ATTENDANCE_RECORD | ATTENDANCE_SESSION | N:1 | session_id | YES |
| ATTENDANCE_RECORD | USER | N:1 | student_id | NO |
| AUDIT_LOG | USER | N:1 | user_id | NO |
| ENROLLMENT_CODE | CLASS | N:1 | class_id | YES |
| ENROLLMENT_CODE | USER | N:1 | created_by | NO |
| CLASS_SCHEDULE | CLASS | N:1 | class_id | YES |
| TIMETABLE | CLASS | N:1 | class_id | YES |
| SUBJECT_COLOR | SUBJECT | 1:1 | subject_id | YES |

## Indexes for Performance

- USER.email (unique)
- USER.roll_number (unique)
- USER.google_id (unique)
- SUBJECT.code (unique)
- ATTENDANCE_SESSION.qr_code (unique)
- ENROLLMENT_CODE.code (unique)
- CLASS.subject_id, teacher_id, year, section (composite)
- STUDENT_ENROLLMENT.student_id, class_id (composite unique)
- ATTENDANCE_RECORD.session_id, student_id (composite unique)
- ATTENDANCE_SESSION.class_id, date
- AUDIT_LOG.event_type, user_id, entity_type
