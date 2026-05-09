# Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### System Requirements
- Python 3.9+
- MySQL 8.0+
- pip or poetry

### Step 1: Run Setup Script

**Windows:**
```bash
setup.bat
```

**Linux/Mac:**
```bash
chmod +x setup.sh
./setup.sh
```

### Step 2: Configure Environment

Edit `.env` file with your settings:
```env
# Database
DB_USER=root
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=3306
DB_NAME=college_attendance

# JWT Secret (change this in production!)
SECRET_KEY=your-super-secret-key-change-in-production

# Other settings...
```

### Step 3: Create Database

```bash
mysql -u root -p
CREATE DATABASE college_attendance;
EXIT;
```

### Step 4: Run the Server

```bash
python main.py
```

You should see:
```
============================================================
🚀 COLLEGE ATTENDANCE MANAGEMENT SYSTEM
============================================================
✅ Database tables initialized successfully!
✅ Application started successfully!

INFO:     Started server process [1234]
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Step 5: Test the API

Open your browser:
- **API Documentation**: http://localhost:8000/docs
- **Alternative Docs**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/health

## 🧪 Quick Test Flow

### 1. Register a User (Student)
```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Student",
    "email": "john@example.com",
    "password": "SecurePass123!",
    "role": "student"
  }'
```

Response:
```json
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "name": "John Student",
    "email": "john@example.com",
    "role": "student",
    "created_at": "2024-01-15T10:30:00",
    "updated_at": "2024-01-15T10:30:00"
  }
}
```

Save the `access_token` - you'll need it for authenticated requests!

### 2. Register a Teacher
```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Prof. Smith",
    "email": "smith@example.com",
    "password": "TeacherPass123!",
    "role": "teacher"
  }'
```

### 3. Teacher: Create a Subject
```bash
curl -X POST http://localhost:8000/teachers/subjects \
  -H "Authorization: Bearer <teacher_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Data Structures",
    "code": "CS101"
  }'
```

Response:
```json
{
  "id": 1,
  "name": "Data Structures",
  "code": "CS101"
}
```

### 4. Teacher: Create a Class
```bash
curl -X POST http://localhost:8000/teachers/classes \
  -H "Authorization: Bearer <teacher_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "subject_id": 1,
    "teacher_id": 2,
    "year": 2,
    "section": "A"
  }'
```

### 5. Student: Enroll in Class
```bash
curl -X POST http://localhost:8000/students/enroll \
  -H "Authorization: Bearer <student_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "class_id": 1
  }'
```

### 6. Teacher: Start Attendance Session
```bash
curl -X POST http://localhost:8000/teachers/attendance/session/start \
  -H "Authorization: Bearer <teacher_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "class_id": 1,
    "qr_enabled": true
  }'
```

Response:
```json
{
  "id": 1,
  "class_id": 1,
  "date": "2024-01-15T15:30:00",
  "qr_enabled": true,
  "qr_code": "550e8400-e29b-41d4-a716-446655440000",
  "status": "open",
  "created_at": "2024-01-15T15:30:00",
  "updated_at": "2024-01-15T15:30:00"
}
```

Save the `qr_code`!

### 7. Student: Verify with QR Code
```bash
curl -X POST http://localhost:8000/attendance/session/1/verify \
  -H "Authorization: Bearer <student_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "qr_code": "550e8400-e29b-41d4-a716-446655440000",
    "student_id": 1
  }'
```

### 8. Student: Check Attendance Report
```bash
curl -X GET http://localhost:8000/students/attendance \
  -H "Authorization: Bearer <student_token>"
```

Response:
```json
{
  "student_id": 1,
  "student_name": "John Student",
  "attendance_by_subject": [
    {
      "class_id": 1,
      "subject_name": "Data Structures",
      "subject_code": "CS101",
      "total_sessions": 1,
      "present_count": 1,
      "absent_count": 0,
      "manual_review_count": 0,
      "attendance_percentage": 100.0
    }
  ],
  "overall_percentage": 100.0
}
```

## 🖼️ Using Swagger UI

Instead of curl, you can use the interactive Swagger UI:

1. Go to: http://localhost:8000/docs
2. Click on an endpoint
3. Click "Try it out"
4. Fill in the parameters
5. Click "Execute"

This is much easier for testing!

## 🐛 Troubleshooting

### Database Connection Error
```
Error: (pymysql.err.OperationalError) (2003, "Can't connect to MySQL server")
```

**Solution:**
- Check MySQL is running
- Verify DB_HOST, DB_USER, DB_PASSWORD in .env
- Verify database exists: `CREATE DATABASE college_attendance;`

### Port Already in Use
```
Error: OSError: [Errno 48] Address already in use
```

**Solution:**
```bash
# Change PORT in .env or run on different port:
PORT=8001 python main.py
```

### ModuleNotFoundError
```
ModuleNotFoundError: No module named 'fastapi'
```

**Solution:**
```bash
# Make sure virtual environment is activated
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate.bat # Windows

# Then install dependencies
pip install -r requirements.txt
```

### JWT Token Errors
```
{"detail":"Could not validate credentials"}
```

**Solution:**
- Make sure token is in format: `Bearer <token>`
- Check token hasn't expired (default 30 minutes)
- Use token from registration/login response

## 📚 Next Steps

1. **Read the full documentation**: [README.md](README.md)
2. **Explore API endpoints**: http://localhost:8000/docs
3. **Integrate with frontend**: Update CORS_ORIGINS in .env
4. **Deploy to production**: See README.md for production setup
5. **Set up face recognition API**: See Face Recognition Integration section

## 💡 Tips

- Use **Swagger UI** at `/docs` for interactive API testing
- Check **ReDoc** at `/redoc` for detailed documentation
- Enable **SQL logging** by setting `SQL_ECHO=true` in .env for debugging
- Store sensitive values in `.env`, never in code
- Generate strong `SECRET_KEY` for production

## 🆘 Getting Help

1. Check error messages carefully
2. Review the full [README.md](README.md)
3. Check Swagger documentation at `/docs`
4. Review code examples in this file
5. Check database tables with: `SHOW TABLES;`

---

**Ready to go! 🎉 Start building your attendance system!**
