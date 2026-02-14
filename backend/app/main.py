from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from .database import get_db
from . import models, schemas
from typing import List

app = FastAPI()

@app.get("/")
def home():

    return {"Welcome to articals!"}

@app.post("/post", response_model=schemas.GetPost)
def create_post(request: schemas.CreatePost, db: Session = Depends(get_db)):

    new_post = models.Post(title=request.title, content=request.content)
    db.add(new_post)
    db.commit()
    db.refresh(new_post)
    return new_post

@app.get("/post", response_model=List[schemas.GetPost])
def get_posts(db: Session = Depends(get_db)):

    posts = db.query(models.Post).all()
    return posts

@app.get("/post/{id}", response_model=schemas.GetPost)
def get_post(id: int, db: Session = Depends(get_db)):

    post = db.query(models.Post).filter(models.Post.post_id == id).first()
    return post

@app.put("/post/{id}", response_model=schemas.GetPost)
def update_post(id: int, request: schemas.UpdatePost, db: Session = Depends(get_db)):

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

@app.post("/user", response_model=schemas.GetUser)
def create_user(request: schemas.CreateUser, db: Session = Depends(get_db)):

    new_user = models.User(name=request.name, email=request.email, password=request.password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
 
    return new_user

@app.get("/user/{id}", response_model=schemas.GetUser)
def get_user(id: int, db: Session = Depends(get_db)):

    user = db.query(models.User).filter(models.User.user_id == id).first()

    return user