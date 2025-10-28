from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from crud import tag as tag_crud
from app.database import get_db
from schemas.tag import TagCreate, TagResponse, TagUpdate

router = APIRouter()


@router.post("/tag/", response_model=TagResponse, status_code=201)
def create_tag(tag_schema: TagCreate, db: Session = Depends(get_db)):
    return tag_crud.create(db, tag_schema)


@router.get("/tag/", response_model=list[TagResponse])
def list_tags(db: Session = Depends(get_db)):
    return tag_crud.get(db)


@router.get("/tag/{tag_id}", response_model=TagResponse)
def get_tag(tag_id: int, db: Session = Depends(get_db)):
    tag = tag_crud.get_by_id(db, tag_id)
    if not tag:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "NOT_FOUND",
                "message": "タグが見つかりません。",
                "details": [],
            },
        )
    return tag


@router.put("/tag/{tag_id}", response_model=TagResponse)
def update_tag(tag_id: int, tag_schema: TagUpdate, db: Session = Depends(get_db)):
    updated = tag_crud.update(db, tag_id, tag_schema)
    if updated is None:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "NOT_FOUND",
                "message": "タグが見つかりません。",
                "details": [],
            },
        )
    return updated


@router.delete("/tag/{tag_id}", status_code=204)
def delete_tag(tag_id: int, db: Session = Depends(get_db)):
    deleted_id = tag_crud.delete(db, tag_id)
    if deleted_id is None:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "NOT_FOUND",
                "message": "タグが見つかりません。",
                "details": [],
            },
        )
    return None
