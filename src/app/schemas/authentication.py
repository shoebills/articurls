from pydantic import BaseModel, EmailStr

class Login(BaseModel):
    username: str
    password: str

    class Config:
        from_attributes = True

class RequestPasswordReset(BaseModel):
    email: EmailStr

class ResetPassword(BaseModel):
    token: str
    new_password: str