from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt import decode_access_token
from app.database import get_db
from app.models.user import User, UserRole

# OAuth2 scheme supporting bearer token in Authorization header
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/auth/login",
    auto_error=False,
)


async def get_token_payload(
    token: Optional[str] = Depends(oauth2_scheme),
) -> dict:
    """Extract and validate JWT token from the Authorization header."""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Missing Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        payload = decode_access_token(token)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    sub: Optional[str] = payload.get("sub")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload: missing subject (user ID).",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return payload


async def get_current_user(
    payload: dict = Depends(get_token_payload),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Load the current authenticated user from the database."""
    user_id_str = payload.get("sub")
    try:
        user_id = int(user_id_str)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID in token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def require_role(required_role: UserRole):
    """Factory creating dependency checks for specific roles.
    
    Enforces that:
    1. The token payload contains the required role.
    2. Returns 403 Forbidden if the token role does not match.
    """
    async def role_checker(
        payload: dict = Depends(get_token_payload),
        current_user: User = Depends(get_current_user),
    ) -> User:
        role_in_payload = payload.get("role")
        if not role_in_payload or role_in_payload != required_role.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: '{required_role.value}' role required in token payload. Your token has '{role_in_payload}'.",
            )
        return current_user

    return role_checker


# Role-specific dependency shortcuts
require_citizen = require_role(UserRole.CITIZEN)
require_hero = require_role(UserRole.HERO)
