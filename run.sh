#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

# Log functions
log_info() {
    echo -e "${BLUE}ℹ${NC}  $1"
}

log_success() {
    echo -e "${GREEN}✓${NC}  $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC}  $1"
}

log_error() {
    echo -e "${RED}✗${NC}  $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Cleanup function to kill background processes on exit
cleanup() {
    log_warning "Shutting down services..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
        log_info "Backend stopped"
    fi
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

echo ""
echo "============================================================"
echo "  College Attendance Management System - Development Setup"
echo "============================================================"
echo ""

# ============================================================================
# STEP 1: Check Prerequisites
# ============================================================================
log_info "Checking prerequisites..."

if ! command_exists python3; then
    log_error "python3 is not installed. Please install Python 3.11+"
    exit 1
fi

if ! command_exists pip3; then
    log_error "pip3 is not installed. Please install pip"
    exit 1
fi

if ! command_exists node; then
    log_error "node is not installed. Please install Node.js"
    exit 1
fi

if ! command_exists npm; then
    log_error "npm is not installed. Please install npm"
    exit 1
fi

log_success "All prerequisites satisfied"

# ============================================================================
# STEP 2: Backend Setup
# ============================================================================
log_info "Setting up backend..."

cd "$BACKEND_DIR"

# Create virtual environment if missing
if [ ! -d ".venv" ]; then
    log_info "Creating Python virtual environment..."
    python3 -m venv .venv
    log_success "Virtual environment created"
else
    log_success "Virtual environment exists"
fi

# Activate virtual environment
source .venv/bin/activate

# Check if dependencies are installed
if ! python -c "import fastapi" >/dev/null 2>&1; then
    log_info "Installing backend dependencies..."
    pip install -q --upgrade pip
    pip install -q -r requirements.txt
    log_success "Backend dependencies installed"
else
    log_success "Backend dependencies already installed"
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    log_warning ".env file not found in backend/"
    log_info "Please create backend/.env with your configuration"
    log_info "You can copy from .env.example"
    exit 1
fi

# Start backend server in background
log_info "Starting backend server..."
nohup uvicorn main:app --host 0.0.0.0 --port 8000 --reload > backend.log 2>&1 &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Check if backend is running
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    log_error "Backend failed to start. Check backend.log for details."
    cat backend.log
    exit 1
fi

log_success "Backend running on http://localhost:8000 (PID: $BACKEND_PID)"
log_info "Backend logs: $BACKEND_DIR/backend.log"
log_info "API docs available at http://localhost:8000/docs"

# ============================================================================
# STEP 3: Frontend Setup
# ============================================================================
log_info "Setting up frontend..."

cd "$FRONTEND_DIR"

# Install frontend dependencies if node_modules is missing
if [ ! -d "node_modules" ]; then
    log_info "Installing frontend dependencies..."
    npm install
    log_success "Frontend dependencies installed"
else
    log_success "Frontend dependencies already installed"
fi

# Start frontend dev server
log_info "Starting frontend dev server..."
echo ""
echo "============================================================"
log_success "Backend:  http://localhost:8000 (logs in backend/backend.log)"
log_success "Frontend: http://localhost:8080 (starting below...)"
echo "============================================================"
echo ""
log_info "Press Ctrl+C to stop all services"
echo ""

# Start frontend (this blocks and shows output)
exec npm run dev
