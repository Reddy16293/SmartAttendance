# Project Overview and Architecture

## Project Overview

The Smart Attendance System is a college attendance platform built from four main parts:

- `backend/`: FastAPI API and business logic.
- `AppFrontend/`: Expo React Native mobile app.
- `frontend/`: Vite React web app.
- `FaceModel/`: face-recognition model training and experimentation pipeline.

Attendance can be captured through a numeric code, QR code, or face recognition. Face recognition is handled by a separate inference service (`face-api/`) backed by the model pipeline in `FaceModel/`. MySQL stores persistent data, while JWT handles authentication for local accounts and Google OAuth.

### Key Features

- Student and teacher authentication using email/password and Google OAuth.
- JWT-based session handling and role-based access control.
- Class, subject, and timetable management.
- Enrollment through codes and manual teacher enrollment.
- Attendance sessions with QR, code, and face-recognition support.
- Teacher approval and override of pending attendance records.
- Student attendance dashboards and per-subject statistics.
- Audit logging for important system actions.

## System Architecture

### High-Level View

The system follows a layered client-server architecture:

| Layer | Responsibility | Main Codebase |
|---|---|---|
| Client | Mobile and web user interfaces | `AppFrontend/`, `frontend/` |
| Application | API endpoints, authorization, and attendance workflows | `backend/` |
| Data | Persistent storage and ORM models | MySQL + SQLAlchemy |
| AI/ML | Face recognition training and inference | `FaceModel/`, `face-api/` |
| External services | Google OAuth and optional image storage | Google services, cloud storage |

### Client Applications

#### Mobile App: `AppFrontend/`

- Built with Expo, React Native, TypeScript, and Expo Router.
- Designed for mobile-first attendance flows.
- Supports login, attendance submission, camera-based actions, and student or teacher dashboards.
- Uses `expo.extra.apiUrl` to connect to the backend API.

#### Web App: `frontend/`

- Built with Vite, React, TypeScript, Tailwind CSS, and shadcn-style components.
- Designed for browser-based access and dashboard-style workflows.
- Uses SPA routing with Vercel rewrite support.

### Backend Architecture

The backend uses FastAPI with a modular router and service pattern:

- **Routers** define API endpoints for authentication, teacher operations, student operations, attendance, enrollments, and timetable management.
- **Services** contain business logic such as attendance state updates, face recognition integration, authorization helpers, audit logging, and storage helpers.
- **Utils** provide JWT helpers, role checks, Google token validation, and query helper functions.
- **Database session management** is handled through SQLAlchemy and a shared session dependency.

## Architecture Diagrams

### System Context Diagram

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

### Backend Component Diagram

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

