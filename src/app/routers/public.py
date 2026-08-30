from fastapi import Depends, APIRouter, HTTPException, Request, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Any
from ..database import get_db
from .. import models, utils
from ..schemas import blog, site
from ..schemas import page as page_schema


router = APIRouter(
    tags=["Public"],
)


@router.get("/{subdomain}/blogs/search", response_model=List[blog.PublicBlogSearchResult], status_code=status.HTTP_200_OK)
def search_blogs(
    subdomain: str,
    request: Request,
    q: str = Query(..., min_length=2, max_length=200, description="Search query"),
    limit: int = Query(5, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    db_site, canonical_subdomain = utils.resolve_subdomain_to_current(db, subdomain)
    if db_site and canonical_subdomain != utils.normalize_subdomain(subdomain):
        return utils.permanent_subdomain_redirect(str(request.url.path), canonical_subdomain, request.url.query)
    if not db_site:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Load all published blogs for this user
    all_blogs = (
        db.query(models.Blog)
        .filter(
            models.Blog.site_id == db_site.site_id,
            models.Blog.status == models.BlogStatus.PUBLISHED,
        )
        .all()
    )

    if not all_blogs:
        return []

    # Load category names for all blogs
    blog_ids = [b.blog_id for b in all_blogs]
    cat_rows = (
        db.query(models.BlogCategory.blog_id, models.Category.name)
        .join(models.Category, models.BlogCategory.category_id == models.Category.category_id)
        .filter(models.BlogCategory.blog_id.in_(blog_ids))
        .all()
    )
    blog_categories: dict[Any, list[str]] = {}
    for bid, cname in cat_rows:
        blog_categories.setdefault(bid, []).append(utils.normalize_search_text(cname))

    q_norm = utils.normalize_search_text(q)
    terms = [t for t in q_norm.split() if len(t) >= 2]
    if not terms:
        return []

    # Score each blog in Python
    scored: list[dict] = []
    for db_blog in all_blogs:
        plain_text = utils.html_to_plain_text(db_blog.content)
        title_norm = utils.normalize_search_text(db_blog.title)
        body_norm = utils.normalize_search_text(plain_text)

        score = 0
        title_term_matches = 0

        for term in terms:
            if term == title_norm:
                score += 1000
                title_term_matches += 1
            elif title_norm.startswith(term):
                score += 100
                title_term_matches += 1
            elif term in title_norm:
                score += 10
                title_term_matches += 1

            for cat_name in blog_categories.get(db_blog.blog_id, []):
                if term in cat_name:
                    score += 5
                    break

            if term in body_norm:
                score += 1

        if len(terms) > 1 and title_term_matches >= len(terms):
            score += 500

        if score == 0:
            continue

        excerpt = plain_text[:240]
        if len(plain_text) > 240:
            excerpt = excerpt.rstrip() + "..."

        scored.append({
            "blog_id": db_blog.blog_id,
            "title": db_blog.title,
            "slug": db_blog.slug,
            "excerpt": excerpt,
            "published_at": db_blog.published_at,
            "score": score,
        })

    # Sort by score descending, then published_at descending
    def sort_key(item: dict):
        pub_ts = 0
        if item["published_at"] is not None:
            pub_ts = item["published_at"].timestamp()
        return (-item["score"], -pub_ts)

    scored.sort(key=sort_key)

    # Paginate
    paged = scored[offset:offset + limit]

    return [
        blog.PublicBlogSearchResult(**item)
        for item in paged
    ]


@router.get("/{subdomain}/blogs", response_model=List[blog.PublicBlogs], status_code=status.HTTP_200_OK)
def get_blogs(subdomain: str, request: Request, db: Session = Depends(get_db)):

    db_site, canonical_subdomain = utils.resolve_subdomain_to_current(db, subdomain)
    if db_site and canonical_subdomain != utils.normalize_subdomain(subdomain):
        return utils.permanent_subdomain_redirect(str(request.url.path), canonical_subdomain, request.url.query)

    if not db_site:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User not found")

    results = (
        db.query(models.Blog)
        .filter(models.Blog.site_id == db_site.site_id, models.Blog.status == models.BlogStatus.PUBLISHED)
        .order_by(models.Blog.published_at.desc())
        .all()
    )

    blogs = []
    for db_blog in results:
        db_blog.excerpt = utils.make_excerpt(db_blog.content)
        blogs.append(db_blog)

    return blogs

@router.get("/{subdomain}/blog/{slug}", response_model=blog.PublicBlog, status_code=200)
def get_blog(subdomain: str, slug: str, request: Request, db: Session = Depends(get_db)):

    db_site, canonical_subdomain = utils.resolve_subdomain_to_current(db, subdomain)
    if db_site and canonical_subdomain != utils.normalize_subdomain(subdomain):
        return utils.permanent_subdomain_redirect(str(request.url.path), canonical_subdomain, request.url.query)

    if not db_site:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    db_blog = (
        db.query(models.Blog)
        .filter(models.Blog.slug == slug, models.Blog.site_id == db_site.site_id)
        .first()
    )
    if not db_blog:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blog not found")
    if db_blog.status != models.BlogStatus.PUBLISHED:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blog not found")

    db_blog.excerpt = utils.make_excerpt(db_blog.content)
    return db_blog


@router.get("/{subdomain}", response_model=site.PublicSite)
def get_site(subdomain: str, request: Request, db: Session = Depends(get_db)):

    db_site, canonical_subdomain = utils.resolve_subdomain_to_current(db, subdomain)
    if db_site and canonical_subdomain != utils.normalize_subdomain(subdomain):
        return utils.permanent_subdomain_redirect(str(request.url.path), canonical_subdomain, request.url.query)

    if not db_site:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site not found")

    return utils.public_site_out(db, db_site)


@router.get("/{subdomain}/pages", response_model=List[page_schema.UserPageOut], status_code=status.HTTP_200_OK)
def get_pages(subdomain: str, request: Request, db: Session = Depends(get_db)):
    db_site, canonical_subdomain = utils.resolve_subdomain_to_current(db, subdomain)
    if db_site and canonical_subdomain != utils.normalize_subdomain(subdomain):
        return utils.permanent_subdomain_redirect(str(request.url.path), canonical_subdomain, request.url.query)
    if not db_site:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return (
        db.query(models.UserPage)
        .filter(
            models.UserPage.site_id == db_site.site_id,
            models.UserPage.show_in_footer.is_(True),
            models.UserPage.status == models.PageStatus.PUBLISHED,
        )
        .order_by(models.UserPage.footer_order.asc(), models.UserPage.created_at.asc())
        .all()
    )


@router.get("/{subdomain}/page/{slug}", response_model=page_schema.UserPageOut, status_code=status.HTTP_200_OK)
def get_page(subdomain: str, slug: str, request: Request, db: Session = Depends(get_db)):
    db_site, canonical_subdomain = utils.resolve_subdomain_to_current(db, subdomain)
    if db_site and canonical_subdomain != utils.normalize_subdomain(subdomain):
        return utils.permanent_subdomain_redirect(str(request.url.path), canonical_subdomain, request.url.query)
    if not db_site:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    db_page = (
        db.query(models.UserPage)
        .filter(
            models.UserPage.site_id == db_site.site_id,
            models.UserPage.slug == slug,
            models.UserPage.status == models.PageStatus.PUBLISHED,
        )
        .first()
    )
    if not db_page:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")
    return db_page


@router.get("/{subdomain}/categories", status_code=status.HTTP_200_OK)
def get_public_categories(subdomain: str, request: Request, all: bool = False, db: Session = Depends(get_db)):
    db_site, canonical_subdomain = utils.resolve_subdomain_to_current(db, subdomain)
    if db_site and canonical_subdomain != utils.normalize_subdomain(subdomain):
        return utils.permanent_subdomain_redirect(str(request.url.path), canonical_subdomain, request.url.query)
    if not db_site:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    query = db.query(models.Category).filter(models.Category.site_id == db_site.site_id)
    if not all:
        query = query.filter(models.Category.show_in_menu.is_(True))
    cats = query.order_by(models.Category.menu_order.asc(), models.Category.created_at.asc()).all()

    from sqlalchemy import func as sa_func
    result = []
    for c in cats:
        blog_count = (
            db.query(sa_func.count(models.BlogCategory.blog_category_id))
            .filter(models.BlogCategory.category_id == c.category_id)
            .scalar()
        ) or 0
        result.append({
            "category_id": c.category_id,
            "site_id": c.site_id,
            "name": c.name,
            "slug": c.slug,
            "description": c.description,
            "blog_count": blog_count,
            "show_in_menu": c.show_in_menu,
            "menu_order": c.menu_order,
            "created_at": c.created_at,
        })
    return result


@router.get("/{subdomain}/category/{slug}", status_code=status.HTTP_200_OK)
def get_public_category_blogs(subdomain: str, slug: str, request: Request, db: Session = Depends(get_db)):
    db_site, canonical_subdomain = utils.resolve_subdomain_to_current(db, subdomain)
    if db_site and canonical_subdomain != utils.normalize_subdomain(subdomain):
        return utils.permanent_subdomain_redirect(str(request.url.path), canonical_subdomain, request.url.query)
    if not db_site:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    db_cat = (
        db.query(models.Category)
        .filter(models.Category.site_id == db_site.site_id, models.Category.slug == slug)
        .first()
    )
    if not db_cat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    results = (
        db.query(models.Blog)
        .join(models.BlogCategory, models.Blog.blog_id == models.BlogCategory.blog_id)
        .filter(
            models.BlogCategory.category_id == db_cat.category_id,
            models.Blog.site_id == db_site.site_id,
            models.Blog.status == models.BlogStatus.PUBLISHED,
        )
        .all()
    )

    blogs = []
    for db_blog in results:
        db_blog.excerpt = utils.make_excerpt(db_blog.content)
        cat_ids = [
            row[0]
            for row in db.query(models.BlogCategory.category_id)
            .filter(models.BlogCategory.blog_id == db_blog.blog_id)
            .all()
        ]
        db_blog.category_ids = cat_ids
        blogs.append(db_blog)

    return {
        "category": {
            "category_id": db_cat.category_id,
            "name": db_cat.name,
            "slug": db_cat.slug,
            "description": db_cat.description,
        },
        "blogs": blogs,
    }


@router.get("/{subdomain}/authors", status_code=status.HTTP_200_OK)
def get_public_authors(subdomain: str, request: Request, db: Session = Depends(get_db)):
    db_site, canonical_subdomain = utils.resolve_subdomain_to_current(db, subdomain)
    if db_site and canonical_subdomain != utils.normalize_subdomain(subdomain):
        return utils.permanent_subdomain_redirect(str(request.url.path), canonical_subdomain, request.url.query)
    if not db_site:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    authors = (
        db.query(models.Author)
        .filter(models.Author.site_id == db_site.site_id)
        .order_by(models.Author.created_at.asc())
        .all()
    )
    from sqlalchemy import func as sa_func
    result = []
    for a in authors:
        blog_count = (
            db.query(sa_func.count(models.Blog.blog_id))
            .filter(
                models.Blog.author_id == a.author_id,
                models.Blog.site_id == db_site.site_id,
                models.Blog.status == models.BlogStatus.PUBLISHED,
            )
            .scalar()
        ) or 0
        result.append({
            "author_id": a.author_id,
            "site_id": a.site_id,
            "name": a.name,
            "slug": a.slug,
            "bio": a.bio,
            "occupation": a.occupation,
            "profile_image_url": a.profile_image_url,
            "instagram_link": a.instagram_link,
            "x_link": a.x_link,
            "pinterest_link": a.pinterest_link,
            "facebook_link": a.facebook_link,
            "linkedin_link": a.linkedin_link,
            "github_link": a.github_link,
            "youtube_link": a.youtube_link,
            "website_link": a.website_link,
            "blog_count": blog_count,
        })
    return result


@router.get("/{subdomain}/author/{slug}", status_code=status.HTTP_200_OK)
def get_public_author_blogs(subdomain: str, slug: str, request: Request, db: Session = Depends(get_db)):
    db_site, canonical_subdomain = utils.resolve_subdomain_to_current(db, subdomain)
    if db_site and canonical_subdomain != utils.normalize_subdomain(subdomain):
        return utils.permanent_subdomain_redirect(str(request.url.path), canonical_subdomain, request.url.query)
    if not db_site:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    author = (
        db.query(models.Author)
        .filter(models.Author.site_id == db_site.site_id, models.Author.slug == slug)
        .first()
    )
    if not author:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Author not found")

    results = (
        db.query(models.Blog)
        .filter(
            models.Blog.author_id == author.author_id,
            models.Blog.site_id == db_site.site_id,
            models.Blog.status == models.BlogStatus.PUBLISHED,
        )
        .order_by(models.Blog.published_at.desc())
        .all()
    )

    blogs = []
    for db_blog in results:
        db_blog.excerpt = utils.make_excerpt(db_blog.content)
        cat_ids = [
            row[0]
            for row in db.query(models.BlogCategory.category_id)
            .filter(models.BlogCategory.blog_id == db_blog.blog_id)
            .all()
        ]
        db_blog.category_ids = cat_ids
        blogs.append(db_blog)

    return {
        "author": {
            "author_id": author.author_id,
            "site_id": author.site_id,
            "name": author.name,
            "slug": author.slug,
            "bio": author.bio,
            "occupation": author.occupation,
            "profile_image_url": author.profile_image_url,
            "instagram_link": author.instagram_link,
            "x_link": author.x_link,
            "pinterest_link": author.pinterest_link,
            "facebook_link": author.facebook_link,
            "linkedin_link": author.linkedin_link,
            "github_link": author.github_link,
            "youtube_link": author.youtube_link,
            "website_link": author.website_link,
            "blog_count": len(blogs),
        },
        "blogs": blogs,
    }