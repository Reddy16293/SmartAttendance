# Architecture Diagrams, Performance, and References

## Architecture Diagrams

The project already includes an architecture notes file at `architecture_diagrams.md`.

- High-level system architecture diagram.
- Backend router and service flow diagram.
- Attendance lifecycle sequence diagram.
- ER diagram for the database schema.
- Face recognition processing flow diagram.

## Performance Optimizations

- Batch endpoints were introduced for active sessions, students, enrollment codes, and schedules.
- Joined ORM loading is used in student list endpoints to avoid N+1 queries.
- Attendance records are created once at session start instead of on every submission.
- Expired sessions are auto-closed to reduce inconsistent state.
- Subject color data is reused for UI consistency.
- The schema uses indexed foreign keys for common query paths.
- Uploaded classroom images are persisted separately from recognition results.

## References

- FastAPI documentation: https://fastapi.tiangolo.com/
- SQLAlchemy documentation: https://docs.sqlalchemy.org/
- Pydantic documentation: https://docs.pydantic.dev/
- React documentation: https://react.dev/
- React Native and Expo documentation: https://docs.expo.dev/
- MySQL documentation: https://dev.mysql.com/doc/
- Google OAuth documentation: https://developers.google.com/identity
- Alembic documentation: https://alembic.sqlalchemy.org/
- InsightFace project: https://github.com/deepinsight/insightface
- ONNX Runtime documentation: https://onnxruntime.ai/
- OpenCV documentation: https://opencv.org/
