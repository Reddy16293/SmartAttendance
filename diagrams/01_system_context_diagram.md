# System Context Diagram
## Automated College Attendance Management System

```mermaid
graph TB
    subgraph Users["👥 Users"]
        Professor["Professor<br/>(role=teacher)"]
        Student["Student<br/>(role=student)"]
    end
    
    subgraph Clients["🖥️ Client Applications"]
        CLIENT["Client Applications<br/>Web (React + Vite)\nMobile (React Native + Expo)"]
    end
    
    subgraph AttendanceSystem["🔧 Attendance System Application"]
        BE["FastAPI Backend<br/>main.py<br/>Uvicorn Server"]
        DB["MySQL Database<br/>SQLAlchemy ORM<br/>Connection pooling"]
    end
    
    subgraph ExternalServices["🌐 External Services"]
        ML["Face Recognition ML Service<br/>InsightFace (buffalo_l)<br/>HTTP API"]
        OAUTH["Google OAuth 2.0<br/>Token Verification"]
    end
    
    Professor -->|Start Sessions<br/>Upload Images<br/>Manage Classes<br/>Override Attendance<br/>View Reports| CLIENT
    Student -->|Submit QR/Code<br/>View Attendance<br/>Enroll in Classes<br/>View Timetable| CLIENT
    
    CLIENT -->|REST API<br/>JWT Auth<br/>JSON| BE
    
    BE -->|SQL Queries<br/>ORM Operations| DB
    
    BE -->|POST /recognize<br/>Image bytes<br/>GET results| ML
    
    BE -->|Verify ID Token<br/>User Info| OAUTH
    
    WEB -.->|OAuth Redirect<br/>https://accounts.google.com| OAUTH
    MOBILE -.->|OAuth Redirect| OAUTH
    
    style Users fill:lightblue,stroke:darkblue
    style Clients fill:lavender,stroke:purple
    style CoreSystem fill:lightgreen,stroke:green
    style ExternalServices fill:lightyellow,stroke:orange
    
    classDef userStyle fill:lightblue,stroke:darkblue,color:#000
    classDef clientStyle fill:lavender,stroke:purple,color:#000
    classDef coreStyle fill:lightgreen,stroke:green,color:#000
    classDef externalStyle fill:lightyellow,stroke:orange,color:#000
```

## Component Interactions

| User | Client | Action | Backend Route | Backend Service |
|------|--------|--------|---------------|-----------------|
| Faculty | Web | Start Session | POST /teachers/attendance/session/start | AttendanceLogic |
| Faculty | Web | Upload Image | POST /attendance/session/{id}/upload-image | FaceRecognitionService |
| Faculty | Web | Override Attendance | PATCH /teachers/attendance/session/{id}/override | AttendanceLogic |
| Faculty | Web | Finalize Session | POST /teachers/attendance/session/{id}/finalize | AttendanceLogic |
| Student | Web | Submit QR Code | POST /attendance/session/{id}/verify | AttendanceLogic |
| Student | Web | Submit Code | POST /attendance/submit-code | AttendanceLogic |
| Student | Web | Enroll | POST /students/enroll | StudentService |
| Student | Web | View Attendance | GET /students/attendance | StudentService |
| Any User | Any | Register | POST /auth/register | AuthService |
| Any User | Any | Login | POST /auth/login | AuthService |
| Any User | Any | Google OAuth | POST /auth/google | AuthService |
