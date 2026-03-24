import jwt
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
from ..config import settings
from ..database import get_db
from .. import models
from fastapi.security import OAuth2PasswordBearer

SECRET_KEY = settings.secret_key
ALGORITHM = settings.algorithm
ACCESS_TOKEN_EXPIRATION_MINUTES = settings.access_token_expire_minutes


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


def create_access_token(data: dict, expires_delta: timedelta | None = None):

    to_encode = data.copy()

    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRATION_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    return encoded_jwt


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")

        if email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, 
                detail="Could not validate credentials"
    )
        
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Could not validate credentials"
    )

    db_user = db.query(models.User).filter(models.User.email == email).first()

    if db_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Could not validate credentials"
    )

    return db_user

def create_new_user_token(email: str):

    expire = datetime.now(timezone.utc) + timedelta(hours=24)

    payload = {
        "email": email,
        "purpose": "verify-user",
        "exp": expire
    }

    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

    return token

def verify_new_user_token(token: str):

    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

    if payload.get("purpose") != "verify-user":
        raise ValueError("Invalid token purpose")
    
    return payload

def create_unsubscribe_token(subscriber_id: int, user_id: int):

    payload = {
        "subscriber_id": subscriber_id,
        "user_id": user_id,
        "purpose": "unsubscribe"
        }

    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    
    return token

def verify_unsubscribe_token(token: str):

    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

    if payload.get("purpose") != "unsubscribe":
        raise ValueError("Invalid token purpose")
    
    return payload

def create_sub_confirm_token(subscriber_id: int, user_id: int):

    payload = {
        "subscriber_id": subscriber_id,
        "user_id": user_id,
        "purpose": "confirm-subscription"
        }

    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    
    return token
    

def verify_sub_confirm_token(token: str):

    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

    if payload.get("purpose") != "confirm-subscription":
        raise ValueError("Invalid token purpose")
    
    return payload