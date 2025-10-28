# タグ関連のCRUD処理
from sqlalchemy.orm import Session

from models.tag import TagModel
from schemas.tag import TagCreate, TagUpdate


def create(db: Session, create_tag_schema: TagCreate) -> TagModel:
    """タグを作成"""
    tag_model = TagModel(**create_tag_schema.model_dump())
    db.add(tag_model)
    db.commit()
    db.refresh(tag_model)
    return tag_model


def get_by_id(db: Session, tag_id: int) -> TagModel | None:
    """IDでタグを取得"""
    return db.query(TagModel).filter(TagModel.id == tag_id).first()


def get_by_name(db: Session, name: str) -> TagModel | None:
    """名前でタグを取得"""
    return db.query(TagModel).filter(TagModel.name == name).first()


def get(db: Session, skip: int = 0, limit: int = 100) -> list[TagModel]:
    """タグ一覧を取得"""
    return db.query(TagModel).offset(skip).limit(limit).all()


def update(db: Session, tag_id: int, update_tag_schema: TagUpdate) -> TagModel | None:
    """タグを更新"""
    tag_model = get_by_id(db, tag_id)
    if tag_model is None:
        return None

    # 更新データを適用
    for key, value in update_tag_schema.model_dump(exclude_unset=True).items():
        setattr(tag_model, key, value)

    db.commit()
    db.refresh(tag_model)
    return tag_model


def delete(db: Session, tag_id: int) -> int | None:
    """タグを削除"""
    tag_model = get_by_id(db, tag_id)
    if tag_model is None:
        return None

    db.delete(tag_model)
    db.commit()
    return tag_id
