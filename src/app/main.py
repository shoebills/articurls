from fastapi import FastAPI
from .routers import blog, user, authentication, subscribers, public, analytics, billing


app = FastAPI()

app.include_router(authentication.router)
app.include_router(blog.router)
app.include_router(user.router)
app.include_router(subscribers.router)
app.include_router(analytics.router)
app.include_router(public.router)
app.include_router(billing.router)

@app.get("/")
def home():
    return {"Message": "Welcome to articurls!"}