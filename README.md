# Smart Attendance

## Prerequisites

Ensure the following are installed before proceeding:

| Tool | Version | Purpose |
|---|---|---|
| Python | 3.11+ | Backend runtime |
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

## Database Setup

### Option A - Local MySQL

1. Install [MySQL Community Server](https://dev.mysql.com/downloads/mysql/) and [MySQL Workbench](https://dev.mysql.com/downloads/workbench/).
2. Create the database:

```sql
CREATE DATABASE college_attendance;
```

3. Import the schema:

```bash
mysql -u your_username -p college_attendance < backend/queries.sql
```

### Option B - Docker

```bash
docker run --name college-mysql   -e MYSQL_ROOT_PASSWORD=your_root_password   -e MYSQL_USER=your_username   -e MYSQL_PASSWORD=your_password   -e MYSQL_DATABASE=college_attendance   -p 3306:3306   -d mysql:8
```

Then import the schema:

```bash
docker exec -i college-mysql mysql -u your_username -pyour_password college_attendance < backend/queries.sql
```

## Backend Setup

### Step 1: Configure environment variables

Create a `.env` file inside `backend/`:

```env
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_HOST=localhost
DB_PORT=3306
DB_NAME=college_attendance

SECRET_KEY=your-secret-key-change-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=30

HOST=0.0.0.0
PORT=8000
ENV=development
SQL_ECHO=false

CORS_ORIGINS=http://localhost:8080,http://localhost:5173,http://localhost:3000

FACE_API_ENDPOINT=http://localhost:5000/recognize
FACE_API_KEY=your-face-api-key

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8080/auth/google/callback

CLOUDINARY_URL=your-cloudinary-url
```

### Step 2: Create a virtual environment and install dependencies

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Step 3: Run database migrations

```bash
python run_migration.py
```

Or with Alembic:

```bash
alembic upgrade head
```

### Step 4: Start the backend server

```bash
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## Frontend Setup

### Step 1: Configure environment variables

Create a `.env` file inside `frontend/`:

```env
VITE_API_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

### Step 2: Install and run

```bash
cd frontend
npm install
npm run dev
```

## Mobile Setup

### Step 1: Configure environment variables

Create a `.env` file inside `AppFrontend/`:

```env
EXPO_PUBLIC_API_URL=http://localhost:8000
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-google-web-client-id
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-google-android-client-id
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-google-ios-client-id
NODE_ENV=development
```

### Step 2: Install and run

```bash
cd AppFrontend
npm install
npx expo start
```

## Face Recognition Model Setup

The `FaceModel/` module is responsible for generating face embeddings and running the face recognition service used by the attendance system.

### Step 1: Navigate to FaceModel directory

```bash
cd FaceModel
```

### Step 2: Install dependencies

```bash
pip install -r requirements.txt
```

### Step 3: Generate face embeddings

```bash
python generate_embeddings.py
```

### Step 4: Start face recognition service

```bash
python run_facemodel_with_ngrok.py
```

## Service Ports Reference

| Service | URL | Notes |
|---|---|---|
| Backend API (FastAPI) | `http://localhost:8000` | Interactive docs at `/docs` |
| Frontend (Vite) | `http://localhost:8080` | Web interface |
| Face Recognition API | `http://localhost:5000` | External service |
| MySQL | `localhost:3306` | Default MySQL port |
| Expo (Metro) | `localhost:19000` | Mobile dev server |

## Troubleshooting

- If a port is already in use, stop the process using it or switch to a different port.
- If the database connection fails, verify the credentials in `backend/.env` and confirm MySQL is running.
- If face recognition calls fail, confirm the face service is running and `FACE_API_ENDPOINT` is correct.
- If the browser reports CORS errors, confirm `CORS_ORIGINS` includes the frontend URL.
- If the mobile app cannot reach the backend, use your machine's local IP instead of `localhost`.

For more detailed documentation, see the MkDocs site content in `docs/`.
