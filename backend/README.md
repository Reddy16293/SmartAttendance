# College Attendance Management System - Backend API

A production-ready FastAPI backend for an automated college attendance management system featuring face recognition, QR code verification, and role-based access control.

## 🎯 Features

### Core Functionality
- **User Management**: Student and Teacher authentication with email/password and Google OAuth
- **Subject & Class Management**: Teachers can create subjects and manage class sections
- **Student Enrollment**: Students can enroll in classes
- **Attendance Sessions**: Teachers start attendance sessions with optional QR code verification
- **Face Recognition**: Automated face detection in classroom images
- **QR Code Verification**: Students verify attendance using QR codes
- **Attendance Decision Logic**: Automatic status computation (present/absent/manual_review)
- **Teacher Override**: Teachers can manually override attendance records before session finalization
- **Attendance Reports**: Students can view attendance percentage by subject

### Authentication & Security
- JWT-based authentication with secure token generation
- Role-based access control (RBAC) for Students and Teachers
- Google OAuth integration
- Password hashing with bcrypt
- Request validation with Pydantic

### Database
- MySQL with SQLAlchemy ORM
- Proper foreign keys and relationships
- Session-specific QR codes (not class-specific)
- Audit timestamps (created_at, updated_at)

## 📋 Tech Stack

- **Framework**: FastAPI (Python)
- **Database**: MySQL with SQLAlchemy ORM
- **Authentication**: JWT + Google OAuth
- **Password Hashing**: bcrypt
- **Validation**: Pydantic v2
- **Server**: Uvicorn
- **API Documentation**: Swagger UI & ReDoc

## 🗂️ Project Structure

```
backend/
├── main.py                      # FastAPI application entry point
├── database.py                  # Database configuration & session management
├── requirements.txt             # Python dependencies
├── .env.example                 # Environment variables template
├── models/                      # SQLAlchemy ORM models
│   ├── __init__.py
│   ├── user.py                 # User model (students & teachers)
│   ├── subject.py              # Subject/course model
│   ├── class_.py               # Class section model
│   ├── student_enrollment.py   # Many-to-many student-class mapping
│   ├── attendance_session.py   # Attendance event model
│   └── attendance_record.py    # Attendance record with decision logic
├── schemas/                     # Pydantic request/response schemas
│   ├── __init__.py
│   ├── user.py                 # User schemas
│   ├── subject.py              # Subject schemas
│   ├── class_.py               # Class schemas
│   ├── attendance.py           # Attendance session/record schemas
│   └── student.py              # Student enrollment schemas
├── routes/                      # API route handlers
│   ├── __init__.py
│   ├── auth.py                 # Authentication endpoints
│   ├── teacher.py              # Teacher operations
│   ├── student.py              # Student operations
│   └── attendance.py           # Attendance operations
├── services/                    # Business logic
│   ├── __init__.py
│   ├── attendance_logic.py     # Attendance decision & override logic
│   └── face_service.py         # Face recognition service interface
└── utils/                       # Utility functions
    ├── __init__.py
    ├── jwt_auth.py             # JWT token handling & dependencies
    └── helpers.py              # Database query helpers
```

## 🗃️ Database Models

### User
```python
- id: Primary Key
- name: String
- email: String (unique)
- password_hash: String (nullable for OAuth users)
- role: Enum (student/teacher)
- google_id: String (unique, nullable)
- created_at: DateTime
- updated_at: DateTime
```

### Subject
```python
- id: Primary Key
- name: String
- code: String (unique)
```

### Class
```python
- id: Primary Key
- subject_id: Foreign Key → Subject
- teacher_id: Foreign Key → User
- year: Integer (1-4)
- section: String
- created_at: DateTime
- updated_at: DateTime
```

### StudentEnrollment
```python
- id: Primary Key
- student_id: Foreign Key → User
- class_id: Foreign Key → Class
- enrolled_at: DateTime
```

### AttendanceSession
```python
- id: Primary Key
- class_id: Foreign Key → Class
- date: DateTime
- qr_enabled: Boolean
- qr_code: String (unique, nullable)  ⚠️ Session-specific, not class-specific
- status: Enum (open/closed)
- created_at: DateTime
- updated_at: DateTime
```

### AttendanceRecord
```python
- id: Primary Key
- session_id: Foreign Key → AttendanceSession
- student_id: Foreign Key → User
- face_detected: Boolean
- qr_verified: Boolean
- confidence: Float (nullable)
- final_status: String (present/absent/manual_review)
- overridden_by_teacher: Boolean
- override_reason: String (nullable)
- created_at: DateTime
- updated_at: DateTime
```

## 🧠 Attendance Decision Logic

### Automatic Computation
```python
if face_detected AND qr_verified:
    final_status = "present"
elif face_detected OR qr_verified:
    final_status = "manual_review"
else:
    final_status = "absent"
```

### Teacher Override
- Teachers can manually override status **before** session is finalized
- Override sets `overridden_by_teacher = true` and updates `final_status`
- Optional `override_reason` can be provided
- Manual override has highest priority over automatic computation

### Session Finalization
- After finalization, no more overrides allowed
- Session status changes to "closed"

## 🔐 API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login with email/password
- `POST /auth/google` - Google OAuth authentication
- `GET /auth/me` - Get current user info

### Teacher Operations
**Subject Management**
- `POST /teachers/subjects` - Create subject
- `GET /teachers/subjects` - List all subjects

**Class Management**
- `POST /teachers/classes` - Create class
- `GET /teachers/classes` - List teacher's classes

**Attendance Sessions**
- `POST /teachers/attendance/session/start` - Start attendance session
- `GET /teachers/attendance/session/{session_id}` - Get session details
- `GET /teachers/attendance/session/{session_id}/records` - Get session records
- `PATCH /teachers/attendance/session/{session_id}/override` - Override attendance
- `POST /teachers/attendance/session/{session_id}/finalize` - Finalize session

### Student Operations
**Enrollment**
- `POST /students/enroll` - Enroll in a class
- `GET /students/enrollments` - List enrollments

**Attendance**
- `GET /students/attendance` - Get attendance report (percentage by subject)

### Attendance Operations
**Face Recognition**
- `POST /attendance/session/{session_id}/upload-image` - Upload classroom image

**QR Verification**
- `POST /attendance/session/{session_id}/verify` - Verify QR code

**Records**
- `GET /attendance/record/{record_id}` - Get specific record
- `GET /attendance/session/{session_id}/records` - Get session records

## 🚀 Getting Started

### Prerequisites
- Python 3.11+
- MySQL 8.0+
- pip or poetry

### Installation

1. **Clone the repository**
```bash
cd backend
```

2. **Create and activate virtual environment**
```bash
python3.11 -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Configure environment**
```bash
# Copy example to .env
cp .env.example .env

# Edit .env with your configuration
# Database credentials, JWT secret, CORS origins, etc.
```

5. **Create MySQL database**
```bash
mysql -u root -p
CREATE DATABASE college_attendance;
EXIT;
```

6. **Run the application**
```bash
python main.py
```

The API will be available at `http://localhost:8000`

### Access Documentation
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **OpenAPI JSON**: `http://localhost:8000/openapi.json`

## 📝 Usage Examples

### Register a User
```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "secure_password",
    "role": "student"
  }'
```

### Login
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "secure_password"
  }'
```

### Create a Subject (Teacher)
```bash
curl -X POST http://localhost:8000/teachers/subjects \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Data Structures",
    "code": "CS101"
  }'
```

### Start Attendance Session (Teacher)
```bash
curl -X POST http://localhost:8000/teachers/attendance/session/start \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "class_id": 1,
    "qr_enabled": true
  }'
```

### Upload Classroom Image (Teacher)
```bash
curl -X POST http://localhost:8000/attendance/session/1/upload-image \
  -H "Authorization: Bearer <token>" \
  -F "image=@classroom.jpg"
```

### Verify QR Code (Student)
```bash
curl -X POST http://localhost:8000/attendance/session/1/verify \
  -H "Authorization: Bearer <student_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "qr_code": "<qr_code_from_session>",
    "student_id": 1
  }'
```

### Get Attendance Report (Student)
```bash
curl -X GET http://localhost:8000/students/attendance \
  -H "Authorization: Bearer <student_token>"
```

### Override Attendance (Teacher)
```bash
curl -X PATCH http://localhost:8000/teachers/attendance/session/1/override \
  -H "Authorization: Bearer <teacher_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": 5,
    "final_status": "present",
    "reason": "Student was present but face not detected"
  }'
```

## ⚙️ Configuration

### Environment Variables
```env
# Database
DB_USER=root
DB_PASSWORD=password
DB_HOST=localhost
DB_PORT=3306
DB_NAME=college_attendance

# JWT
SECRET_KEY=your-super-secret-key-change-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Server
HOST=0.0.0.0
PORT=8000
ENV=development
SQL_ECHO=false

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Face Recognition API
FACE_API_ENDPOINT=http://localhost:5000/recognize
FACE_API_KEY=your-api-key
```

## 🔌 Face Recognition Integration

The `FaceRecognitionService` is designed as an abstraction layer:

1. **Call External Service**: Sends classroom image to face recognition API
2. **Get Results**: Receives recognized students with confidence scores
3. **Map to Database**: Converts ML identifiers to student IDs
4. **Update Records**: Updates attendance records with face detection results

The ML model never touches the database. The backend controls all attendance logic.

### Expected Face Recognition API Response
```json
{
  "faces": [
    {"name": "student_101", "confidence": 0.87},
    {"name": "student_102", "confidence": 0.92}
  ]
}
```

## 🧪 Testing

### Test with Postman
1. Import the API endpoints into Postman
2. Create environment variables for token and base_url
3. Test authentication flow first
4. Test teacher operations
5. Test student operations

### Test with Python
```python
import httpx

async def test_auth():
    async with httpx.AsyncClient() as client:
        # Register
        response = await client.post("http://localhost:8000/auth/register", json={
            "name": "Test User",
            "email": "test@example.com",
            "password": "password123",
            "role": "student"
        })
        print(response.json())
```

## 📊 Database Diagram

```
Users (1) ──→ (M) StudentEnrollments ←─ (M) Classes
   |                                           |
   ├─→ Classes (teaches)                       ├─→ Subjects
   |                                           |
   └─→ AttendanceRecords                       └─→ AttendanceSessions
                                                    |
                                                    └─→ AttendanceRecords
```

## 🔒 Security Considerations

1. **JWT Tokens**: Secure token-based authentication with expiration
2. **Password Hashing**: bcrypt with proper salt rounds
3. **Role-Based Access**: RBAC for student/teacher operations
4. **Input Validation**: Pydantic validates all inputs
5. **SQL Injection**: SQLAlchemy ORM prevents SQL injection
6. **CORS**: Configurable CORS origins
7. **Environment Variables**: Sensitive data in `.env`

## 🐛 Error Handling

All endpoints return proper HTTP status codes:
- `200 OK`: Successful GET/PATCH
- `201 Created`: Successful POST
- `400 Bad Request`: Invalid input or business logic violation
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

## 📚 Development Rules

✅ SQLAlchemy ORM only (no raw SQL)
✅ Dependency injection for DB sessions
✅ Auto-create tables on startup
✅ Proper HTTP status codes
✅ Clean, readable, maintainable code
✅ Type hints throughout
✅ Docstrings for all functions
✅ Pydantic schemas for validation

## 🚀 Production Deployment

### Gunicorn + Uvicorn
```bash
gunicorn -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000 main:app
```

### Docker
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Environment Setup
- Use strong `SECRET_KEY` in production
- Enable SSL/TLS
- Set `ENV=production`
- Configure proper CORS origins
- Use managed MySQL database
- Enable SQL query logging in dev only

## 📖 API Documentation

Full interactive API documentation is available at:
- Swagger UI: `/docs`
- ReDoc: `/redoc`

All endpoints are documented with:
- Description
- Parameters
- Request/Response schemas
- Status codes
- Error messages

## 🤝 Contributing

1. Follow existing code style
2. Add docstrings to functions
3. Use type hints
4. Test changes locally
5. Update documentation

## 📄 License

This project is part of the College Connect system.

## 🆘 Support

For issues or questions:
1. Check the API documentation at `/docs`
2. Review error messages carefully
3. Check environment variables configuration
4. Verify database connection
5. Check database tables are created

---

**Built with ❤️ using FastAPI, SQLAlchemy, and MySQL**
