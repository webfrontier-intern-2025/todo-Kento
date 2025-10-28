# タグとTODOの多対多の関係を定義する中間テーブル
from sqlalchemy import Column, ForeignKey, Integer, Table

from app.database import Base


# 中間テーブル（多対多の関係を実現）
todo_tag = Table(
    "todo_tag",  # テーブル名
    Base.metadata,
    # TODOのID（外部キー）
    Column(
        "todo_id",
        Integer,
        ForeignKey("todo.id", ondelete="CASCADE"),  # TODOが削除されたら関連も削除
        primary_key=True,
    ),
    # タグのID（外部キー）
    Column(
        "tag_id",
        Integer,
        ForeignKey("tag.id", ondelete="CASCADE"),  # タグが削除されたら関連も削除
        primary_key=True,
    ),
)
