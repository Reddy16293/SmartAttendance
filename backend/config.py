"""
Configuration module for College Attendance System.
Loads settings from environment variables with sensible defaults.
"""

import os
from pydantic_settings import BaseSettings
from typing import List
from urllib.parse import quote_plus


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    """
    
    # Database
    db_user: str = "root"
    db_password: str = "password"
    db_host: str = "localhost"
    db_port: int = 3306
    db_name: str = "college_attendance"
    
    # JWT
    secret_key: str = "your-secret-key-change-in-production"
    access_token_expire_minutes: int = 30
    algorithm: str = "HS256"
    
    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    env: str = "development"
    debug: bool = True
    
    # Database logging
    sql_echo: bool = False
    
    # CORS
    cors_origins: str = "http://localhost:3000,http://localhost:5173,http://localhost:5174,http://localhost:8080,http://127.0.0.1:3000,http://127.0.0.1:5173,http://127.0.0.1:5174,http://127.0.0.1:8080,https://automated-attendance-system.vercel.app"
    
    # Face Recognition API
    face_api_endpoint: str = "http://localhost:5000/recognize"
    face_api_key: str = "your-face-api-key"

    # Cloudinary Storage
    cloudinary_url: str = ""
    
    # Google OAuth
    google_client_id: str = ""
    google_client_ids: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "https://automated-attendance-system.vercel.app/auth/google/callback"
    google_clock_skew_seconds: int = 10
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"
    
    @property
    def database_url(self) -> str:
        """Construct database URL"""
        env_database_url = os.getenv("DATABASE_URL", "").strip()
        if env_database_url:
            url = env_database_url
            if url.startswith("mysql://"):
                url = "mysql+pymysql://" + url[len("mysql://") :]
            return url
        return (
            f"mysql+pymysql://{quote_plus(self.db_user)}:{quote_plus(self.db_password)}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Get CORS origins as list"""
        return [origin.strip() for origin in self.cors_origins.split(",")]

    @property
    def google_client_ids_list(self) -> List[str]:
        """Return accepted Google OAuth client IDs (audiences)."""
        ids: List[str] = []

        if self.google_client_ids:
            ids.extend([item.strip() for item in self.google_client_ids.split(",") if item.strip()])

        if self.google_client_id and self.google_client_id.strip():
            ids.append(self.google_client_id.strip())

        # Remove duplicates while preserving order
        unique_ids: List[str] = []
        seen = set()
        for client_id in ids:
            if client_id not in seen:
                seen.add(client_id)
                unique_ids.append(client_id)
        return unique_ids
    
    @property
    def is_production(self) -> bool:
        """Check if running in production"""
        return self.env.lower() == "production"
    
    @property
    def is_development(self) -> bool:
        """Check if running in development"""
        return self.env.lower() == "development"


# Create settings instance
settings = Settings()

# Print startup info in development
if settings.is_development:
    print(f"[DB] Database: {settings.db_name}@{settings.db_host}:{settings.db_port}")
    print(f"[AUTH] JWT Secret: {'*' * len(settings.secret_key)}")
    print(f"[CORS] Origins: {len(settings.cors_origins_list)} configured")
    print(f"[ENV] Environment: {settings.env}")
