#!/usr/bin/env python3
"""Debug script to check attendance codes in database."""

from database import SessionLocal
from models import AttendanceSession
from datetime import datetime

def main():
    db = SessionLocal()
    
    # Get all open sessions with codes
    sessions = db.query(AttendanceSession).filter(
        AttendanceSession.status == "open",
        AttendanceSession.attendance_code != None
    ).all()
    
    print(f"\n[DEBUG] Found {len(sessions)} open sessions with codes:\n")
    
    for session in sessions:
        expires_at = session.code_expires_at
        is_expired = expires_at < datetime.utcnow() if expires_at else False
        status = "EXPIRED" if is_expired else "VALID"
        
        print(f"Session {session.id}:")
        print(f"  Code: {session.attendance_code}")
        print(f"  Class: {session.class_id}")
        print(f"  Status: {session.status}")
        print(f"  Expires at: {expires_at}")
        print(f"  Code Status: {status}")
        print()
    
    db.close()

if __name__ == "__main__":
    main()
