import logging

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import ValidationError

from ..core.config import settings
from ..core.security import ALGORITHM
from ..db.mongodb import get_database

logger = logging.getLogger(__name__)

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/login"
)


async def get_current_user(token: str = Depends(reusable_oauth2)) -> dict:
    """
    Validate the JWT access token and return the current authenticated user.

    Args:
        token: The Bearer token extracted from the Authorization header.

    Returns:
        The user document from MongoDB.

    Raises:
        HTTPException: 401 if token is invalid, 404 if user not found.
    """
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[ALGORITHM]
        )
        user_id = payload.get("sub")
        if user_id is None:
            logger.warning("JWT payload missing 'sub' claim")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
            )
    except (JWTError, ValidationError) as e:
        logger.warning("JWT validation failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )

    db = get_database()
    user = await db["users"].find_one({"email": user_id})

    if not user:
        logger.warning("User not found for email '%s'", user_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return user
