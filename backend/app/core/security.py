import bcrypt
from datetime import datetime, timedelta, UTC
from typing import Any, Union
from jose import jwt

ALGORITHM = "HS256"

def create_access_token(subject: str, expires_delta: timedelta = None) -> str:
    """
    Generate a JWT access token for a given user subject.
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
    Verify a plain text password against a hashed version using bcrypt.
    """
    password_bytes = plain_password.encode('utf-8')
    hashed_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password_bytes, hashed_bytes)

def get_password_hash(password: str) -> str:
    """
    Hash a password for secure storage using bcrypt.
    """
    # 72 byte limit check (bcrypt default)
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')
