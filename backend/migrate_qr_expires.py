"""
Migration script to add qr_expires_at column to attendance_sessions table
"""
import pymysql
from database import DB_USER, DB_PASSWORD, DB_HOST, DB_NAME

def run_migration():
    """Add qr_expires_at column and index"""
    try:
        # Connect to database
        conn = pymysql.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME
        )
        cursor = conn.cursor()
        
        # Check if qr_expires_at column exists
        cursor.execute("""
            SELECT COUNT(*) 
            FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = %s 
            AND TABLE_NAME = 'attendance_sessions' 
            AND COLUMN_NAME = 'qr_expires_at'
        """, (DB_NAME,))
        
        column_exists = cursor.fetchone()[0] > 0
        
        if not column_exists:
            # Add qr_expires_at column
            cursor.execute("""
                ALTER TABLE attendance_sessions 
                ADD COLUMN qr_expires_at DATETIME NULL 
                AFTER qr_code
            """)
            print("✓ Added qr_expires_at column")
        else:
            print("✓ qr_expires_at column already exists")
        
        # Check if index exists
        cursor.execute("""
            SHOW INDEX FROM attendance_sessions 
            WHERE Key_name = 'idx_qr_expires_at'
        """)
        exists = cursor.fetchone()
        
        if not exists:
            cursor.execute("""
                CREATE INDEX idx_qr_expires_at 
                ON attendance_sessions(qr_expires_at)
            """)
            print("✓ Created idx_qr_expires_at index")
        else:
            print("✓ Index idx_qr_expires_at already exists")
        
        conn.commit()
        print("\n✅ Migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        raise
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    run_migration()
