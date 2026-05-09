"""
College Attendance Management System - FastAPI Backend
Main application entry point with all middleware and configuration.
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

from config import settings
from database import init_db, close_db
from routes import auth_router, teacher_router, student_router, attendance_router, enrollments_router, timetable_router

DB_AVAILABLE = True
DB_INIT_ERROR = None

# ============================================================================
# APPLICATION LIFESPAN
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manage application startup and shutdown.
    
    Startup:
    - Initialize database tables
    
    Shutdown:
    - Close database connections
    """
    # Startup
    print("\n" + "="*60)
    print("🚀 COLLEGE ATTENDANCE MANAGEMENT SYSTEM")
    print("="*60)
    print(f"[FACE] Face API Endpoint: {settings.face_api_endpoint}")
    global DB_AVAILABLE, DB_INIT_ERROR
    try:
        init_db()
        DB_AVAILABLE = True
        DB_INIT_ERROR = None
        print("✅ Application started successfully!\n")
    except Exception as e:
        DB_AVAILABLE = False
        DB_INIT_ERROR = str(e)
        can_continue = settings.is_development
        print(f"❌ Database initialization failed: {e}")
        if can_continue:
            print("⚠️ Continuing startup without DB because ENV=development")
            print("⚠️ DB-dependent endpoints may fail until DB connectivity is fixed.\n")
        else:
            raise
    
    yield
    
    # Shutdown
    print("\n" + "="*60)
    print("🛑 SHUTTING DOWN APPLICATION")
    print("="*60)
    close_db()
    print("✅ Application shutdown completed!\n")


# ============================================================================
# APPLICATION SETUP
# ============================================================================

app = FastAPI(
    title="College Attendance Management System",
    description="API for managing student attendance with face recognition",
    version="1.0.0",
    lifespan=lifespan,
)


@app.middleware("http")
async def log_http_requests(request, call_next):
    print(f"\n📨 Backend incoming request: {request.method} {request.url.path}", flush=True)
    response = await call_next(request)
    print(f"📤 Backend response: {response.status_code} {request.method} {request.url.path}", flush=True)
    return response

# ============================================================================
# MIDDLEWARE CONFIGURATION
# ============================================================================

# CORS Middleware
cors_origins = [origin.strip() for origin in settings.cors_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# ROUTE REGISTRATION
# ============================================================================

app.include_router(auth_router)
app.include_router(teacher_router)
app.include_router(student_router)
app.include_router(attendance_router)
app.include_router(enrollments_router)
app.include_router(timetable_router)


# ============================================================================
# ROOT ENDPOINTS
# ============================================================================

@app.get("/")
async def root():
    """
    Root endpoint - returns API status
    """
    return {
        "message": "College Attendance Management System API",
        "status": "running",
        "version": "1.0.0",
    }


@app.get("/health")
async def health_check():
    """
    Health check endpoint
    """
    from datetime import datetime
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "environment": settings.env,
        "db_available": DB_AVAILABLE,
        "db_error": DB_INIT_ERROR,
    }


# ============================================================================
# MAIN ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level="info",
    )