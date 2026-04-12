from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from .config import settings
from .routers import blog, user, authentication, subscribers, public, analytics, billing, custom_domain_public


app = FastAPI()


Path(settings.uploads_dir).mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.uploads_dir), name="uploads")

app.include_router(authentication.router)
app.include_router(blog.router)
app.include_router(user.router)
app.include_router(subscribers.router)
app.include_router(analytics.router)
app.include_router(custom_domain_public.router)
app.include_router(public.router)
app.include_router(billing.router)

@app.get("/")
def home():
    return {"Message": "Welcome to articurls!"}