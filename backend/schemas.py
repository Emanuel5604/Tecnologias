from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    bio: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    bio: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UserPublicResponse(BaseModel):
    id: int
    username: str
    bio: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UserSearchResponse(BaseModel):
    id: int
    username: str
    bio: Optional[str] = None
    image_count: int = 0

    class Config:
        from_attributes = True


class UserGalleryResponse(BaseModel):
    user: UserPublicResponse
    images: list["ImageResponse"]

    class Config:
        from_attributes = True


class ImageResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    filename: str
    user_id: int
    created_at: datetime
    owner: UserPublicResponse

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


UserGalleryResponse.model_rebuild()
