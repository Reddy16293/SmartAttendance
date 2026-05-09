flowchart LR
    U1[Student User]
    U2[Professor User]

    subgraph FE["Frontend - React + TypeScript"]
      UI1[Student Dashboard]
      UI2[Professor Dashboard]
      UI3[Dynamic Weekly Timetable]
      UI4["Attendance Flows: Code / QR / Face"]
      UI5["Auth UI: Login + Google Sign-In"]
    end

    subgraph BE["Backend - FastAPI"]
      API1[/auth/]
      API2[/teachers/]
      API3[/students/]
      API4[/attendance/]
      API5[/enrollments/]
      API6[/timetable/]
      S1["Business Services\nAuth / Attendance Logic / Face Service / Audit"]
    end

    subgraph DB["MySQL + SQLAlchemy"]
      T1[(users)]
      T2[(subjects)]
      T3[(classes)]
      T4[(class_schedules)]
      T5[(timetables)]
      T6[(student_enrollments)]
      T7[(attendance_sessions)]
      T8[(attendance_records)]
      T9[(enrollment_codes)]
      T10[(audit_logs)]
      T11[(subject_colors)]
    end

    EXT1[Google OAuth]
    EXT2[Face Recognition Engine]

    U1 --> FE
    U2 --> FE
    FE -->|JWT API Calls| BE
    BE --> DB
    BE --> EXT1
    BE --> EXT2

    API1 --> S1
    API2 --> S1
    API3 --> S1
    API4 --> S1
    API5 --> S1
    API6 --> S1

----------------------------------------------------------------

flowchart TB
    C[Client Apps\nReact Frontend] --> M[FastAPI App\nmain.py]

    M --> MW[CORS Middleware]
    M --> R0[Router Registry]

    R0 --> R1[Auth Router\n/auth]
    R0 --> R2[Teacher Router\n/teachers]
    R0 --> R3[Student Router\n/students]
    R0 --> R4[Attendance Router\n/attendance]
    R0 --> R5[Enrollments Router\n/enrollments]
    R0 --> R6[Timetable Router\n/timetable]

    subgraph AUTHZ[Security & Access Control]
      A1[JWT Validation]
      A2[Role Guards\nstudent / teacher]
      A3[Current User Dependencies]
    end

    R1 --> A1
    R2 --> A1
    R3 --> A1
    R4 --> A1
    R5 --> A1
    R6 --> A1
    A1 --> A2 --> A3

    subgraph SERVICES[Service Layer]
      S1[AuthService]
      S2[Attendance Logic\nstatus compute / update]
      S3[FaceRecognitionService]
      S4[Audit Service]
      S5[Color Manager]
    end

    R1 --> S1
    R4 --> S2
    R4 --> S3
    R2 --> S4
    R4 --> S4
    R6 --> S5

    subgraph DAL[Data Layer]
      D1[SQLAlchemy Session]
      D2[ORM Models]
      D3[(MySQL Database)]
    end

    S1 --> D1
    S2 --> D1
    S3 --> D1
    S4 --> D1
    S5 --> D1
    D1 --> D2 --> D3

    subgraph EXT[External Integrations]
      E1[Google OAuth]
      E2[Face Recognition Model/API]
    end

    S1 --> E1
    S3 --> E2

-------------------------------------------------------------------

sequenceDiagram
    autonumber
    actor P as Professor
    actor S as Student
    participant FE as Frontend (React)
    participant AR as Attendance Router (/attendance)
    participant TR as Teacher Router (/teachers)
    participant AS as Attendance Service Module
    participant FR as FaceRecognition Module
    participant AU as Audit Module
    participant DB as MySQL (sessions/records)

    Note over P,DB: 1) Session Creation (Professor side)
    P->>FE: Start attendance (Code / QR / Face)
    FE->>TR: POST /teachers/attendance/session/start
    TR->>DB: Create attendance_session (status=open)
    TR-->>FE: session_id + mode config
    FE-->>P: Session started

    alt Code-based attendance
        Note over S,DB: 2A) Student submits attendance code
        S->>FE: Enter 6-digit code
        FE->>AR: POST /attendance/submit-code
        AR->>AS: Validate code + expiry + class/session mapping
        AS->>DB: Upsert attendance_record (qr_verified/code flag)
        AS->>AS: Compute final_status (present/manual_review/absent)
        AS->>AU: Log audit event (code_submission)
        AU->>DB: Insert audit_logs
        AR-->>FE: Submission accepted (pending/updated)
        FE-->>S: Success / pending approval
    else QR-based attendance
        Note over S,DB: 2B) Student scans or uploads QR
        S->>FE: Scan/upload QR
        FE->>AR: POST /attendance/upload-qr-image or verify endpoint
        AR->>AS: Decode + verify QR token/session validity
        AS->>DB: Upsert attendance_record (qr_verified=true)
        AS->>AS: Compute final_status
        AS->>AU: Log audit event (qr_verification)
        AU->>DB: Insert audit_logs
        AR-->>FE: QR verification result
        FE-->>S: Attendance submitted
    else Face-recognition attendance
        Note over P,DB: 2C) Professor uploads classroom image
        P->>FE: Upload classroom image
        FE->>AR: POST /attendance/session/{id}/upload-image
        AR->>FR: Recognize faces from image
        FR-->>AR: matched students + confidence
        AR->>AS: Map recognitions to enrolled students
        AS->>DB: Update attendance_records (face_detected/confidence)
        AS->>AS: Compute final_status
        AS->>AU: Log audit event (image_upload)
        AU->>DB: Insert audit_logs
        AR-->>FE: Recognized + updated records
        FE-->>P: Preview results
    end

    Note over P,DB: 3) Teacher approval/finalization
    P->>FE: Approve / reject pending submissions
    FE->>AR: POST /attendance/code-submissions/{id}/approve|reject
    AR->>DB: Update attendance_record final_status
    AR->>AU: Log approval/rejection
    AU->>DB: Insert audit_logs
    AR-->>FE: Updated status

    P->>FE: Finalize session
    FE->>TR: POST /teachers/attendance/session/{id}/finalize
    TR->>DB: Set attendance_session.status=closed
    TR->>AU: Log session_finalized
    AU->>DB: Insert audit_logs
    TR-->>FE: Finalization success

    Note over S,DB: 4) Student views attendance report
    S->>FE: Open My Attendance
    FE->>AR: GET /attendance/my-attendance
    AR->>DB: Aggregate class/session attendance
    AR-->>FE: Attendance percentages + records
    FE-->>S: Dashboard/report view

------------------------------------------------------------------------

