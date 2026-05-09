@echo off
REM College Attendance Management System - Setup Script for Windows

echo.
echo =========================================================
echo College Attendance Management System - Backend Setup
echo =========================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python 3.9+ is required but not installed.
    echo Please install Python from https://www.python.org/
    pause
    exit /b 1
)

echo [1/5] Creating virtual environment...
python -m venv venv
if errorlevel 1 (
    echo Error: Failed to create virtual environment
    pause
    exit /b 1
)

echo [2/5] Activating virtual environment...
call venv\Scripts\activate.bat

echo [3/5] Upgrading pip...
python -m pip install --upgrade pip

echo [4/5] Installing dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo Error: Failed to install dependencies
    pause
    exit /b 1
)

echo [5/5] Setting up environment variables...
if not exist .env (
    copy .env.example .env
    echo Created .env file - please update with your configuration
) else (
    echo .env file already exists
)

echo.
echo =========================================================
echo Setup Complete!
echo =========================================================
echo.
echo Next steps:
echo 1. Update .env file with your database credentials
echo 2. Create MySQL database: CREATE DATABASE college_attendance;
echo 3. Run the application: python main.py
echo.
echo API will be available at: http://localhost:8000
echo Swagger UI: http://localhost:8000/docs
echo.
pause
