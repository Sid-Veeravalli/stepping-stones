"""
Authentication utilities - JWT token handling and password hashing
"""
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import Facilitator

# JWT Configuration
SECRET_KEY = "your-secret-key-change-this-in-production-use-env-var"  # TODO: Use environment variable
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 hours

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/facilitator/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify plain password against hashed password
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    Hash a password
    """
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """
    Create JWT access token
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_facilitator(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> Facilitator:
    """
    Get current authenticated facilitator from JWT token
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # Get facilitator from database
    result = await db.execute(
        select(Facilitator).where(Facilitator.username == username)
    )
    facilitator = result.scalar_one_or_none()

    if facilitator is None:
        raise credentials_exception

    return facilitator


async def authenticate_facilitator(
    db: AsyncSession,
    username: str,
    password: str
) -> Optional[Facilitator]:
    """
    Authenticate facilitator with username and password
    """
    result = await db.execute(
        select(Facilitator).where(Facilitator.username == username)
    )
    facilitator = result.scalar_one_or_none()

    if not facilitator:
        return None
    if not verify_password(password, facilitator.hashed_password):
        return None

    return facilitator
