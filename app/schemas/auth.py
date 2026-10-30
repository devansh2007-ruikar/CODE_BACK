from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from app.models.user import UserRole


class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="Unique username")
    role: UserRole = Field(default=UserRole.CITIZEN, description="User role: CITIZEN or HERO")


class UserRegister(UserBase):
    password: str = Field(..., min_length=6, max_length=128, description="User password")


class UserLogin(BaseModel):
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)


class UserResponse(BaseModel):
    id: int
    username: str
    role: UserRole

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    id: Optional[int] = None
    username: Optional[str] = None
    role: Optional[UserRole] = None

    model_config = ConfigDict(from_attributes=True)


class TokenPayload(BaseModel):
    sub: str
    username: str
    role: str
    exp: Optional[int] = None
    iat: Optional[int] = None
