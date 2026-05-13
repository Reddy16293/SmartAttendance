# Sequence Diagram: QR / Code Submission Mode
## Student Attendance Submission Flow

```mermaid
sequenceDiagram
    participant Professor
    participant Student
    participant Client
    participant AttendanceSystem
    participant MLService
    participant Database

    Professor->>Client: Start attendance session
    AttendanceSystem->>Database: Create session with QR/code
    Student->>Client: Submit QR code or attendance code
    Client->>AttendanceSystem: Send submission with JWT
    AttendanceSystem->>Database: Validate session and enrollment
    AttendanceSystem->>MLService: Optional face verification for the session
    MLService-->>AttendanceSystem: Recognition result
    AttendanceSystem->>Database: Save attendance record
    Professor->>Client: Review and finalize session
    Client->>AttendanceSystem: Finalize session request
    AttendanceSystem->>Database: Close session and store summary
```

## High-Level Notes

- The teacher creates an attendance session with QR/code options enabled.
- Students submit either the QR code or the attendance code through the client.
- The backend validates the submission, stores the attendance result, and the teacher finalizes the session afterward.
