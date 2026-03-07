from fastapi import FastAPI
from .models import Base
from contextlib import asynccontextmanager
from .database import engine
from .routers import blog, user, authentication


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(lifespan=lifespan)

app.include_router(authentication.router)
app.include_router(blog.router)
app.include_router(user.router)

@app.get("/")
def home():
    return {"Message": "Welcome to articals!"}