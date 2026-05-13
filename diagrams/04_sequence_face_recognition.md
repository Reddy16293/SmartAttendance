# Sequence Diagram: Face Recognition Mode
## Detailed Flow with Exact API Endpoints & Database Operations

```mermaid
sequenceDiagram
    participant Professor
    participant Client
    participant AttendanceSystem
    participant MLService
    participant Database
    participant AuditService

    Professor->>Client: Start session / Upload classroom image
    Client->>AttendanceSystem: POST /attendance/session/{id}/upload-image (image + JWT)
    AttendanceSystem->>Database: Verify session & permissions
    AttendanceSystem->>MLService: POST /recognize (image)
    MLService-->>AttendanceSystem: recognized faces (name, confidence)
    AttendanceSystem->>Database: Upsert attendance records (face_detected, confidence)
    AttendanceSystem->>AuditService: log image_upload
    AttendanceSystem-->>Client: Response (recognized_students, annotated_image)
    Professor->>Client: Review results & finalize session
    Client->>AttendanceSystem: POST /teachers/attendance/session/{id}/finalize
    AttendanceSystem->>Database: Close session, compute stats
    AttendanceSystem->>AuditService: log session_finalized
    AttendanceSystem-->>Client: Finalized response (stats)
```

## High-Level Notes

- The teacher starts a session, uploads a classroom image, and reviews the recognition results.
- The backend sends the image to the external face recognition service and stores the returned attendance decisions.
- The session is finalized after review and the final statistics are saved.
