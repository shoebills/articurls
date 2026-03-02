from fastapi import Depends, APIRouter, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models
from ..schemas import blog
from ..security.oauth2 import get_current_user
from typing import List
from slugify import slugify

router = APIRouter(
    tags=["Blogs"],
    prefix="/blog"
)

@router.post("/", response_model=blog.GetBlog, status_code=status.HTTP_201_CREATED)
def create_blog(request: blog.CreateBlog, db: Session = Depends(get_db), current_user = Depends(get_current_user)):

    if request.slug:
        base_slug = slugify(request.slug)
    else:
        base_slug = slugify(request.title)

    db_slug = base_slug
    counter = 1

    while db.query(models.Blog).filter(models.Blog.user_id == current_user.user_id, models.Blog.slug == db_slug).first():
        db_slug = f"{base_slug}-{counter}"
        counter += 1

    new_blog = models.Blog(title=request.title, 
                           content=request.content, 
                           user_id=current_user.user_id,
                           slug=db_slug,
                           seo_title=request.seo_title,
                           seo_description=request.seo_description)

    db.add(new_blog)
    db.commit()
    db.refresh(new_blog)

    return new_blog

@router.get("/", response_model=List[blog.GetBlog], status_code=200)
def get_blogs(db: Session = Depends(get_db), current_user = Depends(get_current_user)):

    blogs = db.query(models.Blog).filter(models.Blog.user_id == current_user.user_id).all()

    if not blogs:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No blogs found")

    return blogs

@router.get("/{id}", response_model=blog.GetBlog, status_code=200)
def get_blog(id: int, db: Session = Depends(get_db)):

    blog = db.query(models.Blog).filter(models.Blog.blog_id == id).first()

    if not blog:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Blog with id: {id} not found")
    
    return blog

@router.patch("/{id}", response_model=blog.GetBlog, status_code=status.HTTP_202_ACCEPTED)
def update_blog(id: int, request: blog.UpdateBlog, db: Session = Depends(get_db), current_user = Depends(get_current_user)):

    blog = db.query(models.Blog).filter(models.Blog.blog_id == id).first()

    if not blog:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Blog with id: {id} not found")
    
    if blog.user_id != current_user.user_id:
        raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Not authorized to perform this action"
    )

    update_data = request.dict(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(blog, key, value)

    db.commit()
    db.refresh(blog)

    return blog

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_blog(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):

    blog = db.query(models.Blog).filter(models.Blog.blog_id == id).first()

    if not blog:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Blog with id: {id} not found")
    
    if blog.user_id != current_user.user_id:
        raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Not authorized to perform this action"
    )
    
    db.delete(blog)
    db.commit()