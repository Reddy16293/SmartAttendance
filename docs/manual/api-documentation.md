# API Documentation

## API Documentation

### API Conventions

- Most protected endpoints expect `Authorization: Bearer <JWT>`.
- `teacher` and `student` are the backend role values. Some UI flows use the label `professor`, but the backend role remains `teacher`.
- Public endpoints do not require authentication.
- Several endpoints return plain JSON dictionaries rather than dedicated response schemas. Those responses are documented with representative payloads.

### System Endpoints

| Endpoint | Method | Auth | Purpose | Request | Response |
|---|---|---|---|---|---|
| `/` | GET | Public | Returns API status. | None | `{"message":"College Attendance Management System API","status":"running","version":"1.0.0"}` |
| `/health` | GET | Public | Returns health and database availability. | None | `{"status":"healthy","timestamp":"...","environment":"development","db_available":true}` |

### Authentication APIs

| Endpoint | Method | Auth | Purpose | Request | Response |
|---|---|---|---|---|---|
| `/auth/register` | POST | Public | Registers a student or teacher and returns a JWT. | `{"name":"Asha","email":"asha@example.com","password":"StrongPass123","role":"student"}` | `201 TokenResponse: {"access_token":"...","token_type":"bearer","user":{...},"role_warning":null}` |
| `/auth/login` | POST | Public | Logs in using email or roll number plus password. | `{"identifier":"asha@example.com","password":"StrongPass123"}` | `{"access_token":"..."}` |
| `/auth/google` | POST | Public | Google OAuth login with domain validation. | `{"id_token":"<google-id-token>","role":"teacher"}` | `TokenResponse with user profile and optional role_warning` |
| `/auth/me` | GET | JWT | Returns the current authenticated user. | None | `CurrentUserResponse: {"id":1,"name":"Asha","email":"asha@example.com","role":"student"}` |
| `/auth/mobile/google` | POST | Public | Mobile Google login for the Expo app. | `{"id_token":"<google-id-token>"}` | `{"access_token":"...","user":{"name":"...","email":"...","picture":"..."}}` |

### Teacher APIs: Subject Management

| Endpoint | Method | Auth | Purpose | Request | Response |
|---|---|---|---|---|---|
| `/teachers/subjects` | POST | Teacher | Creates a new subject. | `{"name":"Data Structures","code":"CS201"}` | `201 SubjectResponse` |
| `/teachers/subjects` | GET | Teacher | Lists all subjects. | None | `[{"id":1,"name":"Data Structures","code":"CS201"}]` |
| `/teachers/subjects/{subject_id}` | GET | Teacher | Returns a subject by ID. | Path parameter only | `{"id":1,"name":"Data Structures","code":"CS201"}` |
| `/teachers/subjects/{subject_id}` | PATCH | Teacher | Updates name or code. | `{"name":"Advanced Data Structures"}` | Updated subject object |
| `/teachers/subjects/{subject_id}` | DELETE | Teacher | Deletes a subject and cascades related classes. | None | `{"success":true}` |
