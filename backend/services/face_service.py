"""
Face recognition service interface.
This is a placeholder for integration with external ML services.

In production, this would:
1. Call an external face recognition API/service
2. Return recognized student names and confidence scores
3. Be independent of the database
"""

import os
import httpx
from typing import List, Dict, Any
import logging
from schemas import FaceRecognitionResult

logger = logging.getLogger(__name__)

# Face recognition API configuration (Your Colab model endpoint)
FACE_API_ENDPOINT = os.getenv("FACE_API_ENDPOINT", "http://localhost:8000/recognize")
FACE_API_KEY = os.getenv("FACE_API_KEY", "your-api-key")


class FaceRecognitionService:
    """
    Service for calling external face recognition API.
    """
    
    @staticmethod
    async def recognize_faces(image_bytes: bytes) -> List[FaceRecognitionResult]:
        """
        Send image to face recognition service (Google Colab model) and get results.
        
        Args:
            image_bytes: Image file bytes
            
        Returns:
            List of recognized students with confidence scores
            
        Model response format:
            {
                "success": true,
                "faces_detected": 3,
                "recognized_faces": [
                    {"name": "john_doe", "confidence": 0.92, "bbox": [x, y, w, h]},
                    {"name": "jane_smith", "confidence": 0.87, "bbox": [x, y, w, h]}
                ],
                "unknown_faces": [
                    {"name": "Unknown", "confidence": 0.45, "bbox": [x, y, w, h]}
                ],
                "results": [...],
                "image_with_boxes": "base64_string",
                "timestamp": "2024-02-07T10:30:00"
            }
        """
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                files = {"file": ("image.jpg", image_bytes, "image/jpeg")}
                
                logger.info(f"🔍 Sending image to face recognition API: {FACE_API_ENDPOINT}")
                
                response = await client.post(
                    FACE_API_ENDPOINT,
                    files=files,
                    timeout=60.0
                )
                
                if response.status_code != 200:
                    logger.error(f"❌ API returned status {response.status_code}: {response.text}")
                    return []
                
                data = response.json()
                logger.info(f"✅ API Response: {data.get('faces_detected', 0)} faces detected")
                logger.info(f"📊 Full API Response: {data}")
                
                # Extract recognized faces (only non-Unknown faces)
                recognized = data.get("recognized_faces", [])
                
                # Convert to FaceRecognitionResult schema
                results = [
                    FaceRecognitionResult(
                        name=item["name"],
                        confidence=float(item["confidence"]),
                    )
                    for item in recognized
                    if item["name"] != "Unknown"  # Filter out unknown faces
                ]
                
                logger.info(f"✅ Processed {len(results)} recognized students")
                return results
                
        except httpx.ConnectError:
            logger.error(f"❌ Failed to connect to face recognition API at {FACE_API_ENDPOINT}")
            logger.error("Make sure your Google Colab model is running and accessible")
            return []
        except httpx.TimeoutException:
            logger.error("❌ Face recognition API request timed out")
            return []
        except Exception as e:
            logger.error(f"❌ Face recognition error: {str(e)}")
            return []
    
    @staticmethod
    async def recognize_faces_with_image(image_bytes: bytes):
        """
        Send image to face recognition service and get both results and annotated image.
        
        Args:
            image_bytes: Image file bytes
            
        Returns:
            Tuple of (List[FaceRecognitionResult], Optional[str])
            - List of recognized students
            - Base64 encoded image with bounding boxes (or None)
        """
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                files = {"file": ("image.jpg", image_bytes, "image/jpeg")}
                
                logger.info(f"🔍 Sending image to face recognition API: {FACE_API_ENDPOINT}")
                
                response = await client.post(
                    FACE_API_ENDPOINT,
                    files=files,
                    timeout=60.0
                )
                
                if response.status_code != 200:
                    logger.error(f"❌ API returned status {response.status_code}: {response.text}")
                    return [], None
                
                data = response.json()
                logger.info(f"✅ API Response: {data.get('faces_detected', 0)} faces detected")
                logger.info(f"📊 Full API Response Keys: {list(data.keys())}")
                
                # Extract recognized faces
                recognized = data.get("recognized_faces", [])
                
                # Extract annotated image
                image_with_boxes = data.get("image_with_boxes", None)
                
                # Convert to FaceRecognitionResult schema (only non-Unknown faces)
                results = [
                    FaceRecognitionResult(
                        name=item["name"],
                        roll_number=extract_roll_number_from_email(item["name"]) if "@" in item.get("name", "") else None,
                        confidence=float(item["confidence"]),
                    )
                    for item in recognized
                    if item["name"] != "Unknown"
                ]
                
                logger.info(f"✅ Processed {len(results)} recognized students (filtered out Unknown)")
                logger.info(f"🖼️ Annotated image: {'Available' if image_with_boxes else 'Not available'}")
                
                return results, image_with_boxes
                
        except httpx.ConnectError:
            logger.error(f"❌ Failed to connect to face recognition API at {FACE_API_ENDPOINT}")
            logger.error("Make sure your Google Colab model is running and accessible")
            return [], None
        except httpx.TimeoutException:
            logger.error("❌ Face recognition API request timed out")
            return [], None
        except Exception as e:
            logger.error(f"❌ Face recognition error: {str(e)}")
            return [], None
    
    @staticmethod
    def get_student_id_from_name(student_identifier: str) -> int:
        """
        Convert student identifier from ML model to student ID.
        
        This is a mapping function that should be implemented based on
        your naming convention. Examples:
        - "student_101" -> 101
        - "id_12345" -> 12345
        
        Args:
            student_identifier: Identifier from ML model
            
        Returns:
            Student database ID
            
        Raises:
            ValueError: If identifier format is invalid
        """
        try:
            # Example: "student_101" -> 101
            if student_identifier.startswith("student_"):
                return int(student_identifier.replace("student_", ""))
            
            # Example: "id_12345" -> 12345
            if student_identifier.startswith("id_"):
                return int(student_identifier.replace("id_", ""))
            
            # Try to parse as integer directly
            return int(student_identifier)
        except (ValueError, AttributeError):
            raise ValueError(f"Invalid student identifier: {student_identifier}")