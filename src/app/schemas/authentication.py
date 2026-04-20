from pydantic import BaseModel, EmailStr

class Login(BaseModel):
    username: str
    password: str

    class Config:
        from_attributes = True


class RequestPasswordReset(BaseModel):
    email: EmailStr


class ResendVerificationEmail(BaseModel):
    email: EmailStr
    plan_choice: str = "free"


class ResetPassword(BaseModel):
    token: str
    new_password: str