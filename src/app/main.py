from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from .config import settings
from .routers import blog, user, authentication, subscribers, public, analytics, billing, pages, admin, categories, oauth, umami, support
from .domains.router import router as domains_router
from .middleware.cors import DynamicCORSMiddleware


app = FastAPI()

app.add_middleware(DynamicCORSMiddleware)


Path(settings.uploads_dir).mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.uploads_dir), name="uploads")

app.include_router(authentication.router)
app.include_router(oauth.router)
app.include_router(blog.router)
app.include_router(user.router)
app.include_router(subscribers.router)
app.include_router(analytics.router)
app.include_router(billing.router)
app.include_router(pages.router)
app.include_router(admin.router)
app.include_router(categories.router)
app.include_router(public.router)
app.include_router(domains_router)
app.include_router(umami.router)
app.include_router(support.router)

@app.get("/")
def home():
    return {"Message": "Welcome to articurls!"}