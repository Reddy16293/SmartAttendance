"""
Utility functions for roll number extraction and handling.
"""

def extract_roll_number_from_email(email: str) -> str:
    """
    Extract roll number from email address.
    
    Expected format: name_rollnumber@domain.com
    Example: chilekampalli_b220806cs@nitc.ac.in → b220806cs
    
    Args:
        email: Email address to extract from
        
    Returns:
        Roll number string (lowercase), or empty string if format doesn't match
    """
    try:
        # Get part before @
        email_prefix = email.split('@')[0]
        
        # Split by underscore and get the last part
        parts = email_prefix.split('_')
        
        if len(parts) >= 2:
            # Get everything after the first underscore
            roll_number = '_'.join(parts[1:]).lower()
            return roll_number
        
        return ""
    except Exception as e:
        print(f"Error extracting roll number from {email}: {e}")
        return ""


def validate_roll_number(roll_number: str) -> bool:
    """
    Validate roll number format.
    Expected format: letter(s) followed by digits, e.g., b220806cs
    
    Args:
        roll_number: Roll number to validate
        
    Returns:
        True if valid, False otherwise
    """
    if not roll_number or not isinstance(roll_number, str):
        return False
    
    # Remove underscores and check if it has letters and digits
    clean_roll = roll_number.replace('_', '')
    return len(clean_roll) >= 3 and any(c.isalpha() for c in clean_roll) and any(c.isdigit() for c in clean_roll)
