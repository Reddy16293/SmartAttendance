-- Clear all class schedules
-- Use this to reset and test from scratch

DELETE FROM class_schedules;

-- Verify deletion
SELECT COUNT(*) as remaining_schedules FROM class_schedules;
