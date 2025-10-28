＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝
▼プロジェクト構造▼
＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝
・practical-fastapi/
　├── src/
　│   ├── api/          # APIエンドポイント
　│   ├── app/          # アプリケーション設定
　│   ├── crud/         # データベース操作
　│   ├── models/       # データベースモデル
　│   ├── schemas/      # リクエスト/レスポンススキーマ
　│   └── frontend/     # UI (HTML/CSS/JS)
　├── migration/        # Alembicマイグレーション
　├── seed/            # 初期データ投入
　└── tool/            # Postmanコレクション

＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝
▼データモデル▼
＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝
・TodoModel (src/models/todo.py)
　- id: int (主キー)
　- content: str (最大1024文字)
　- completed: bool (デフォルト: False)
　- deadline: datetime | None
　- created_at: datetime
　- updated_at: datetime
　- tags: list[TagModel] (多対多リレーション)

・TagModel (src/models/tag.py)
　- id: int (主キー)
　- name: str (最大50文字, ユニーク)
　- color: str (7文字, 16進数カラーコード)
　- created_at: datetime
　- updated_at: datetime
　- todos: list[TodoModel] (多対多リレーション)

・todo_tag (src/models/todo_tag.py)
　- todo_id: int (外部キー, CASCADE削除)
　- tag_id: int (外部キー, CASCADE削除)

＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝
▼API エンドポイント▼
＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝
・TODO関連 (src/api/todo.py)
　メソッド      　パス	　　　　    説明
　POST	        /v1/todo/	    　TODO作成
　GET	        /v1/todo/	    　TODO一覧取得
　GET	        /v1/todo/{id}	　TODO個別取得
　PUT	        /v1/todo/{id}	　TODO更新
　DELETE	    /v1/todo/{id}	　TODO削除

・タグ関連 (src/api/tag.py)
　メソッド      　パス	            説明
　POST	        /v1/tag/	    　タグ作成
　GET	        /v1/tag/	    　タグ一覧取得
　GET	        /v1/tag/{id}	　タグ個別取得
　PUT	        /v1/tag/{id}	　タグ更新
　DELETE	    /v1/tag/{id}	　タグ削除

＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝
▼スキーマ定義▼
＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝
・TODO (src/schemas/todo.py)
　┣TodoCreate   : content, deadline?, tag_ids[]
　┣TodoUpdate   : content?, completed?, deadline?, tag_ids?
　┗TodoResponse : 全フィールド + タグ情報

・タグ (src/schemas/tag.py)
　┣TagCreate: name, color (正規表現: ^#[0-9A-Fa-f]{6}$)
　┣TagUpdate: name?, color?
　┗TagResponse: 全フィールド

＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝
▼フロントエンド▼
＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝
・ページ構成
　URL	        テンプレート	    　説明
　/	            index.html	        ホーム
　/todo-list	todo_list.html	    TODOリスト表示
　/todos	    todos.html	        TODO管理
　/tags	        tags.html	        タグ管理

■主要機能
1.TODO管理 (todos.js)
　┣TODO追加/編集/削除
　┣タグ選択（カラーピッカー対応）
　┗クイックタグ追加

2.TODOリスト (todo_list.js)
　┣テーブル表示
　┣状態フィルター（全て/未完了/完了済み）
　┣タグフィルター
　┗統計情報表示（全TODO/未完了/完了済み/完了率）

3.タグ管理 (tags.js)
　┣タグ追加/編集/削除
　┗カラーピッカー対応

＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝
▼エラーハンドリング▼
＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝
・統一エラーレスポンス形式 (src/app/main.py)
{
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーメッセージ",
    "details": [
      {
        "field": "フィールド名",
        "message": "詳細メッセージ"
      }
    ]
  },
  "requestId": "リクエストID"
}

■主要エラーコード
　・VALIDATION_ERROR    (422): 入力検証エラー
　・NOT_FOUND           (404): リソース未検出
　・INVALID_TAG_ID      (400): 存在しないタグID
　・CONFLICT            (409): データ整合性エラー
　・INTERNAL_ERROR      (500): サーバーエラー

＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝
▼CRUD操作▼
＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝
・TODO (src/crud/todo.py)
　┣create(): タグIDの存在確認 + リレーション設定
　┣read(): タグを先読み（N+1問題回避）
　┣read_all(): 全TODO取得（タグ含む）
　┣update(): 部分更新対応 + タグ更新
　┗delete(): カスケード削除（todo_tagも自動削除）

・タグ (src/crud/tag.py)
　┣create(): タグ作成
　┣get_by_id(): ID検索
　┣get_by_name(): 名前検索
　┣update(): 部分更新対応
　┗delete(): カスケード削除

＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝
▼データベース▼
＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝
・設定 (src/app/database.py)
　┣SQLite/PostgreSQL対応
　┗セッション管理（依存性注入）

・マイグレーション履歴
　┣48ceb0c55790: todoテーブル作成
　┣ffaeda9f2780: completedカラム追加
　┣1e19ebd02140: deadlineカラム追加
　┣b1ff121d00db: tag/todo_tagテーブル作成
　┗f69369755296: colorカラム追加 + ユニーク制約