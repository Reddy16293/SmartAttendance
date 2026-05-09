"""
Migration script to add face_recognition_enabled column to attendance_sessions table.
This column tracks whether dual verification (face + code/QR) is required for the session.
"""

import pymysql
from config import settings

def run_migration():
    """Add face_recognition_enabled column to attendance_sessions table."""
    try:
        # Connect to database
        connection = pymysql.connect(
            host=settings.DATABASE_HOST,
            user=settings.DATABASE_USER,
            password=settings.DATABASE_PASSWORD,
            database=settings.DATABASE_NAME,
            port=settings.DATABASE_PORT,
        )
        
        cursor = connection.cursor()
        
        # Check if column already exists
        cursor.execute("""
            SELECT COUNT(*) 
            FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = %s 
            AND TABLE_NAME = 'attendance_sessions' 
            AND COLUMN_NAME = 'face_recognition_enabled'
        """, (settings.DATABASE_NAME,))
        
        exists = cursor.fetchone()[0]
        
        if exists:
            print("✓ Column 'face_recognition_enabled' already exists in attendance_sessions table")
            cursor.close()
            connection.close()
            return
        
        # Add the column
        print("Adding 'face_recognition_enabled' column to attendance_sessions table...")
        cursor.execute("""
            ALTER TABLE attendance_sessions 
            ADD COLUMN face_recognition_enabled BOOLEAN DEFAULT FALSE AFTER code_expires_at
        """)
        
        connection.commit()
        print("✓ Successfully added 'face_recognition_enabled' column")
        
        # Verify the column was added
        cursor.execute("""
            SELECT COUNT(*) 
            FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = %s 
            AND TABLE_NAME = 'attendance_sessions' 
            AND COLUMN_NAME = 'face_recognition_enabled'
        """, (settings.DATABASE_NAME,))
        
        if cursor.fetchone()[0] == 1:
            print("✓ Migration verified successfully")
        else:
            print("✗ Migration verification failed")
        
        cursor.close()
        connection.close()
        
    except Exception as e:
        print(f"✗ Migration failed: {e}")
        raise

if __name__ == "__main__":
    print("=" * 60)
    print("Running migration: Add face_recognition_enabled column")
    print("=" * 60)
    run_migration()
    print("=" * 60)
    print("Migration complete!")
    print("=" * 60)
