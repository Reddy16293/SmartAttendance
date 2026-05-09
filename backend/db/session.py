"""
Database session dependency for FastAPI routes.
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy.orm import Session

from database import SessionLocal


@asynccontextmanager
async def async_session() -> AsyncGenerator[Session, None]:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


async def get_db() -> AsyncGenerator[Session, None]:
    async with async_session() as session:
        yield session
