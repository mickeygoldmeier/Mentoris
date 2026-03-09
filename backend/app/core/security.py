import bcrypt
from datetime import datetime, timedelta, UTC
from jose import jwt

ALGORITHM = "HS256"


def create_access_token(subject: str, expires_delta: timedelta = None) -> str:
    """
    Generate a JWT access token for a given user subject.

    Args:
        subject: The user identifier (email) to encode in the token.
        expires_delta: Optional custom expiration duration.

    Returns:
        Encoded JWT string.
    """
    if expires_delta:
        expire = datetime.now(UTC) + expires_delta
    else:
        expire = datetime.now(UTC) + timedelta(days=7)

    to_encode = {"exp": expire, "sub": str(subject)}
    from .config import settings
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain text password against a hashed version using bcrypt.

    Args:
        plain_password: The user-supplied password.
        hashed_password: The stored hash to verify against.

    Returns:
        True if the password matches.
    """
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8")
    )


def get_password_hash(password: str) -> str:
    """
    Hash a password for secure storage using bcrypt.

    Args:
        password: The plain text password to hash.

    Returns:
        Hashed password string.
    """
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")
