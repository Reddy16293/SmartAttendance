from pydantic import BaseModel, Field, AliasChoices


class MobileGoogleAuthRequest(BaseModel):
    id_token: str = Field(
        ...,
        validation_alias=AliasChoices("id_token", "idToken"),
        description="Google ID token from mobile app",
    )


class MobileGoogleAuthResponse(BaseModel):
    access_token: str
    user: dict
