from fastapi import FastAPI, Depends, APIRouter
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas
from typing import List

router = APIRouter(
    tags=["Posts"],
    prefix="/post"
)

@router.post("/", response_model=schemas.GetPost)
def create_post(request: schemas.CreatePost, db: Session = Depends(get_db)):

    new_post = models.Post(title=request.title, content=request.content)
    db.add(new_post)
    db.commit()
    db.refresh(new_post)
    return new_post

@router.get("/", response_model=List[schemas.GetPost])
def get_posts(db: Session = Depends(get_db)):

    posts = db.query(models.Post).all()
    return posts

@router.get("/{id}", response_model=schemas.GetPost)
def get_post(id: int, db: Session = Depends(get_db)):

    post = db.query(models.Post).filter(models.Post.post_id == id).first()
    return post

@router.put("/{id}", response_model=schemas.GetPost)
def update_post(id: int, request: schemas.UpdatePost, db: Session = Depends(get_db)):

    post = db.query(models.Post).filter(models.Post.post_id == id).first()
    post.title = request.title
    post.content = request.content
    db.commit()
    db.refresh(post)

    return post

@router.delete("/{id}")
def delete_post(id: int, db: Session = Depends(get_db)):

    db.query(models.Post).filter(models.Post.post_id == id).delete()
    db.commit()

    return "Deleted post"