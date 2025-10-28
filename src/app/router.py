from fastapi import APIRouter

from api import todo, tag

api_router = APIRouter()
api_router.include_router(todo.router, tags=["todo"])
api_router.include_router(tag.router, tags=["tag"])
