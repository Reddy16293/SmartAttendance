# API Documentation

## API Conventions

- Most protected endpoints expect `Authorization: Bearer <JWT>`.
- `teacher` and `student` are the backend role values. Some UI flows use the label `professor`, but the backend role remains `teacher`.
- Public endpoints do not require authentication.
- Several endpoints return plain JSON dictionaries rather than dedicated response schemas. Those responses are documented with representative payloads.
- Interactive api-documentation can be accessed when the backend server is running at `/docs`

---

## System Endpoints

| Endpoint | Method | Auth | Purpose | Request | Response |
|---|---|---|---|---|---|
| `/` | GET | Public | Returns API status. | None | `{"message":"College Attendance Management System API","status":"running","version":"1.0.0"}` |
| `/health` | GET | Public | Returns health and database availability. | None | `{"status":"healthy","timestamp":"...","environment":"development","db_available":true}` |

---

## Authentication APIs

| Endpoint | Method | Auth | Purpose | Request | Response |
|---|---|---|---|---|---|
| `/auth/register` | POST | Public | Registers a student or teacher and returns a JWT. | `{"name":"Asha","email":"asha@example.com","password":"StrongPass123","role":"student"}` | `201 TokenResponse: {"access_token":"...","token_type":"bearer","user":{...},"role_warning":null}` |
| `/auth/login` | POST | Public | Logs in using email or roll number plus password. | `{"identifier":"asha@example.com","password":"StrongPass123"}` | `{"access_token":"..."}` |
| `/auth/google` | POST | Public | Google OAuth login with domain validation. Creates a new user if one doesn't exist; only allows authorized email domains (e.g. `@nitc.ac.in`). | `{"id_token":"<google-id-token>","role":"teacher"}` | `TokenResponse with user profile and optional role_warning` |
| `/auth/me` | GET | JWT | Returns the current authenticated user. | None | `CurrentUserResponse: {"id":1,"name":"Asha","email":"asha@example.com","role":"student","created_at":"...","updated_at":"...","google_id":null}` |

---

## Teacher APIs: Subject Management

| Endpoint | Method | Auth | Purpose | Request | Response |
|---|---|---|---|---|---|
| `/teachers/subjects` | POST | Teacher | Creates a new subject. | `{"name":"Data Structures","code":"CS201"}` | `201 SubjectResponse: {"id":1,"name":"Data Structures","code":"CS201"}` |
| `/teachers/subjects` | GET | Teacher | Lists all subjects. | None | `[{"id":1,"name":"Data Structures","code":"CS201"}]` |
| `/teachers/subjects/{subject_id}` | GET | Teacher | Returns a subject by ID. | Path param only | `{"id":1,"name":"Data Structures","code":"CS201"}` |
| `/teachers/subjects/{subject_id}` | PATCH | Teacher | Updates name or code. | `{"name":"Advanced Data Structures"}` | Updated `SubjectResponse` |
| `/teachers/subjects/{subject_id}` | DELETE | Teacher | Deletes a subject and cascades related classes. | None | `{"success":true}` |

---

## Teacher APIs: Class Management

| Endpoint | Method | Auth | Purpose | Request | Response |
|---|---|---|---|---|---|
| `/teachers/classes` | POST | Teacher | Creates a new class (a section of a subject). | `{"subject_id":1,"teacher_id":2,"year":2,"section":"A"}` | `201 ClassResponse: {"id":1,"subject_id":1,"teacher_id":2,"year":2,"section":"A","created_at":"...","updated_at":"...","subject":{...}}` |
| `/teachers/classes` | GET | Teacher | Lists all classes taught by the current teacher. | None | `[{...flattened class with subject info...}]` |
| `/teachers/classes/{class_id}` | GET | Teacher | Returns details for a specific class. | Path param only | `ClassResponse` |
| `/teachers/classes/{class_id}` | DELETE | Teacher | Deletes a class. | None | `{"success":true}` |

---

## Teacher APIs: Student Enrollment in Classes

| Endpoint | Method | Auth | Purpose | Request | Response |
|---|---|---|---|---|---|
| `/teachers/classes/{class_id}/students` | GET | Teacher | Returns all students enrolled in the class. Uses JOIN to avoid N+1 queries. | Path param only | `[{"student_id":1,"name":"Asha","email":"asha@example.com","enrolled_at":"..."}]` |
| `/teachers/classes/{class_id}/students` | POST | Teacher | Manually adds a student to a class. | `{"student_id":5}` | `{"message":"Student added","class_id":1,"student_id":5}` |
| `/teachers/classes/{class_id}/students/{student_id}` | DELETE | Teacher | Removes (unenrolls) a student from a class. | Path params only | `{"message":"Student removed"}` |
| `/teachers/classes/students/batch` | POST | Teacher | Fetches students for multiple classes in a single call. Replaces N individual student-list calls. | `{"class_ids":[1,2,3]}` | `{"1":[...students...],"2":[...students...]}` |

---

## Teacher APIs: Attendance Sessions

| Endpoint | Method | Auth | Purpose | Request | Response |
|---|---|---|---|---|---|
| `/teachers/attendance/session/start` | POST | Teacher | Starts a new attendance session for a class. Generates a QR code if `qr_enabled` is true. | `{"class_id":1,"qr_enabled":false}` | `201 AttendanceSessionResponse` |
| `/teachers/attendance/session/{session_id}` | GET | Teacher | Returns details of an attendance session. | Path param only | `AttendanceSessionResponse` |
| `/teachers/classes/{class_id}/sessions` | GET | Teacher | Lists all attendance sessions for a class. | Path param only | `[AttendanceSessionResponse, ...]` |
| `/teachers/attendance/session/{session_id}/records` | GET | Teacher | Returns all attendance records for a session, including student details. | Path param only | `[TeacherAttendanceRecordResponse, ...]` |
| `/teachers/attendance/session/{session_id}/override` | PATCH | Teacher | Manually overrides a student's attendance status. Allowed even after finalization. | `{"student_id":3,"final_status":"present","reason":"Student was present but not detected"}` | `AttendanceRecordResponse` |
| `/teachers/attendance/session/{session_id}/finalize` | POST | Teacher | Finalizes a session, closing automated collection. Manual teacher overrides remain allowed after finalization. | Path param only | `{"message":"Session finalized","present":18,"absent":4}` |

---

## Teacher APIs: Schedules

| Endpoint | Method | Auth | Purpose | Request | Response |
|---|---|---|---|---|---|
| `/teachers/classes/{class_id}/schedules` | GET | Teacher | Returns all schedules for a class. | Path param only | `[ClassScheduleResponse, ...]` |
| `/teachers/classes/{class_id}/schedules` | POST | Teacher | Adds a schedule entry to a class. | `{"day_of_week":1,"start_time":"09:00","end_time":"10:00","room_number":"LH1"}` | `201 ClassScheduleResponse` |
| `/teachers/classes/{class_id}/schedules/{schedule_id}` | DELETE | Teacher | Deletes a schedule from a class. | Path params only | `{"success":true}` |

---

## Student APIs

| Endpoint | Method | Auth | Purpose | Request | Response |
|---|---|---|---|---|---|
| `/students/enroll` | POST | Student | Enrolls the current student in a class by `class_id`. | `{"class_id":1}` | `201 StudentEnrollmentResponse: {"id":1,"student_id":2,"class_id":1,"enrolled_at":"..."}` |
| `/students/enrollments` | GET | Student | Lists all classes the current student is enrolled in. | None | `[StudentEnrollmentResponse, ...]` |
| `/students/enroll/{class_id}` | DELETE | Student | Unenrolls the current student from a class. | Path param only | `{"message":"Unenrolled successfully"}` |
| `/students/attendance` | GET | Student | Returns the student's attendance report (percentage per subject and overall). | None | `StudentAttendanceResponse: {"student_id":1,"student_name":"Asha","attendance_by_subject":[...],"overall_percentage":87.5}` |

---

## Attendance Operations

### Session Management

| Endpoint | Method | Auth | Purpose | Request | Response |
|---|---|---|---|---|---|
| `/attendance/class/{class_id}/active-session` | GET | JWT | Returns active session details and remaining time for a class. | Path param only | `{"session_id":1,"class_id":2,"status":"active","remaining_seconds":540,...}` |
| `/attendance/classes/active-sessions/batch` | POST | JWT | Gets active sessions for multiple classes in one call. Replaces N individual active-session calls. | `{"class_ids":[1,2,3]}` | `{"1":{...session...},"2":null}` |
| `/attendance/session/create-with-code` | POST | Teacher | Creates a session with a 6-digit attendance code. | Query params: `class_id` (required), `face_recognition_enabled` (default `false`), `generate_code` (default `true`) | `AttendanceSessionResponse` |
| `/attendance/session/{session_id}/disconnect` | POST | JWT | Manually disconnects an active session before timeout. | Path param only | `AttendanceSessionResponse` |
| `/attendance/session/{session_id}` | DELETE | JWT | Deletes a session entirely so a new one can be created immediately. | Path param only | `{"message":"Session deleted"}` |

### QR Code

| Endpoint | Method | Auth | Purpose | Request | Response |
|---|---|---|---|---|---|
| `/attendance/session/generate-qr-code` | POST | Teacher | Generates a QR code valid for 3 minutes. | Query params: `class_id` (required), `face_recognition_enabled` (default `false`) | `QRCodeGenerateResponse: {"success":true,"session_id":1,"qr_code_data":"...","qr_code_image":"<base64 PNG>","expires_at":"..."}` |
| `/attendance/submit-qr-code` | POST | Student | Student submits decoded QR code data to mark attendance. | `{"qr_code_data":"<scanned data>"}` | `QRCodeUploadResponse: {"success":true,"message":"...","session_id":1,"record_id":4}` |
| `/attendance/upload-qr-image` | POST | Student | Student uploads an image containing a QR code; backend decodes it. | `multipart/form-data` with `image` field | `QRCodeUploadResponse` |
| `/attendance/session/{session_id}/verify` | POST | Student | Verifies a QR code against a specific session and updates the attendance record. | `{"qr_code":"<data>","student_id":3}` | `QRVerificationResponse: {"verified":true,"message":"...","attendance_record":{...}}` |

### Attendance Code

| Endpoint | Method | Auth | Purpose | Request | Response |
|---|---|---|---|---|---|
| `/attendance/submit-code` | POST | Student | Student submits a 6-digit attendance code. | `{"code":"482913"}` | `AttendanceCodeResponse: {"success":true,"message":"Attendance marked","session_id":1,"record_id":4}` |

### Face Recognition

| Endpoint | Method | Auth | Purpose | Request | Response |
|---|---|---|---|---|---|
| `/attendance/session/{session_id}/upload-image` | POST | Teacher | Uploads a classroom image; the backend calls the face recognition service, maps faces to enrolled students, and updates attendance records. | `multipart/form-data` with `image` field | `ImageUploadResponse: {"session_id":1,"recognized_students":[{"name":"Asha","confidence":0.97}],"updated_records":14,"image_with_boxes":"<base64>","original_image_url":"...","annotated_image_url":"..."}` |

### Records & Reports

| Endpoint | Method | Auth | Purpose | Request | Response |
|---|---|---|---|---|---|
| `/attendance/record/{record_id}` | GET | JWT | Returns a single attendance record. Students can only access their own; teachers can access their class records. | Path param only | `AttendanceRecordResponse` |
| `/attendance/session/{session_id}/records` | GET | JWT | Returns all attendance records for a session. | Path param only | `[AttendanceRecordResponse, ...]` |
| `/attendance/my-attendance` | GET | Student | Returns all attendance records for the current student across all enrolled classes. | None | `[{...record with class details...}]` |
| `/attendance/student/{student_id}/class/{class_id}` | GET | JWT | Returns attendance percentage for a specific student in a specific class. | Path params only | `{"student_id":1,"class_id":2,"percentage":85.0,"present":17,"total":20}` |

### Pending Approvals

| Endpoint | Method | Auth | Purpose | Request | Response |
|---|---|---|---|---|---|
| `/attendance/pending/code-submissions` | GET | Teacher | Returns all pending attendance submissions that require approval, limited to the teacher's own classes. | None | `[PendingAttendanceResponse, ...]` |
| `/attendance/approve-attendance` | POST | Teacher | Approves or rejects a pending attendance record. | `{"record_id":5,"action":"approve","reason":null}` | `{"message":"Attendance approved","record_id":5,"final_status":"present"}` |
| `/attendance/code-submissions/{record_id}/approve` | POST | Teacher | Approves a pending attendance record (alternative endpoint for frontend compatibility). | Path param only | `{"message":"Approved","record_id":5}` |
| `/attendance/code-submissions/{record_id}/reject` | POST | Teacher | Rejects a pending attendance record (alternative endpoint for frontend compatibility). | Path param only | `{"message":"Rejected","record_id":5}` |

---

## Enrollment APIs

### Enrollment Codes

| Endpoint | Method | Auth | Purpose | Request | Response |
|---|---|---|---|---|---|
| `/enrollments/codes` | POST | Teacher | Creates an enrollment code for a class. Optionally accepts a custom code; otherwise auto-generates one. | `{"class_id":1,"code":null}` | `201 EnrollmentCodeResponse: {"id":1,"class_id":1,"code":"XY9K2A","created_by":2,"is_active":true,"created_at":"...","updated_at":"..."}` |
| `/enrollments/codes/class/{class_id}` | GET | Teacher | Lists all enrollment codes for a class. | Path param only | `[EnrollmentCodeResponse, ...]` |
| `/enrollments/codes/batch` | POST | Teacher | Returns enrollment codes for multiple classes in one call. | `{"class_ids":[1,2,3]}` | `{"1":[...],"2":[...]}` |
| `/enrollments/codes/{code_id}` | DELETE | Teacher | Deactivates an enrollment code. Only the code's creator can deactivate it. | Path param only | `204 No Content` |
| `/enrollments/enroll` | POST | Student | Enrolls a student in a class using an enrollment code. | `{"code":"XY9K2A"}` | `201 {"message":"Enrolled","class_id":1,"class_name":"CS201 - Sec A"}` |
| `/enrollments/my-classes` | GET | Student | Returns all classes the student is enrolled in, including schedules and subject/teacher details. | None | `[EnrolledClassResponse, ...]` |

### Schedules

| Endpoint | Method | Auth | Purpose | Request | Response |
|---|---|---|---|---|---|
| `/enrollments/schedules` | POST | Teacher | Creates a schedule entry for a class. | Query param: `class_id`. Body: `{"day_of_week":1,"start_time":"09:00","end_time":"10:00","room_number":"LH1"}` | `201 ClassScheduleResponse` |
| `/enrollments/schedules/class/{class_id}` | GET | Public | Returns all schedules for a class. | Path param only | `[ClassScheduleResponse, ...]` |
| `/enrollments/schedules/batch` | POST | Public | Returns schedules for multiple classes in one call. | `{"class_ids":[1,2,3]}` | `{"1":[...],"2":[...]}` |
| `/enrollments/schedules/{schedule_id}` | PUT | Teacher | Updates a schedule entry. | `{"day_of_week":2,"start_time":"10:00","end_time":"11:00","room_number":"LH2"}` | `ClassScheduleResponse` |
| `/enrollments/schedules/{schedule_id}` | DELETE | Teacher | Deletes a schedule entry. | Path param only | `204 No Content` |

---

## Timetable APIs

| Endpoint | Method | Auth | Purpose | Request | Response |
|---|---|---|---|---|---|
| `/timetable/add` | POST | Teacher | Adds a timetable entry for a class. | `{"class_id":1,"day_of_week":0,"start_time":"09:00:00","end_time":"10:00:00","room_number":"LH1"}` | `TimetableResponse` |
| `/timetable/{timetable_id}` | PUT | Teacher | Updates a timetable entry. Only the teacher who teaches the class can update. | `{"start_time":"10:00:00","end_time":"11:00:00","room_number":"LH2"}` | `TimetableResponse` |
| `/timetable/{timetable_id}` | DELETE | Teacher | Deletes a timetable entry. | Path param only | `{"message":"Deleted"}` |
| `/timetable/class/{class_id}` | GET | JWT | Returns the full timetable for a class, including subject and teacher info. | Path param only | `[TimetableWithClassInfo, ...]` |
| `/timetable/student/my-timetable` | GET | Student | Returns the timetable for all classes the current student is enrolled in. | None | `[TimetableWithClassInfo, ...]` |
| `/timetable/colors/assign` | POST | Admin | Assigns a hex color to a subject for timetable display. | `{"subject_id":1,"color_code":"#3B82F6","text_color":"#FFFFFF"}` | `SubjectColorResponse: {"id":1,"subject_id":1,"color_code":"#3B82F6","text_color":"#FFFFFF","created_at":"..."}` |
| `/timetable/colors/{subject_id}` | GET | Public | Returns the color assigned to a subject. | Path param only | `SubjectColorResponse` |

---

## Response Schemas Reference

### AttendanceStatus (enum)
`present` | `absent` | `manual_review` | `pending_approval`

### UserRole (enum)
`student` | `teacher`

### AttendanceSessionResponse (key fields)
```json
{
  "id": 1,
  "class_id": 2,
  "date": "2025-09-01T09:00:00",
  "qr_enabled": false,
  "qr_code": null,
  "qr_expires_at": null,
  "attendance_code": "482913",
  "code_expires_at": "2025-09-01T09:15:00",
  "status": "active",
  "created_at": "...",
  "updated_at": "...",
  "original_image": null,
  "annotated_image": null
}
```

### AttendanceRecordResponse (key fields)
```json
{
  "id": 1,
  "session_id": 3,
  "student_id": 7,
  "face_detected": true,
  "qr_verified": false,
  "confidence": 0.96,
  "final_status": "present",
  "overridden_by_teacher": false,
  "override_reason": null,
  "created_at": "...",
  "updated_at": "..."
}
```

### TimetableWithClassInfo (key fields)
```json
{
  "id": 1,
  "class_id": 2,
  "day_of_week": 1,
  "start_time": "09:00:00",
  "end_time": "10:00:00",
  "room_number": "LH1",
  "subject_name": "Data Structures",
  "subject_code": "CS201",
  "subject_color": "#3B82F6",
  "text_color": "#FFFFFF",
  "teacher_name": "Dr. Mehta",
  "year": 2,
  "section": "A"
}
```
