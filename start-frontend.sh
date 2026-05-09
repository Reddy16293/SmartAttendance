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

echo ""
echo "============================================================"
echo "  Frontend - College Attendance Management System"
echo "============================================================"
echo ""

# Check prerequisites
log_info "Checking prerequisites..."

if ! command_exists node; then
    log_error "node is not installed. Please install Node.js"
    exit 1
fi

if ! command_exists npm; then
    log_error "npm is not installed. Please install npm"
    exit 1
fi

log_success "Prerequisites satisfied"

# Navigate to frontend directory
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
echo ""
log_info "Starting frontend dev server..."
log_info "Frontend will be available at http://localhost:8080"
log_warning "Make sure backend is running at http://localhost:8000"
echo ""
echo "============================================================"
echo "  Press Ctrl+C to stop the server"
echo "============================================================"
echo ""

exec npm run dev
