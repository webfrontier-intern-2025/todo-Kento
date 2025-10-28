from sqlalchemy.orm import Session
from fastapi import HTTPException
from typing import List

from models import TagModel, TodoModel
from schemas.todo import TodoCreate, TodoUpdate
from sqlalchemy.orm import selectinload


def create(db: Session, create_todo_schema: TodoCreate) -> TodoModel:
    """TODOを作成"""
    todo_model = TodoModel(**create_todo_schema.model_dump(exclude={"tag_ids"}))
    if create_todo_schema.tag_ids:
        tags = (
            db.query(TagModel).filter(TagModel.id.in_(create_todo_schema.tag_ids)).all()
        )
        found_ids = {t.id for t in tags}
        missing = sorted(set(create_todo_schema.tag_ids) - found_ids)
        if missing:
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "INVALID_TAG_ID",
                    "message": "存在しないタグIDが含まれています。",
                    "details": [{"field": "tag_ids", "message": f"missing: {missing}"}],
                },
            )
        todo_model.tags = tags
    db.add(todo_model)
    db.commit()
    db.refresh(todo_model)
    return todo_model


def read(db: Session, todo_id: int) -> TodoModel | None:
    """指定されたIDのTODOを取得（タグを先読み）"""
    return (
        db.query(TodoModel)
        .options(selectinload(TodoModel.tags))
        .filter(TodoModel.id == todo_id)
        .first()
    )


def read_all(db: Session) -> list[TodoModel]:
    """すべてのTODOを取得（タグを先読み）"""
    return db.query(TodoModel).options(selectinload(TodoModel.tags)).all()


def update(
    db: Session, todo_model: TodoModel, update_todo_schema: TodoUpdate
) -> TodoModel:
    """TODOを更新"""
    update_data = update_todo_schema.model_dump(exclude={"tag_ids"}, exclude_unset=True)
    for k, v in update_data.items():
        setattr(todo_model, k, v)
    if update_todo_schema.tag_ids is not None:
        tags = (
            db.query(TagModel).filter(TagModel.id.in_(update_todo_schema.tag_ids)).all()
        )
        found_ids = {t.id for t in tags}
        missing = sorted(set(update_todo_schema.tag_ids) - found_ids)
        if missing:
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "INVALID_TAG_ID",
                    "message": "存在しないタグIDが含まれています。",
                    "details": [{"field": "tag_ids", "message": f"missing: {missing}"}],
                },
            )
        todo_model.tags = tags
    db.commit()
    db.refresh(todo_model)
    return todo_model


def delete(db: Session, todo_model: TodoModel) -> None:
    """TODOを削除"""
    db.delete(todo_model)
    db.commit()
