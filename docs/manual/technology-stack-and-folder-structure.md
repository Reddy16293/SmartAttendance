# Technology Stack and Folder Structure

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend technologies | React, React Native, Expo, Expo Router, TypeScript, Tailwind CSS, shadcn-style UI, React Query, React Hook Form |
| Backend technologies | FastAPI, Uvicorn, SQLAlchemy, Alembic, Pydantic v2, Python, JWT, bcrypt, Google Auth libraries |
| Database | MySQL with SQLAlchemy ORM |
| AI/ML libraries | InsightFace, ONNX Runtime, OpenCV, NumPy, scikit-learn, Torch, Pillow, pyzbar |
| APIs used | Google OAuth, backend REST APIs, QR code generation/verification, face recognition service API, optional cloud storage API |
| Tools and platforms | Expo, Vite, Vercel, Docker, Docker Compose, MySQL, Alembic, Render-style deployment, EAS configuration in Expo |

## Project Folder Structure

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
