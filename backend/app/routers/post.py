from fastapi import Depends, APIRouter, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models
from ..schemas import post
from typing import List

router = APIRouter(
    tags=["Posts"],
    prefix="/post"
)

@router.post("/", response_model=post.GetPost, status_code=status.HTTP_201_CREATED)
def create_post(request: post.CreatePost, db: Session = Depends(get_db)):
    new_post = models.Post(title=request.title, content=request.content)
    db.add(new_post)
    db.commit()
    db.refresh(new_post)
    return new_post

@router.get("/", response_model=List[post.GetPost], status_code=200)
def get_posts(db: Session = Depends(get_db)):
    posts = db.query(models.Post).all()
    return posts

@router.get("/{id}", response_model=post.GetPost, status_code=200)
def get_post(id: int, db: Session = Depends(get_db)):
    post = db.query(models.Post).filter(models.Post.post_id == id).first()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Post with id: {id} not found")
    return post

@router.put("/{id}", response_model=post.GetPost, status_code=status.HTTP_202_ACCEPTED)
def update_post(id: int, request: post.UpdatePost, db: Session = Depends(get_db)):
    post = db.query(models.Post).filter(models.Post.post_id == id).first()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Post with id: {id} not found")
    post.title = request.title
    post.content = request.content
    db.commit()
    db.refresh(post)
    return post

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(id: int, db: Session = Depends(get_db)):
    post = db.query(models.Post).filter(models.Post.post_id == id)
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Post with id: {id} not found")
    db.delete(post)
    db.commit()