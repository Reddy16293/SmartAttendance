# Smart Attendance — Setup Guide

A step-by-step guide to running the application locally for development and testing.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [1. Database Setup](#1-database-setup)
- [2. Backend Setup](#2-backend-setup)
- [3. Frontend Setup](#3-frontend-setup)
- [4. Mobile Setup](#4-mobile-setup)
- [5. Face Recognition Model Setup](#5-face-recognition-model-setup)
- [Service Ports Reference](#service-ports-reference)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Ensure the following are installed before proceeding:

| Tool | Version | Purpose |
|---|---|---|
| Python | 3.10+ | Backend runtime |
| pip | Latest | Python package manager |
| Node.js | 16+ | Frontend and mobile |
| npm | Latest | Node package manager |
| MySQL | 8.0+ | Database |
| Expo CLI | Latest | Mobile app development |
| Docker | Optional | Containerised MySQL alternative |

Install Expo CLI globally if using the mobile app:

```bash
npm install -g expo-cli
```

---

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

---

## Database Setup

### Option A — Local MySQL

**Step 1: Install MySQL**

Download and install [MySQL Community Server](https://dev.mysql.com/downloads/mysql/) and [MySQL Workbench](https://dev.mysql.com/downloads/workbench/) from the official website.

During installation:
- Set a username
- Set a strong password and save it
- Keep the default port `3306`

**Step 2: Create the database**

Open MySQL Workbench or a terminal and run:

```sql
CREATE DATABASE college_attendance;
```

**Step 3: Import the schema**

From the terminal (project root):

```bash
mysql -u your_username -p college_attendance < backend/queries.sql
```

Or using MySQL Workbench:
1. Connect to your local MySQL server
2. Select the `college_attendance` database
3. Open `backend/queries.sql` and execute its contents

---

### Option B — Docker

**Step 1: Start the container**

```bash
docker run --name college-mysql \
  -e MYSQL_ROOT_PASSWORD=your_root_password \
  -e MYSQL_USER=your_username \
  -e MYSQL_PASSWORD=your_password \
  -e MYSQL_DATABASE=college_attendance \
  -p 3306:3306 \
  -d mysql:8
```

> Replace `your_username`, `your_password`, and `your_root_password` with your own values and update your `.env` file accordingly.

**Step 2: Wait for the container to be ready**

```bash
docker exec college-mysql mysqladmin ping -u root -pyour_root_password --wait
```

**Step 3: Import the schema**

```bash
docker exec -i college-mysql mysql -u your_username -pyour_password college_attendance < backend/queries.sql
```

---

Both options result in a running MySQL instance on port `3306` with the `college_attendance` database ready to use.

## 2. Backend Setup

### Step 1: Configure environment variables

Create a `.env` file inside the `backend/` folder and fill in your values:

```env
# ── Database ─────────────────────────────────────────────
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_HOST=localhost
DB_PORT=3306
DB_NAME=college_attendance

# ── Authentication ────────────────────────────────────────
SECRET_KEY=your-secret-key-change-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=30

# ── Application ───────────────────────────────────────────
HOST=0.0.0.0
PORT=8000
ENV=development
SQL_ECHO=false

# ── CORS ──────────────────────────────────────────────────
CORS_ORIGINS=http://localhost:8080,http://localhost:5173,http://localhost:3000

# ── Face Recognition API ──────────────────────────────────
FACE_API_ENDPOINT=http://localhost:5000/recognize
FACE_API_KEY=your-face-api-key

# ── Google OAuth (optional) ───────────────────────────────
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8080/auth/google/callback

# ── Cloudinary (optional) ─────────────────────────────────
CLOUDINARY_URL=your-cloudinary-url
```

> **Note:** Variable names are case-insensitive. The Pydantic settings loader accepts both `DB_USER` and `db_user`.

---

### Step 2: Create a virtual environment and install dependencies

**macOS / Linux / WSL:**

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

**Windows (PowerShell):**

```powershell
cd backend
python -m venv .venv
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

---

### Step 3: Run database migrations

```bash
python run_migration.py
```

Or with Alembic (if configured):

```bash
alembic upgrade head
```

---

### Step 4: Start the backend server

```bash
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The backend will be available at:

| | URL |
|---|---|
| API base | `http://localhost:8000` |

---

## 3. Frontend Setup

### Step 1: Configure environment variables

Create a `.env` file inside the `frontend/` folder:

```env
# ── API ───────────────────────────────────────────────────
VITE_API_URL=http://localhost:8000

# ── Google OAuth (optional) ───────────────────────────────
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

> For production, replace `VITE_API_URL` with your deployed backend URL.

---

### Step 2: Install and run

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:8080`.

> The frontend expects the backend API at `http://localhost:8000`. CORS is pre-configured for this.

---

## 4. Mobile Setup

### Step 1: Configure environment variables

Create a `.env` file inside the `AppFrontend/` folder:

```env
# ── API ───────────────────────────────────────────────────
EXPO_PUBLIC_API_URL=http://localhost:8000

# ── Google OAuth ──────────────────────────────────────────
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-google-web-client-id
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-google-android-client-id
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-google-ios-client-id

# ── Environment ───────────────────────────────────────────
NODE_ENV=development
```

> Replace `EXPO_PUBLIC_API_URL` with your machine's local IP (e.g. `http://192.168.x.x:8000`) if testing on a physical device.

---

### Step 2: Install and run

```bash
cd AppFrontend
npm install
npx expo start
```

Scan the QR code with the **Expo Go** app on your phone.

> Your mobile device and development machine must be on the **same Wi-Fi network**. Alternatively, use Expo's tunnel mode: `npx expo start --tunnel`

---

## 5. Face Recognition Model Setup

The `FaceModel/` module is responsible for generating face embeddings and running the face recognition service used by the attendance system.

---

### Step 1: Navigate to FaceModel Directory

```bash
cd FaceModel
```

---

### Step 2: Install Dependencies

Create a virtual environment if required:

#### Windows

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

#### Linux / macOS

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Install required packages:

```bash
pip install -r requirements.txt
```

---

### Step 3: Generate Face Embeddings

Run the following command to generate facial embeddings from the training dataset:

```bash
python generate_embeddings.py
```

> This process extracts facial feature vectors and stores them for recognition during attendance verification.

---

### Step 4: Start Face Recognition Service

Run the face recognition server with ngrok support:

```bash
python run_facemodel_with_ngrok.py
```

This will:
- Start the face recognition API
- Expose the API using ngrok
- Generate a public URL for external/mobile access

---

### Step 5: Update Backend Face API Endpoint

After starting ngrok, copy the generated public URL and update the backend `.env` file:

```env
FACE_API_ENDPOINT=https://your-ngrok-url/recognize
```

Restart the backend server after updating the endpoint.

---

### Notes

- Ensure the embeddings are generated before starting the recognition service.
- The `FaceModel/` service must be running for face-based attendance verification.
- If using a physical mobile device, ngrok helps expose the local face recognition API externally.

## Service Ports Reference

| Service | URL | Notes |
|---|---|---|
| Backend API (FastAPI) | `http://localhost:8000` | Interactive docs at `/docs` |
| Frontend (Vite) | `http://localhost:8080` | Web interface |
| Face Recognition API | `http://localhost:5000` | External service |
| MySQL | `localhost:3306` | Default MySQL port |
| Expo (Metro) | `localhost:19000` | Mobile dev server |

---

## Troubleshooting

**Port already in use**

On macOS / Linux:
```bash
lsof -i :8000
kill -9 <PID>
```

On Windows (PowerShell):
```powershell
netstat -aon | findstr 8000
taskkill /PID <PID> /F
```

To use a different port for the frontend, update `server.port` in `frontend/vite.config.ts`.

---

**Database connection errors**

- Verify the credentials in `backend/.env` match your MySQL setup.
- Confirm MySQL is running: `mysql -u root -p`
- If using Docker, confirm the container is active: `docker ps`

---

**Face API errors**

- Confirm the face recognition service is running.
- Verify `FACE_API_ENDPOINT` in `backend/.env` is correct and reachable.

---

**CORS errors in the browser**

- Confirm `CORS_ORIGINS` in `backend/.env` includes your frontend URL.
- Restart the backend after making any `.env` changes.

---

**Mobile app cannot reach the backend**

- Use your machine's local IP instead of `localhost` in `EXPO_PUBLIC_API_URL`.
- Ensure both devices are on the same Wi-Fi network, or use `npx expo start --tunnel`.

---



> For full architecture details, API documentation, and module breakdowns, refer to [`DEVELOPER_MANUAL.md`](./DEVELOPER_MANUAL.md).
