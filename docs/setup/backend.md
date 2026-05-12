# Backend Setup

## Step 1: Configure environment variables

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

## Step 2: Create a virtual environment and install dependencies

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

## Step 3: Run database migrations

```bash
python run_migration.py
```

Or with Alembic (if configured):

```bash
alembic upgrade head
```

## Step 4: Start the backend server

```bash
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The backend will be available at:

| | URL |
|---|---|
| API base | `http://localhost:8000` |
