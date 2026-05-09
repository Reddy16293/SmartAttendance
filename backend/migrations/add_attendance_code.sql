-- Migration script to add attendance code columns to attendance_sessions table
-- Run this script to update the database schema

USE college_attendance;

-- Add attendance_code column
ALTER TABLE attendance_sessions 
ADD COLUMN attendance_code VARCHAR(10) NULL AFTER qr_code,
ADD INDEX idx_attendance_code (attendance_code);

-- Add code_expires_at column
ALTER TABLE attendance_sessions 
ADD COLUMN code_expires_at DATETIME NULL AFTER attendance_code;

-- Verify the changes
DESCRIBE attendance_sessions;

-- Test query to ensure everything works
SELECT id, class_id, date, attendance_code, code_expires_at, status 
FROM attendance_sessions 
LIMIT 5;
