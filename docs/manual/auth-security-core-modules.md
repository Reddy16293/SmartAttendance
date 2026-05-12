# Authentication, Security, and Core Modules

## Authentication and Security

### Login System

The system supports two login paths:

- **Local authentication:** Email or roll number with password.
- **Google OAuth authentication:** Google ID token based sign-in for web and mobile flows.

### JWT / Session Authentication

- After successful login, the backend issues a JWT access token.
- The frontend stores the token and sends it on protected requests in the `Authorization` header.
- Tokens are validated on every protected request.
- The mobile app also uses a session timeout configured from Expo settings.

### Password Encryption

- Passwords are hashed before storage.
- The project uses secure password hashing libraries from the Python security stack.
- The database stores only the hash, not the raw password.

### Role-Based Access

- The backend distinguishes between `student` and `teacher` roles.
- Teacher-specific endpoints are restricted to faculty accounts.
- Student-specific endpoints are restricted to student accounts.
- Some shared endpoints accept both roles but apply data-level permission checks.

### Security Measures Implemented

- JWT bearer authentication.
- Role-based dependencies for teacher and student access.
- Google token validation.
- Domain-aware OAuth restrictions for institutional accounts.
- CORS policy configured from environment variables.
- ORM-based database access to reduce injection risk.
- Session expiry for QR and code-based attendance.
- Audit logging for traceability.
- Permission checks on class ownership before modifying records.

## Core Modules Explanation

### Authentication Module

**Purpose:**
Handles registration, login, Google OAuth, and current-user resolution.

**Workflow:**
1. The user submits credentials or Google token.
2. The backend validates the request.
3. A JWT token is issued if the authentication succeeds.
4. The client stores the token and reuses it for protected routes.

### Subject and Class Management Module

**Purpose:**
Creates and maintains subjects and class sections.

**Workflow:**
- Teachers create subjects.
- Teachers create classes tied to subjects.
- Classes are linked to a teacher, year, and section.
- Students later enroll in those classes.

### Enrollment Module

**Purpose:**
Allows students to join classes through codes and supports teacher-side enrollment control.

**Workflow:**
- A teacher creates an enrollment code.
- A student submits the code to join the class.
- Teachers can also add or remove students manually.

### Attendance Session Module

**Purpose:**
Manages lecture-specific attendance windows.

**Workflow:**
- A teacher starts a session for a class.
- The backend creates attendance records for enrolled students.
- The session can accept code, QR, or face-based submissions.
- Teachers finalize the session when collection is complete.

### QR and Code Attendance Module

**Purpose:**
Supports low-friction attendance capture through a numeric code or QR token.

**Workflow:**
- The teacher generates a code or QR session.
- The student scans or submits the value.
- The backend checks expiry, enrollment, and session state.
- The record is updated and may remain pending approval depending on dual-verification rules.

### Face Recognition Module

**Purpose:**
Automates classroom attendance based on uploaded images.

**Workflow:**
- A teacher uploads a classroom image.
- The backend forwards the image to the recognition layer.
- Recognized faces are mapped to enrolled students.
- The corresponding attendance records are updated.

### Timetable and Schedule Module

**Purpose:**
Provides weekly class visibility for teachers and students.

**Workflow:**
- Teachers create timetable entries or schedules.
- Subject colors are assigned for visual clarity.
- Students fetch their weekly timetable from enrolled classes.

### Reporting and Audit Module

**Purpose:**
Provides transparency and traceability.

**Workflow:**
- Important actions are logged as audit events.
- Attendance reports aggregate records by class and subject.
- Pending approvals are surfaced for teacher review.
