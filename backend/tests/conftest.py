import sys
import pytest
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker, Session
from fastapi.testclient import TestClient

import database as db_mod
from database import Base, get_db

# Ensure models are registered before creating tables
import models  # noqa: F401

# Shared in-memory SQLite across threads/tests
engine = create_engine(
	"sqlite+pysqlite:///:memory:",
	connect_args={"check_same_thread": False},
	poolclass=StaticPool,
)

# Use the same engine/sessionmaker everywhere
TestingSessionLocal: sessionmaker = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db_mod.engine = engine
db_mod.SessionLocal = TestingSessionLocal

# Create tables once
Base.metadata.create_all(bind=engine)

# Import app after wiring DB
from main import app  # noqa: E402


@pytest.fixture(scope="function")
def db_session() -> Session:
	# Per-test transaction on the shared connection
	connection = engine.connect()
	trans = connection.begin()

	local_sessionmaker = sessionmaker(autocommit=False, autoflush=False, bind=connection)
	sys.modules[__name__].TestingSessionLocal = local_sessionmaker
	db_mod.SessionLocal = local_sessionmaker

	session = local_sessionmaker()
	try:
		yield session
	finally:
		session.close()
		# Be resilient if the app lifespan already closed connections
		try:
			trans.rollback()
		except Exception:
			pass
		try:
			connection.close()
		except Exception:
			pass


@pytest.fixture(scope="function")
def client(db_session: Session):
	def override_get_db():
		try:
			yield db_session
		finally:
			pass

	app.dependency_overrides[get_db] = override_get_db
	with TestClient(app) as c:
		yield c
	app.dependency_overrides.clear()

