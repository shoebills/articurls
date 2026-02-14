from pydantic import BaseModel

class CreateUser(BaseModel):
    name: str
    email: str
    password: str

class GetUser(BaseModel):
    user_id: int
    name: str
    email: str