from fastapi import Depends, APIRouter, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models
from ..schemas import post
from ..security.oauth2 import get_current_user
from typing import List

router = APIRouter(
    tags=["Posts"],
    prefix="/post"
)

@router.post("/", response_model=post.GetPost, status_code=status.HTTP_201_CREATED)
def create_post(request: post.CreatePost, db: Session = Depends(get_db), current_user = Depends(get_current_user)):

    new_post = models.Post(title=request.title, content=request.content, user_id=current_user.user_id)

    db.add(new_post)
    db.commit()
    db.refresh(new_post)

    return new_post

@router.get("/", response_model=List[post.GetPost], status_code=200)
def get_posts(db: Session = Depends(get_db)):

    posts = db.query(models.Post).all()

    if not posts:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No posts found")

    return posts

@router.get("/{id}", response_model=post.GetPost, status_code=200)
def get_post(id: int, db: Session = Depends(get_db)):

    post = db.query(models.Post).filter(models.Post.post_id == id).first()

    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Post with id: {id} not found")
    
    return post

@router.put("/{id}", response_model=post.GetPost, status_code=status.HTTP_202_ACCEPTED)
def update_post(id: int, request: post.UpdatePost, db: Session = Depends(get_db), current_user = Depends(get_current_user)):

    post = db.query(models.Post).filter(models.Post.post_id == id).first()

    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Post with id: {id} not found")
    
    if post.user_id != current_user.user_id:
        raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Not authorized to perform this action"
    )
    
    post.title = request.title
    post.content = request.content
    
    db.commit()
    db.refresh(post)

    return post

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):

    post = db.query(models.Post).filter(models.Post.post_id == id).first()

    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Post with id: {id} not found")
    
    if post.user_id != current_user.user_id:
        raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Not authorized to perform this action"
    )
    
    db.delete(post)
    db.commit()