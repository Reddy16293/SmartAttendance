#!/bin/bash

# College Attendance Management System - Setup Script for Linux/Mac

echo ""
echo "========================================================="
echo "College Attendance Management System - Backend Setup"
echo "========================================================="
echo ""

# Check if Python is installed
if ! command -v python3.11 &> /dev/null; then
    echo "Error: Python 3.11+ is required but not installed."
    echo "Please install Python from https://www.python.org/"
    exit 1
fi

echo "[1/5] Creating virtual environment..."
python3.11 -m venv venv
if [ $? -ne 0 ]; then
    echo "Error: Failed to create virtual environment"
    exit 1
fi

echo "[2/5] Activating virtual environment..."
source venv/bin/activate

echo "[3/5] Upgrading pip..."
python -m pip install --upgrade pip

echo "[4/5] Installing dependencies..."
pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo "Error: Failed to install dependencies"
    exit 1
fi

echo "[5/5] Setting up environment variables..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "Created .env file - please update with your configuration"
else
    echo ".env file already exists"
fi

echo ""
echo "========================================================="
echo "Setup Complete!"
echo "========================================================="
echo ""
echo "Next steps:"
echo "1. Update .env file with your database credentials"
echo "2. Create MySQL database: CREATE DATABASE college_attendance;"
echo "3. Run the application: python main.py"
echo ""
echo "API will be available at: http://localhost:8000"
echo "Swagger UI: http://localhost:8000/docs"
echo ""
