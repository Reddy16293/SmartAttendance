"""
Cloudinary Storage helpers for attendance session images.
"""

from __future__ import annotations

import base64
import hashlib
import logging
import mimetypes
import time
from typing import Tuple
from urllib.parse import quote, urlparse

import httpx

from config import settings

logger = logging.getLogger(__name__)


def _require_cloudinary_config() -> None:
    if not settings.cloudinary_url.strip():
        raise RuntimeError("CLOUDINARY_URL is not configured")


def _parse_cloudinary_url() -> tuple[str, str, str]:
    cloudinary_url = settings.cloudinary_url.strip()
    if not cloudinary_url:
        raise RuntimeError("CLOUDINARY_URL is not configured")

    parsed = urlparse(cloudinary_url)
    if parsed.scheme != "cloudinary" or not parsed.username or not parsed.password or not parsed.hostname:
        raise RuntimeError("CLOUDINARY_URL must look like cloudinary://api_key:api_secret@cloud_name")

    return parsed.username, parsed.password, parsed.hostname


def _cloudinary_api_base_url() -> str:
    _, _, cloud_name = _parse_cloudinary_url()
    return f"https://api.cloudinary.com/v1_1/{cloud_name}"


def _cloudinary_public_url(storage_path: str) -> str:
    _, _, cloud_name = _parse_cloudinary_url()
    return f"https://res.cloudinary.com/{cloud_name}/image/upload/{quote(storage_path, safe='/')}"


def decode_base64_image(image_data: str) -> Tuple[bytes, str]:
    """Decode a base64 image payload, including optional data URI prefixes."""
    content_type = "image/png"
    encoded_image = image_data.strip()

    if encoded_image.startswith("data:") and "," in encoded_image:
        header, encoded_image = encoded_image.split(",", 1)
        if ";base64" in header:
            content_type = header[5 : header.index(";base64")]

    try:
        return base64.b64decode(encoded_image), content_type
    except Exception as exc:
        raise ValueError("Invalid base64 image payload") from exc


def build_session_image_path(session_id: int, variant: str, content_type: str) -> str:
    extension = mimetypes.guess_extension(content_type) or ".jpg"
    if extension == ".jpe":
        extension = ".jpg"
    # Keep a stable path per session + variant so newer uploads overwrite older ones.
    return f"attendance-sessions/{session_id}/{variant}{extension}"


async def upload_public_storage_object(
    storage_path: str,
    file_bytes: bytes,
    content_type: str,
) -> str:
    """Upload a file to Cloudinary and return the public URL."""
    _require_cloudinary_config()

    api_key, api_secret, _ = _parse_cloudinary_url()
    upload_url = f"{_cloudinary_api_base_url()}/image/upload"
    timestamp = str(int(time.time()))
    public_id = storage_path.rsplit(".", 1)[0]
    signature_payload = f"overwrite=true&public_id={public_id}&timestamp={timestamp}{api_secret}"
    signature = hashlib.sha1(signature_payload.encode("utf-8")).hexdigest()
    files = {
        "file": (storage_path.split("/")[-1], file_bytes, content_type),
    }
    data = {
        "api_key": api_key,
        "timestamp": timestamp,
        "public_id": public_id,
        "signature": signature,
        "overwrite": "true",
    }

    logger.debug(f"Uploading to Cloudinary: {upload_url}")

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.post(upload_url, files=files, data=data)
        except httpx.ConnectError as e:
            logger.error(f"Failed to connect to Cloudinary at {_cloudinary_api_base_url()}: {e}")
            raise RuntimeError(
                f"Cannot connect to Cloudinary. Check internet connectivity and CLOUDINARY_URL: {e}"
            ) from e
        except httpx.TimeoutException as e:
            logger.error(f"Cloudinary upload timeout: {e}")
            raise RuntimeError(f"Cloudinary upload timed out: {e}") from e
        except Exception as e:
            logger.error(f"Unexpected error uploading to Cloudinary: {e}")
            raise

    if response.status_code not in (200, 201):
        error_msg = f"Cloudinary upload failed ({response.status_code}): {response.text}"
        logger.error(error_msg)
        raise RuntimeError(error_msg)

    logger.debug(f"Successfully uploaded to {storage_path}")
    payload = response.json()
    return payload.get("secure_url") or _cloudinary_public_url(storage_path)