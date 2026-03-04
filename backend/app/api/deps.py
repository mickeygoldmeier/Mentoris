from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import ValidationError
import os
from ..core.config import settings
from ..core.security import ALGORITHM
from ..db.mongodb import get_database

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/login"
)

async def get_current_user(token: str = Depends(reusable_oauth2)) -> dict:
    """
    Validate the JWT access token and return the current authenticated user.
    """
    log_path = r"C:\Users\mmgol\Documents\projects\side-projects\mentoris\backend\backend_debug.log"
    if not token or len(token.split('.')) < 3:
        with open(log_path, 'a') as f:
            f.write(f"DEBUG: get_current_user - Malformed or missing token: '{token[:10]}...'\n")
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[ALGORITHM]
        )
        user_id = payload.get("sub")
        if user_id is None:
            with open(log_path, 'a') as f:
                f.write("DEBUG: get_current_user - 'sub' claim missing in payload\n")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
            )
    except (JWTError, ValidationError) as e:
        with open(log_path, 'a') as f:
            f.write(f"DEBUG: get_current_user - JWT Validation failed: {e}.\n")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )
    
    db = get_database()
    user = await db["users"].find_one({"email": user_id})
    
    if not user:
        with open(log_path, 'a') as f:
            f.write(f"DEBUG: get_current_user - User not found for email '{user_id}'\n")
        raise HTTPException(status_code=404, detail="User not found")
        
    return user
