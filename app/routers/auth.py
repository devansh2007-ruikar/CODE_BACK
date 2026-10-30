from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt import create_access_token
from app.auth.password import hash_password, verify_password
from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.auth import TokenResponse, UserLogin, UserRegister, UserResponse

router = APIRouter(tags=["Authentication"])


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user (CITIZEN or HERO)",
)
@router.post(
    "/auth/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
async def register(
    user_in: UserRegister,
    db: AsyncSession = Depends(get_db),
):
    """Register a new user with role CITIZEN or HERO and return an access token."""
    # Check if username already exists
    stmt = select(User).where(User.username == user_in.username)
    result = await db.execute(stmt)
    existing_user = result.scalar_one_or_none()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered.",
        )

    hashed_pw = hash_password(user_in.password)
    new_user = User(
        username=user_in.username,
        password_hash=hashed_pw,
        role=user_in.role,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    # Generate JWT Token containing role in the payload
    token_payload = {
        "sub": str(new_user.id),
        "username": new_user.username,
        "role": new_user.role.value,
    }
    token = create_access_token(data=token_payload)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": new_user,
        "id": new_user.id,
        "username": new_user.username,
        "role": new_user.role,
    }


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Log in with username and password (JSON or Form)",
)
@router.post(
    "/auth/login",
    response_model=TokenResponse,
    include_in_schema=False,
)
async def login(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Authenticate user with username and password, returning a JWT token with role in payload.
    Supports both application/json body and application/x-www-form-urlencoded form.
    """
    content_type = request.headers.get("content-type", "")
    username = ""
    password = ""

    if "application/json" in content_type:
        body = await request.json()
        username = body.get("username", "")
        password = body.get("password", "")
    else:
        form = await request.form()
        username = form.get("username", "")
        password = form.get("password", "")

    if not username or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username and password are required.",
        )

    stmt = select(User).where(User.username == username)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token_payload = {
        "sub": str(user.id),
        "username": user.username,
        "role": user.role.value,
    }
    token = create_access_token(data=token_payload)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user,
        "id": user.id,
        "username": user.username,
        "role": user.role,
    }


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user details",
)
@router.get(
    "/auth/me",
    response_model=UserResponse,
    include_in_schema=False,
)
async def get_me(
    current_user: User = Depends(get_current_user),
):
    """Retrieve currently authenticated user profile."""
    return current_user
