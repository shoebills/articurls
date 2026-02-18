from fastapi import FastAPI
from .routers import blog, user, authentication

app = FastAPI()

app.include_router(authentication.router)
app.include_router(blog.router)
app.include_router(user.router)

@app.get("/")
def home():
    return {"Message": "Welcome to articals!"}