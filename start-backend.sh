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

ensure_local_mysql() {
    local mysql_port="${DB_PORT:-3307}"
    local mysql_data_dir="$SCRIPT_DIR/.localmysql/data"
    local mysql_run_dir="$SCRIPT_DIR/.localmysql/run"
    local mysql_log_dir="$SCRIPT_DIR/.localmysql/logs"
    local mysql_socket="$mysql_run_dir/mysql.sock"

    if ss -ltn 2>/dev/null | grep -q ":${mysql_port} "; then
        log_success "Local MySQL already listening on 127.0.0.1:${mysql_port}"
        return 0
    fi

    if [ ! -d "$mysql_data_dir" ]; then
        log_warning "Local MySQL data directory not found at $mysql_data_dir; skipping embedded DB startup"
        return 0
    fi

    mkdir -p "$mysql_run_dir" "$mysql_log_dir"
    rm -f "$mysql_run_dir/mysqld.pid"

    log_info "Starting local MySQL on 127.0.0.1:${mysql_port}..."
    nohup /usr/sbin/mysqld \
        --no-defaults \
        --datadir="$mysql_data_dir" \
        --socket="$mysql_socket" \
        --port="$mysql_port" \
        --bind-address=127.0.0.1 \
        --pid-file="$mysql_run_dir/mysqld.pid" \
        --log-error="$mysql_log_dir/error.log" \
        >/dev/null 2>&1 &

    local attempt
    for attempt in $(seq 1 20); do
        if mysql --protocol=TCP -h127.0.0.1 -P"$mysql_port" -u"${DB_USER}" -p"${DB_PASSWORD}" -e "SELECT 1" >/dev/null 2>&1; then
            log_success "Local MySQL is ready on 127.0.0.1:${mysql_port}"
            return 0
        fi
        sleep 1
    done

    log_error "Local MySQL failed to start on 127.0.0.1:${mysql_port}. Check $mysql_log_dir/error.log"
    exit 1
}

echo ""
echo "============================================================"
echo "  Backend - College Attendance Management System"
echo "============================================================"
echo ""

# Check prerequisites
log_info "Checking prerequisites..."

if ! command_exists uv; then
    log_error "uv is not installed. Please install uv"
    exit 1
fi

log_success "Prerequisites satisfied"

# Navigate to backend directory
cd "$BACKEND_DIR"

if [ ! -x ".venv/bin/python" ]; then
    log_error "backend/.venv is missing or invalid"
    log_info "Create it first, for example: uv venv backend/.venv"
    exit 1
fi

UV_PYTHON="$BACKEND_DIR/.venv/bin/python"
log_success "Using existing virtual environment: $UV_PYTHON"

# Check if key dependencies are installed
if ! "$UV_PYTHON" -c "import fastapi, uvicorn" >/dev/null 2>&1; then
    log_info "Installing backend dependencies..."
    uv pip install --python "$UV_PYTHON" -r requirements.txt
    log_success "Backend dependencies installed"
else
    log_success "Backend dependencies already installed"
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    log_error ".env file not found in backend/"
    log_info "Please create backend/.env with your configuration"
    log_info "You can copy from .env.example"
    exit 1
fi

log_success ".env file found"

set -a
source .env
set +a

ensure_local_mysql

# Stop any existing backend process on port 8000 before starting a new one
if command_exists lsof; then
    existing_pids="$(lsof -tiTCP:8000 -sTCP:LISTEN || true)"
    if [ -n "$existing_pids" ]; then
        log_warning "Stopping existing process(es) on port 8000: $existing_pids"
        kill $existing_pids || true
        sleep 2

        remaining_pids="$(lsof -tiTCP:8000 -sTCP:LISTEN || true)"
        if [ -n "$remaining_pids" ]; then
            log_warning "Force stopping remaining process(es) on port 8000: $remaining_pids"
            kill -9 $remaining_pids || true
            sleep 1
        fi

        if lsof -tiTCP:8000 -sTCP:LISTEN >/dev/null 2>&1; then
            log_error "Unable to free port 8000"
            exit 1
        fi

        log_success "Existing server stopped"
    fi
else
    log_warning "lsof not found; skipping automatic port cleanup"
fi

# Start backend server
echo ""
log_info "Starting backend server..."
log_info "API will be available at http://localhost:8000"
log_info "API docs available at http://localhost:8000/docs"
echo ""
echo "============================================================"
echo "  Press Ctrl+C to stop the server"
echo "============================================================"
echo ""

exec uv run --python "$UV_PYTHON" uvicorn main:app --host 0.0.0.0 --port 8000 --reload
