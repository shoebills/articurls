from fastapi import FastAPI
from .routers import post, user

app = FastAPI()

app.include_router(post.router)
app.include_router(user.router)

@app.get("/")
def home():
    return {"Welcome to articals!"}