from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from db.session import get_db
from schemas.mobile_auth import MobileGoogleAuthRequest, MobileGoogleAuthResponse
from schemas.user import UserRole
from services.auth_service import AuthService
from utils.google_oauth import verify_google_id_token

router = APIRouter(prefix="/auth/mobile", tags=["Mobile Authentication"])


@router.post("/google", response_model=MobileGoogleAuthResponse)
async def mobile_google_auth(
    request: MobileGoogleAuthRequest,
    db: Session = Depends(get_db),
):
    try:
        google_user_info = verify_google_id_token(request.id_token)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc

    service = AuthService(db)
    user, token, _, _ = service.authenticate_google(request.id_token, UserRole.STUDENT)

    return MobileGoogleAuthResponse(
        access_token=token,
        user={
            "name": user.name or google_user_info.get("name", ""),
            "email": user.email,
            "picture": google_user_info.get("picture", ""),
        },
    )
