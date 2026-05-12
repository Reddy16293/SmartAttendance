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
