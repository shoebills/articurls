from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from .database import get_db
from . import models, schemas
from typing import List

app = FastAPI()

@app.get("/")
def home():

    return {"Welcome to articals!"}

@app.post("/create", response_model=schemas.Post)
def create_post(request: schemas.PostBase, db: Session = Depends(get_db)):

    new_post = models.Post(title=request.title, content=request.content)
    db.add(new_post)
    db.commit()
    db.refresh(new_post)
    return new_post

@app.get("/post", response_model=List[schemas.Post])
def get_posts(db: Session = Depends(get_db)):

    posts = db.query(models.Post).all()
    return posts

@app.get("/post/{id}", response_model=schemas.Post)
def get_post(id: int, db: Session = Depends(get_db)):

    post = db.query(models.Post).filter(models.Post.post_id == id).first()
    return post

@app.put("/post/{id}", response_model=schemas.PostBase)
def update_post(id: int, request: schemas.PostBase, db: Session = Depends(get_db)):

    post = db.query(models.Post).filter(models.Post.post_id == id).first()
    post.title = request.title
    post.content = request.content
    db.commit()
    db.refresh(post)

    return post

@app.delete("/post/{id}")
def delete_post(id: int, db: Session = Depends(get_db)):

    db.query(models.Post).filter(models.Post.post_id == id).delete()
    db.commit()

    return "Deleted post"