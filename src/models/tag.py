# タグモデル
from datetime import datetime

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class TagModel(Base):
    """
    タグモデル

    Attributes:
        id: タグID（主キー）
        name: タグ名（一意制約あり）
        color: タグの色（16進数カラーコード）
        created_at: 作成日時
        updated_at: 更新日時
        todos: このタグが付けられているTODOのリスト（多対多）
    """

    __tablename__ = "tag"

    # 主キー
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # タグ名（重複不可）
    name: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        unique=True,  # 同じ名前のタグは作れない
        comment="タグ名",
    )

    # タグの色を追加
    color: Mapped[str] = mapped_column(
        String(7),
        nullable=False,
        default="#667eea",  # デフォルト色
        comment="タグの色（16進数カラーコード）",
    )

    # タイムスタンプ
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.now, comment="作成日時"
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.now, onupdate=datetime.now, comment="更新日時"
    )

    # 多対多のリレーション
    # secondary="todo_tag" で中間テーブルを指定
    todos = relationship(
        "TodoModel",
        secondary="todo_tag",  # 中間テーブル名
        back_populates="tags",  # TodoModel側の属性名
    )
