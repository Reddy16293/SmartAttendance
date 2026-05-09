"""
Quick migration script to add roll_number column to users table
"""

from database import engine
import sqlalchemy as sa

def run_migration():
    """Add roll_number column if it doesn't exist"""
    with engine.connect() as conn:
        # Check if column already exists
        inspector = sa.inspect(engine)
        columns = [col['name'] for col in inspector.get_columns('users')]
        
        if 'roll_number' not in columns:
            print("✅ Adding roll_number column to users table...")
            conn.execute(sa.text("ALTER TABLE users ADD COLUMN roll_number VARCHAR(50) UNIQUE"))
            conn.execute(sa.text("CREATE INDEX idx_roll_number ON users(roll_number)"))
            conn.commit()
            print("✅ Migration completed successfully!")
        else:
            print("ℹ️  roll_number column already exists")

if __name__ == "__main__":
    run_migration()
