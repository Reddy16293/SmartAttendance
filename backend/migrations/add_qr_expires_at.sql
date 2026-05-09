-- Migration: Add qr_expires_at column to attendance_sessions table
-- This field stores the expiration time for QR codes (3 minutes after generation)

USE college_attendance_db;

-- Add qr_expires_at column if it doesn't exist
ALTER TABLE attendance_sessions 
ADD COLUMN IF NOT EXISTS qr_expires_at DATETIME NULL 
AFTER qr_code;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_qr_expires_at 
ON attendance_sessions(qr_expires_at);

-- Show the updated table structure
DESCRIBE attendance_sessions;
