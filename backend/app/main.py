from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from .database import get_db

app = FastAPI()

@app.get("/")
def home():
    return {"hello": "world"}

@app.get("/test")
def test(db: Session = Depends(get_db)):
    return {"message": "DB connected"}