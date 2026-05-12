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

- Passwords are hashed before storage using secure libraries from the Python security stack.
- The database stores only the hash, never the raw password.

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

---

## Core Modules Explanation

### Authentication Module

| Aspect | Details |
|--------|---------|
| **Purpose** | Handles registration, login, Google OAuth, and current-user resolution. |
| **Technologies** | FastAPI, JWT, bcrypt, Google Auth, Pydantic. |

**Workflow:**

1. The user submits credentials or Google token.
2. The backend validates the request.
3. A JWT token is issued if authentication succeeds.
4. The client stores the token and reuses it for protected routes.

**Integration:** Used by every other module because all protected operations depend on the current user identity.

### Subject and Class Management Module

| Aspect | Details |
|--------|---------|
| **Purpose** | Creates and maintains subjects and class sections. |
| **Technologies** | FastAPI, SQLAlchemy, Pydantic. |

**Workflow:**

1. Teachers create subjects with name and code.
2. Teachers create classes tied to subjects.
3. Classes are linked to a teacher, year, and section.
4. Students later enroll in those classes.

**Key Features:**
- Subject isolation per teacher.
- Multi-section support for the same subject.
- Cascading delete on subject removal.

### Enrollment Module

| Aspect | Details |
|--------|---------|
| **Purpose** | Allows students to join classes through codes and supports teacher-side enrollment control. |
| **Technologies** | FastAPI, SQLAlchemy, JWT. |

**Workflow:**

1. A teacher creates an enrollment code for a class.
2. A student submits the code to join the class.
3. Teachers can also add or remove students manually.
4. Enrollment codes can be deactivated without losing history.

**Key Features:**
- Reusable and revocable enrollment codes.
- Manual enrollment override by teachers.
- Student self-service enrollment.

### Attendance Session Module

| Aspect | Details |
|--------|---------|
| **Purpose** | Manages lecture-specific attendance windows. |
| **Technologies** | FastAPI, SQLAlchemy, time-based expiry logic. |

**Workflow:**

1. A teacher starts a session for a class.
2. The backend creates attendance records for enrolled students.
3. The session can accept code, QR, or face-based submissions.
4. Teachers finalize the session when collection is complete.
5. Expired sessions auto-close to maintain consistency.

**Key Features:**
- Per-student record initialization.
- Multiple submission methods in one session.
- Flexible approval workflows.

### QR and Code Attendance Module

| Aspect | Details |
|--------|---------|
| **Purpose** | Supports low-friction attendance capture through numeric code or QR token. |
| **Technologies** | FastAPI, pyzbar (QR decoding), SQLAlchemy. |

**Workflow:**

1. The teacher generates a code or QR session.
2. The student scans or submits the value.
3. The backend checks expiry, enrollment, and session state.
4. The record is updated and may remain pending approval depending on dual-verification rules.

**Key Features:**
- Time-limited code validity.
- QR code generation and verification.
- Dual-verification support (code + face recognition).

### Face Recognition Module

| Aspect | Details |
|--------|---------|
| **Purpose** | Automates classroom attendance based on uploaded images. |
| **Technologies** | InsightFace (buffalo_l model), ONNX Runtime, OpenCV, SQLAlchemy. |

**Workflow:**

1. A teacher uploads a classroom image.
2. The backend forwards the image to the recognition layer (FaceModel).
3. Recognized faces are extracted with confidence scores.
4. Identities are mapped to enrolled students.
5. Attendance records are updated with face-detection results.

**Key Features:**
- Batch face detection in uploaded images.
- Confidence thresholding for recognition accuracy.
- Fallback to manual review for low-confidence matches.

### Timetable and Schedule Module

| Aspect | Details |
|--------|---------|
| **Purpose** | Provides weekly class visibility for teachers and students. |
| **Technologies** | FastAPI, SQLAlchemy. |

**Workflow:**

1. Teachers create timetable entries or schedules.
2. Subject colors are assigned for visual clarity.
3. Students fetch their weekly timetable from enrolled classes.
4. Timetable data is used for UI scheduling displays.

**Key Features:**
- Day-of-week and time-slot based scheduling.
- Visual color coding by subject.
- Student-accessible read-only view.

### Reporting and Audit Module

| Aspect | Details |
|--------|---------|
| **Purpose** | Provides transparency and traceability for system operations. |
| **Technologies** | SQLAlchemy, JSON metadata storage. |

**Workflow:**

1. Important actions (login, enrollment, approval, override) are logged as audit events.
2. Audit logs store event type, entity reference, user, and metadata.
3. Attendance reports aggregate records by class and subject.
4. Pending approvals are surfaced for teacher review.

**Key Features:**
- Immutable audit trail for compliance.
- Attendance percentage calculations per class.
- Pending submission tracking for dual-verification flows.
