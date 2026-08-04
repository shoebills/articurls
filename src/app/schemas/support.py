from pydantic import BaseModel, Field


class SupportMessage(BaseModel):
    category: str = Field(min_length=1, max_length=50)
    subject: str = Field(min_length=1, max_length=200)
    message: str = Field(min_length=10, max_length=5000)
