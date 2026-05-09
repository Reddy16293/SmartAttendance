"""
Google OAuth utilities for College Attendance System.
Handles Google ID token verification and user info extraction.
"""

from typing import Dict, Any
from google.oauth2 import id_token
from google.auth.transport import requests
from config import settings


def verify_google_id_token(token: str) -> Dict[str, Any]:
    """
    Verify Google ID token and extract user information.
    
    This function:
    1. Verifies the token signature using Google's public certificates
    2. Validates the token hasn't expired
    3. Checks the audience (client ID) matches our application
    4. Extracts user information (sub, email, name, picture)
    
    Args:
        token: Google ID token from frontend
        
    Returns:
        Dictionary with user info:
        {
            "sub": "google_user_id",
            "email": "user@example.com",
            "name": "User Name",
            "picture": "https://...",
            "email_verified": True
        }
        
    Raises:
        ValueError: If token is invalid, expired, or audience doesn't match
    """
    try:
        audiences = settings.google_client_ids_list
        if not audiences:
            raise ValueError("Google OAuth client ID is not configured")

        # Verify token and get claims
        idinfo = id_token.verify_oauth2_token(
            token,
            requests.Request(),
            audiences,
            clock_skew_in_seconds=settings.google_clock_skew_seconds,
        )
        
        # Verify the issuer
        if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
            raise ValueError('Invalid token issuer')
        
        # Verify email is present and verified
        if not idinfo.get('email'):
            raise ValueError('Email not provided by Google')
        
        if not idinfo.get('email_verified', False):
            raise ValueError('Email not verified by Google')
        
        # Extract name with proper fallback
        name = idinfo.get('name', '').strip() if idinfo.get('name') else ''
        
        print(f"📋 Raw Google token - name field: '{idinfo.get('name')}', extracted name: '{name}'")
        
        return {
            "sub": idinfo['sub'],
            "email": idinfo['email'],
            "name": name,
            "picture": idinfo.get('picture', ''),
            "email_verified": idinfo.get('email_verified', False),
        }
        
    except Exception as e:
        print(f"❌ Google token verification error: {str(e)}")
        raise ValueError(f"Invalid Google ID token: {str(e)}")
