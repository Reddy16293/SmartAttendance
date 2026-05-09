"""
Color management utilities for timetable subjects.
Ensures unique colors with good contrast for visibility.
"""

# Predefined palette of distinct colors with good contrast
COLOR_PALETTE = [
    {"bg": "#FF6B6B", "text": "#FFFFFF"},  # Red
    {"bg": "#4ECDC4", "text": "#FFFFFF"},  # Teal
    {"bg": "#FFD93D", "text": "#000000"},  # Yellow
    {"bg": "#6BCB77", "text": "#FFFFFF"},  # Green
    {"bg": "#4D96FF", "text": "#FFFFFF"},  # Blue
    {"bg": "#FF6B9D", "text": "#FFFFFF"},  # Pink
    {"bg": "#FF8C42", "text": "#FFFFFF"},  # Orange
    {"bg": "#95E1D3", "text": "#000000"},  # Mint
    {"bg": "#9D84B7", "text": "#FFFFFF"},  # Purple
    {"bg": "#FF5733", "text": "#FFFFFF"},  # Vibrant Red
    {"bg": "#00D4D4", "text": "#000000"},  # Cyan
    {"bg": "#FFB703", "text": "#000000"},  # Amber
    {"bg": "#8ECAE6", "text": "#000000"},  # Light Blue
    {"bg": "#FB5607", "text": "#FFFFFF"},  # Orange Red
    {"bg": "#219EBC", "text": "#FFFFFF"},  # Sea Blue
    {"bg": "#76B041", "text": "#FFFFFF"},  # Olive Green
]


def get_next_color(used_colors: list) -> dict:
    """
    Get next available color from palette.
    
    Args:
        used_colors: List of already used color codes
        
    Returns:
        Dictionary with 'bg' (background color) and 'text' (text color)
    """
    for color in COLOR_PALETTE:
        if color["bg"] not in used_colors:
            return color
    
    # If all colors used, return first one (shouldn't happen in normal cases)
    return COLOR_PALETTE[0]


def validate_hex_color(color_code: str) -> bool:
    """
    Validate hex color code format.
    
    Args:
        color_code: Color code like #FF5733
        
    Returns:
        True if valid, False otherwise
    """
    import re
    return bool(re.match(r"^#[0-9A-Fa-f]{6}$", color_code))


def get_contrast_text_color(bg_color: str) -> str:
    """
    Determine if text should be light or dark based on background color luminance.
    
    Args:
        bg_color: Background color in hex format
        
    Returns:
        #FFFFFF for light text (white), #000000 for dark text (black)
    """
    # Remove # and convert to RGB
    hex_color = bg_color.lstrip("#")
    r, g, b = int(hex_color[0:2], 16), int(hex_color[2:4], 16), int(hex_color[4:6], 16)
    
    # Calculate luminance using relative luminance formula
    luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    
    # Return white text for dark backgrounds, black text for light backgrounds
    return "#FFFFFF" if luminance < 0.5 else "#000000"
