-- Add roll_number column to users table
-- This column stores the student enrollment number extracted from email
-- Example: b220806cs from chilekampalli_b220806cs@nitc.ac.in

ALTER TABLE users ADD COLUMN roll_number VARCHAR(50) UNIQUE;
CREATE INDEX idx_roll_number ON users(roll_number);
