from datetime import datetime, timedelta, UTC
from typing import Any, Union
from jose import jwt
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM = "HS256"

def create_access_token(subject: str, expires_delta: timedelta = None) -> str:
    """
    Generate a JWT access token for a given user subject.
    
    Args:
        subject: The user identifier (usually email) to include in the token.
        expires_delta: Optional expiration time. Defaults to 1 week.
        
    Returns:
        A signed JWT token string.
    """
    if expires_delta:
        expire = datetime.now(UTC) + expires_delta
    else:
        expire = datetime.now(UTC) + timedelta(minutes=60 * 24 * 7) # 1 week
    
    to_encode = {"exp": expire, "sub": str(subject)}
    from .config import settings
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain text password against a hashed version.
    
    Args:
        plain_password: The password provided by the user.
        hashed_password: The stored hash to compare against.
        
    Returns:
        True if the password matches, False otherwise.
    """
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """
    Hash a password for secure storage.
    
    Args:
        password: The plain text password to hash.
        
    Returns:
        A hashed string.
    """
    return pwd_context.hash(password)
