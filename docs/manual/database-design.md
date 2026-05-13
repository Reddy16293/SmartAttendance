# Database Design

## Database Design

### Database Schema

The application uses a relational schema designed around academic administration and attendance tracking.

| Table | Purpose | Important Fields |
|---|---|---|
| `users` | Stores students and teachers in one table. | `id`, `name`, `email`, `roll_number`, `password_hash`, `role`, `provider`, `google_id`, `created_at`, `updated_at` |
| `subjects` | Stores courses or subject definitions. | `id`, `name`, `code` |
| `classes` | Stores subject sections taught by a teacher. | `id`, `subject_id`, `teacher_id`, `year`, `section` |
| `student_enrollments` | Join table linking students to classes. | `id`, `student_id`, `class_id`, `enrolled_at` |
| `attendance_sessions` | Represents one attendance event for a class. | `id`, `class_id`, `date`, `qr_enabled`, `qr_code`, `attendance_code`, `qr_expires_at`, `code_expires_at`, `face_recognition_enabled`, `status` |
| `attendance_records` | Stores raw attendance signals and final decision. | `id`, `session_id`, `student_id`, `face_detected`, `qr_verified`, `confidence`, `final_status`, `overridden_by_teacher`, `override_reason` |
| `enrollment_codes` | Stores codes used by students to join a class. | `id`, `class_id`, `code`, `created_by`, `is_active` |
| `class_schedules` | Stores weekly timetable-style schedules for a class. | `id`, `class_id`, `day_of_week`, `start_time`, `end_time`, `room_number` |
| `timetables` | Stores timetable entries used by student and professor views. | `id`, `class_id`, `day_of_week`, `start_time`, `end_time`, `room_number` |
| `subject_colors` | Assigns consistent visual colors to subjects. | `id`, `subject_id`, `color_code`, `text_color` |
| `audit_logs` | Captures important system actions for traceability. | `id`, `event_id`, `event_type`, `entity_type`, `entity_id`, `user_id`, `event_metadata`, `timestamp` |

### Relationships

- Teacher to class: 1 to many.
- Subject to class: 1 to many.
- Student to class: many to many through `student_enrollments`.
- Class to attendance session: 1 to many.
- Attendance session to attendance record: 1 to many.
- Class to schedule: 1 to many.
- Class to timetable entry: 1 to many.
- Subject to color mapping: 1 to 1.
- User to enrollment code: 1 to many.
- User to audit log entry: 1 to many.

## Entity-Relationship Diagram (ERD)

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
