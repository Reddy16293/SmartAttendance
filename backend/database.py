"""
Database configuration and session management for College Attendance System
Using MySQL with SQLAlchemy ORM
"""

import os
from typing import Generator
from urllib.parse import parse_qsl, quote_plus, unquote, urlencode, urlparse, urlunparse

from dotenv import load_dotenv
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from sqlalchemy.pool import NullPool
from sqlalchemy.exc import OperationalError

# Load environment variables from .env if present
load_dotenv()


def _normalize_database_url(raw_url: str) -> tuple[str, bool]:
    """
    Normalize external DB URLs for SQLAlchemy + PyMySQL.

    - Converts mysql:// -> mysql+pymysql://
    - Handles Aiven style ssl-mode=REQUIRED by enabling TLS via connect_args
    """
    parsed = urlparse(raw_url)

    scheme = parsed.scheme
    if scheme == "mysql":
        scheme = "mysql+pymysql"

    use_tls = False
    cleaned_query_params = []
    for key, value in parse_qsl(parsed.query, keep_blank_values=True):
        normalized_key = key.lower().replace("-", "_")
        if normalized_key == "ssl_mode":
            if value.upper() == "REQUIRED":
                use_tls = True
            # Remove ssl-mode from URL because PyMySQL does not accept it directly.
            continue
        cleaned_query_params.append((key, value))

    normalized_query = urlencode(cleaned_query_params)
    normalized_url = urlunparse(
        (
            scheme,
            parsed.netloc,
            parsed.path,
            parsed.params,
            normalized_query,
            parsed.fragment,
        )
    )
    return normalized_url, use_tls

# Database configuration
DATABASE_URL_RAW = os.getenv("DATABASE_URL", "").strip()

DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "Clcr@123")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME", "college_attendance")

connect_args = {}
if DATABASE_URL_RAW:
    SQLALCHEMY_DATABASE_URL, tls_required = _normalize_database_url(DATABASE_URL_RAW)
    parsed_db_url = urlparse(DATABASE_URL_RAW)

    # Keep these values in sync for scripts that import DB_* directly.
    DB_USER = unquote(parsed_db_url.username) if parsed_db_url.username else DB_USER
    DB_PASSWORD = unquote(parsed_db_url.password) if parsed_db_url.password else DB_PASSWORD
    DB_HOST = parsed_db_url.hostname or DB_HOST
    DB_PORT = str(parsed_db_url.port) if parsed_db_url.port else DB_PORT
    DB_NAME = parsed_db_url.path.lstrip("/") if parsed_db_url.path else DB_NAME

    if tls_required:
        # Empty dict enables TLS handshake in PyMySQL for managed DBs like Aiven.
        connect_args["ssl"] = {}
else:
    # Build URL from split env vars when DATABASE_URL is not provided.
    SQLALCHEMY_DATABASE_URL = (
        f"mysql+pymysql://{quote_plus(DB_USER)}:{quote_plus(DB_PASSWORD)}"
        f"@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )

# Create engine with proper configuration for production
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    echo=os.getenv("SQL_ECHO", "false").lower() == "true",  # Log SQL queries in dev
    pool_size=10,  # Number of connections to maintain
    max_overflow=20,  # Additional connections for overflow
    pool_pre_ping=True,  # Verify connections before using them
    pool_recycle=3600,  # Recycle connections after 1 hour to avoid MySQL timeout
    connect_args=connect_args,
)

# Create SessionLocal for dependency injection
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False,
)

# Base class for all ORM models
Base = declarative_base()


def _build_local_mysql_url() -> str:
    """Build a localhost MySQL URL for fallback usage."""
    local_user = os.getenv("LOCAL_DB_USER", os.getenv("DB_USER", "root"))
    local_password = os.getenv("LOCAL_DB_PASSWORD", os.getenv("DB_PASSWORD", "password"))
    local_host = os.getenv("LOCAL_DB_HOST", "localhost")
    local_port = os.getenv("LOCAL_DB_PORT", "3306")
    local_name = os.getenv("LOCAL_DB_NAME", "college_attendance")

    return (
        f"mysql+pymysql://{quote_plus(local_user)}:{quote_plus(local_password)}"
        f"@{local_host}:{local_port}/{local_name}"
    )


def _build_mysql_url(user: str, password: str, host: str, port: str, db_name: str) -> str:
    """Build MySQL URL from explicit parts."""
    return (
        f"mysql+pymysql://{quote_plus(user)}:{quote_plus(password)}"
        f"@{host}:{port}/{db_name}"
    )


def _local_fallback_candidates() -> list[tuple[str, str, str]]:
    """
    Return candidate local DB connection settings as (label, url, host_port_db).
    Order is intentional: explicit LOCAL_* first, then DB_*, then common root fallback.
    """
    host = os.getenv("LOCAL_DB_HOST", os.getenv("DB_HOST", "localhost"))
    port = os.getenv("LOCAL_DB_PORT", os.getenv("DB_PORT", "3306"))
    db_name = os.getenv("LOCAL_DB_NAME", os.getenv("DB_NAME", "college_attendance"))

    candidates: list[tuple[str, str, str]] = []

    # 1) Explicit LOCAL_DB_* if present
    local_user = os.getenv("LOCAL_DB_USER")
    local_password = os.getenv("LOCAL_DB_PASSWORD")
    if local_user is not None and local_password is not None:
        url = _build_mysql_url(local_user, local_password, host, port, db_name)
        candidates.append(("LOCAL_DB_*", url, f"{host}:{port}/{db_name}"))

    # 2) Generic DB_* split vars
    db_user = os.getenv("DB_USER", "root")
    db_password = os.getenv("DB_PASSWORD", "")
    url = _build_mysql_url(db_user, db_password, host, port, db_name)
    candidates.append(("DB_*", url, f"{host}:{port}/{db_name}"))

    # 3) Common local root with empty password (XAMPP/WAMP default)
    root_empty_url = _build_mysql_url("root", "", host, port, db_name)
    candidates.append(("root-empty-password", root_empty_url, f"{host}:{port}/{db_name}"))

    # Remove duplicate URLs while preserving order
    unique: list[tuple[str, str, str]] = []
    seen_urls = set()
    for item in candidates:
        if item[1] not in seen_urls:
            seen_urls.add(item[1])
            unique.append(item)
    return unique


def _switch_engine(new_url: str, new_connect_args: dict | None = None) -> None:
    """Switch global engine/sessionmaker at runtime."""
    global engine, SessionLocal

    engine.dispose()
    engine = create_engine(
        new_url,
        echo=os.getenv("SQL_ECHO", "false").lower() == "true",
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,
        pool_recycle=3600,
        connect_args=new_connect_args or {},
    )
    SessionLocal = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=engine,
        expire_on_commit=False,
    )


def get_db() -> Generator[Session, None, None]:
    """
    Dependency injection function for database sessions.
    Yields a new database session and closes it after the request.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Initialize database by creating all tables.
    Called on application startup.
    """
    # Import all models to register them with Base
    import models  # noqa: F401
    
    # Create all tables (primary DB first)
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables initialized successfully!")
        return
    except OperationalError as primary_error:
        print(f"❌ Primary DB connection failed: {primary_error}")

    # Fallback to localhost MySQL when primary DB is unreachable.
    last_error = None
    for label, local_url, target in _local_fallback_candidates():
        print(f"⚠️ Falling back to local MySQL ({label}): {target}")
        try:
            _switch_engine(local_url, new_connect_args={})
            Base.metadata.create_all(bind=engine)
            print(f"✅ Database tables initialized successfully on localhost fallback ({label})!")
            return
        except OperationalError as fallback_error:
            last_error = fallback_error
            print(f"❌ Localhost fallback DB connection failed ({label}): {fallback_error}")

    if last_error is not None:
        raise last_error


def close_db():
    """
    Close database connections on application shutdown.
    """
    engine.dispose()
    print("🔌 Database connections closed!")
