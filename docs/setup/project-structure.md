# Project Folder Structure

| Path | Purpose |
|---|---|
| `backend/` | Main FastAPI backend responsible for authentication, attendance logic, enrollment, timetable, and database access. |
| `backend/main.py` | Backend entry point, middleware, CORS configuration, and router registration. |
| `backend/config.py` | Environment-driven configuration values for database, JWT, OAuth, CORS, face API, and storage. |
| `backend/models/` | SQLAlchemy ORM models for users, classes, attendance, schedules, and audit logs. |
| `backend/schemas/` | Pydantic request and response models for the API. |
| `backend/routes/` | API route handlers grouped by domain. |
| `backend/services/` | Business logic such as attendance decision rules, face recognition integration, storage, and auditing. |
| `backend/utils/` | JWT helpers, authorization helpers, Google token helpers, and utility functions. |
| `backend/db/` | Database session helpers and related persistence utilities. |
| `backend/migrations/` and `backend/alembic/` | Database migration scripts and Alembic configuration. |
| `AppFrontend/` | Expo mobile application for student and teacher interaction. |
| `AppFrontend/app/` | Expo Router screens and nested route groups. |
| `AppFrontend/src/` | Shared frontend components, services, config, and utilities. |
| `frontend/` | Vite-based web frontend for browser access and dashboard-style views. |
| `frontend/src/` | React components, pages, hooks, services, types, and contexts for the web UI. |
| `FaceModel/` | Face recognition training, evaluation, embeddings, and recognition experiments. |
| Root scripts such as `setup.sh`, `setup.bat`, `start-backend.sh`, `start-frontend.sh`, `run.sh` | Convenience scripts for local setup and execution. |
| `architecture_diagrams.md` | Existing architecture notes and diagrams for the system. |
| `DUAL_VERIFICATION_TEST_GUIDE.md` | Verification guide for combined face, QR, and code attendance workflows. |

### Component and Module Purpose

- `AppFrontend/app/(auth)` handles authentication screens and role selection.
- `AppFrontend/app/(app)` contains authenticated application screens.
- `backend/routes/attendance.py` coordinates attendance sessions, QR verification, code submission, face recognition, and approval flows.
- `backend/routes/teacher.py` handles teacher administration of subjects, classes, schedules, and session control.
- `backend/routes/student.py` exposes student enrollment and attendance reporting.
- `backend/routes/enrollments.py` supports enrollment codes and class schedule management.
- `backend/routes/timetable.py` manages timetable entries and subject colors.
- `FaceModel/` contains model-level experimentation, dataset directories, embeddings, and evaluation artifacts.
- `face-api/` acts as the service boundary for model inference.
