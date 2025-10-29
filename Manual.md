// ...existing code...
# practical-fastapi — プレビュー

概要
- FastAPI + SQLAlchemy の TODO 管理アプリ。
- フロント: Jinja2 テンプレート + 静的 JS/CSS。
- 主な機能: TODO 管理、タグ管理、一覧フィルタ、統計表示。

構成（要点）
- src/
  - api/     : v1 のルータ（todo, tag）
  - app/     : FastAPI 初期化・DB・設定
  - crud/    : DB 操作（todo/tag）
  - models/  : SQLAlchemy モデル
  - schemas/ : Pydantic スキーマ
  - frontend/: templates + static (js / css)
- migration/ : Alembic マイグレーション
- seed/      : 初期データ + seeder
- tool/      : Postman 等

データモデル（短縮）
- Todo
  - id, content (<=1024), completed (bool), deadline?, created_at, updated_at
  - tags: 多対多 (todo_tag)
- Tag
  - id, name (<=50, unique), color (^#[0-9A-Fa-f]{6}$), created_at, updated_at
- todo_tag: todo_id, tag_id（ON DELETE CASCADE 想定）

主要 API（v1）
- TODO
  - POST   /v1/todo/        作成 (tag_ids を受け取る)
  - GET    /v1/todo/        一覧（tags を含む）
  - GET    /v1/todo/{id}    詳細
  - PUT    /v1/todo/{id}    更新（部分更新可）
  - DELETE /v1/todo/{id}    削除
- TAG
  - POST   /v1/tag/         作成
  - GET    /v1/tag/         一覧
  - GET    /v1/tag/{id}     詳細
  - PUT    /v1/tag/{id}     更新
  - DELETE /v1/tag/{id}     削除

スキーマ（抜粋）
- TodoCreate: content, deadline?, tag_ids?
- TodoUpdate: partial fields + tag_ids?
- TodoResponse: 全フィールド + tags (TagResponse)
- TagCreate: name, color (regex ^#[0-9A-Fa-f]{6}$)
- TagResponse: 全フィールド

フロント（短く）
- ルート: / (index), /todo-list, /todos (作成/編集), /tags
- 主な JS:
  - main.js: 共通トースト / バリデーション表示
  - todos.js: TODO 作成/更新/削除、タグ選択
  - todo_list.js: 一覧描画、フィルター、統計
  - tags.js: タグ CRUD、カラーピッカー連携
- フロントは fetch で /v1/* を呼ぶ。エラーは統一フォーマット前提。

エラー返却フォーマット（必須）
{
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーメッセージ",
    "details": [
      { "field": "フィールド名", "message": "詳細メッセージ" }
    ]
  },
  "requestId": "UUID"
}
主要エラーコード: VALIDATION_ERROR (422), NOT_FOUND (404), INVALID_TAG_ID (400), CONFLICT (409), INTERNAL_ERROR (500)

CRUD 層の要点
- Todo: create() は tag_ids 存在チェック、read() は joinedload で N+1 回避、update() はタグ差分更新
- Tag: name のユニーク違反は CONFLICT を返す

データベース / マイグレーション
- DB 設定: src/app/settings.py（.env で DATABASE_URL 指定可）
- デフォルト: SQLite。Postgres を使う場合は .env を設定。
- セッション: SessionLocal を DI で利用
- Alembic: migration/env.py が models.Base.metadata を参照
- 主要コマンド:
  - マイグレーションを最新化: alembic upgrade head


📁 src 
├── 📁 api                 # v1 API 実装
├── 📁 app
│   ├── main.py            # FastAPI エントリポイント
│   ├── settings.py        # 環境変数・設定
│   ├── database.py        # DB接続・セッション
│   └── router.py          # APIルータ統合
├── 📁 crud                # DB操作ロジック
├── 📁 models              # SQLAlchemy モデル定義
├── 📁 schemas             # Pydantic スキーマ
└── 📁 frontend            # フロントエンド