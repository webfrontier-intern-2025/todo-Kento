import json
from logging import config

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi_route_logger_middleware import RouteLoggerMiddleware
from starlette.middleware.cors import CORSMiddleware

# 追加インポート（エラー統一ハンドリング用）
from fastapi import HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from typing import Any, Dict, List, Optional
from uuid import uuid4

try:
    from sqlalchemy.exc import IntegrityError
except Exception:

    class IntegrityError(Exception):
        pass


from app import settings
from app.router import api_router

from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.responses import RedirectResponse


app = FastAPI(
    title=settings.PROJECT_NAME, openapi_url=f"{settings.API_VER_STR}/openapi.json"
)


# 統一エラーレスポンス整形と例外ハンドラ群
def _json_error(
    status: int,
    code: str,
    message: str,
    details: Optional[List[Dict[str, Any]]] = None,
    request_id: Optional[str] = None,
):
    return JSONResponse(
        status_code=status,
        content={
            "error": {"code": code, "message": message, "details": details or []},
            "requestId": request_id,
        },
    )


@app.middleware("http")
async def _add_request_id(request: Request, call_next):
    rid = request.headers.get("X-Request-ID") or str(uuid4())
    request.state.request_id = rid
    response = await call_next(request)
    response.headers["X-Request-ID"] = rid
    return response


@app.exception_handler(RequestValidationError)
async def _validation_handler(request: Request, exc: RequestValidationError):
    det: List[Dict[str, Any]] = []
    for err in exc.errors():
        loc = err.get("loc", [])
        field = (
            ".".join([str(x) for x in loc if x not in ("body", "query", "path")])
            or None
        )
        det.append(
            {
                "code": "VALIDATION_ERROR",
                "message": err.get("msg", "Invalid input"),
                "field": field,
            }
        )
    return _json_error(
        422,
        "VALIDATION_ERROR",
        "入力内容を確認してください。",
        details=det,
        request_id=getattr(request.state, "request_id", None),
    )


@app.exception_handler(HTTPException)
async def _http_handler(request: Request, exc: HTTPException):
    detail = (
        exc.detail if isinstance(exc.detail, dict) else {"message": str(exc.detail)}
    )
    code = detail.get("code") or {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        409: "CONFLICT",
        429: "RATE_LIMITED",
    }.get(exc.status_code, "HTTP_ERROR")
    return _json_error(
        exc.status_code,
        code,
        detail.get("message") or "リクエストを処理できませんでした。",
        details=detail.get("details") or [],
        request_id=getattr(request.state, "request_id", None),
    )


# StarletteのHTTPException（未定義ルート等）を統一フォーマットで返す
@app.exception_handler(StarletteHTTPException)
async def _starlette_http_handler(request: Request, exc: StarletteHTTPException):
    status = exc.status_code
    code = {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        405: "METHOD_NOT_ALLOWED",
        429: "RATE_LIMITED",
    }.get(status, "HTTP_ERROR")
    message = (
        "対象が見つかりませんでした。"
        if status == 404
        else (str(getattr(exc, "detail", "")) or "リクエストを処理できませんでした。")
    )
    return _json_error(
        status,
        code,
        message,
        details=[],
        request_id=getattr(request.state, "request_id", None),
    )


@app.exception_handler(IntegrityError)
async def _integrity_handler(request: Request, exc: IntegrityError):
    return _json_error(
        409,
        "CONFLICT",
        "データの整合性エラーが発生しました。やり直してください。",
        request_id=getattr(request.state, "request_id", None),
    )


@app.exception_handler(Exception)
async def _unhandled(request: Request, exc: Exception):
    return _json_error(
        500,
        "INTERNAL_ERROR",
        "問題が発生しました。時間をおいて再度お試しください。",
        request_id=getattr(request.state, "request_id", None),
    )


# /favicon.ico を /static/favicon.svg にリダイレクト
@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return RedirectResponse(url="/static/favicon.svg", status_code=307)


with open(settings.LOGGING_CONF, encoding="utf-8") as f:
    config.dictConfig(json.load(f))

# Set all CORS enabled origins
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# テンプレートと静的ファイルの設定
templates = Jinja2Templates(directory="src/frontend/templates")
app.mount("/static", StaticFiles(directory="src/frontend/static"), name="static")

# APIルーター
app.include_router(api_router, prefix=settings.API_VER_STR)


# UIのルート
@app.get("/", include_in_schema=False)
async def read_root(request: Request):
    """TODOアプリのトップページ"""
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/todos", include_in_schema=False)
async def read_todos_page(request: Request):
    """TODO一覧ページ"""
    return templates.TemplateResponse("todos.html", {"request": request})


@app.get("/todo-list", include_in_schema=False)
async def read_todo_list_page(request: Request):
    """TODOリスト表示ページ"""
    return templates.TemplateResponse("todo_list.html", {"request": request})


@app.get("/tags", include_in_schema=False)
async def read_tags_page(request: Request):
    """タグ管理ページ"""
    return templates.TemplateResponse("tags.html", {"request": request})


@app.get("/licenses", include_in_schema=False)
async def read_licenses_page(request: Request):
    """オープンソースライセンスページ"""
    return templates.TemplateResponse("licenses.html", {"request": request})


@app.get("/terms", include_in_schema=False)
async def read_terms_page(request: Request):
    """利用規約ページ"""
    return templates.TemplateResponse("terms.html", {"request": request})
