# Backend Component Diagram
## Detailed Architecture of FastAPI Backend

```mermaid
graph TB
    subgraph Middleware
        CORS["CORS"] --> LOG["Request Logger"] --> JWT["JWT Validator"]
    end

    subgraph Routers["API Routers"]
        AuthR["/auth"]
        TeacherR["/teachers"]
        StudentR["/students"]
        AttendR["/attendance"]
        EnrollR["/enrollments"]
        TimetableR["/timetable"]
    end

    subgraph Services
        AuthSvc["AuthService\nregister, login, google OAuth"]
        AttendSvc["AttendanceService\nsessions, records, overrides, finalize"]
        FaceSvc["FaceRecognitionService\nrecognize → ML API"]
        AuditSvc["AuditService\nevent logging"]
    end

    subgraph Models["ORM Models (MySQL)"]
        User & Subject & Class & StudentEnrollment
        AttendanceSession & AttendanceRecord & AuditLog
        EnrollmentCode & ClassSchedule & Timetable & SubjectColor
    end

    Ext_ML["Face ML API\nPOST /recognize"]
    Ext_OAuth["Google OAuth\nToken Verification"]

    JWT --> Routers

    AuthR --> AuthSvc
    TeacherR & StudentR & AttendR --> AttendSvc
    AttendR --> FaceSvc
    TeacherR & StudentR & AttendR --> AuditSvc

    AuthSvc --> Ext_OAuth
    FaceSvc --> Ext_ML

    Services --> Models
```

## Request Flow Example

1. **Request arrives** → CORS Middleware → Logger → Request body
2. **Authentication** → JWT Validator → Role Guard → Dependency Injection
3. **Router handler** → Service layer (business logic)
4. **Service calls** → ORM Models → Database queries
5. **Response** → JSON → Client

## Service Responsibilities

| Service | Responsibility | Key Methods |
|---------|-----------------|------------|
| AuthService | User auth, JWT generation, Google OAuth | authenticate_local(), authenticate_google(), generate_jwt() |
| AttendanceLogic | Status computation, overrides, finalization | compute_attendance_status(), override_attendance(), finalize_session() |
| FaceRecognitionService | ML service integration | recognize_faces(), get_student_id_from_name() |
| AuditService | Event logging | log_audit() |
| StorageService | File upload/download | upload_image(), get_file() |

## Database Connections

- **Pool size:** 10 connections
- **Max overflow:** 20
- **Pool recycle:** 3600 seconds (prevents MySQL timeout)
- **Echo:** false (disable SQL logging in production)
