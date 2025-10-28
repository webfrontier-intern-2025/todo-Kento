from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from crud import todo as todo_crud
from app.database import get_db
from schemas.todo import TodoCreate, TodoUpdate, TodoResponse

router = APIRouter()


@router.post("/todo/", response_model=TodoResponse, status_code=201)
def create_todo(todo_schema: TodoCreate, db: Session = Depends(get_db)):
    return todo_crud.create(db, todo_schema)


@router.get("/todo/", response_model=list[TodoResponse])
def list_todos(db: Session = Depends(get_db)):
    return todo_crud.read_all(db)


@router.get("/todo/{todo_id}", response_model=TodoResponse)
def get_todo(todo_id: int, db: Session = Depends(get_db)):
    todo = todo_crud.read(db, todo_id)
    if not todo:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "NOT_FOUND",
                "message": "TODOが見つかりません。",
                "details": [],
            },
        )
    return todo


@router.put("/todo/{todo_id}", response_model=TodoResponse)
def update_todo(todo_id: int, todo_schema: TodoUpdate, db: Session = Depends(get_db)):
    todo = todo_crud.read(db, todo_id)
    if not todo:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "NOT_FOUND",
                "message": "TODOが見つかりません。",
                "details": [],
            },
        )
    return todo_crud.update(db, todo, todo_schema)


@router.delete("/todo/{todo_id}", status_code=204)
def delete_todo(todo_id: int, db: Session = Depends(get_db)):
    todo = todo_crud.read(db, todo_id)
    if not todo:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "NOT_FOUND",
                "message": "TODOが見つかりません。",
                "details": [],
            },
        )
    todo_crud.delete(db, todo)
    return None
