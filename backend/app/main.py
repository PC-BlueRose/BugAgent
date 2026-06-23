"""FastAPI 应用入口。"""

import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import get_settings
from .routers import analyze, health

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

settings = get_settings()

app = FastAPI(
    title="Bug Agent API",
    version="0.1.0",
    description="基于 MiniMax 大模型的代码 Bug 自动识别与修复 Agent",
)

# CORS
# - frontend_origin="*" 时允许任意来源（部署场景）
# - 注意：CORS 规范不允许 `*` 与 `allow_credentials=True` 同时使用，
#   因此当设置为通配时关闭凭证；开发环境指定具体来源时再打开
_cors_origins: list[str] = (
    ["*"] if settings.frontend_origin.strip() == "*"
    else [o.strip() for o in settings.frontend_origin.split(",") if o.strip()]
)
_cors_credentials = settings.frontend_origin.strip() != "*"

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=_cors_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 路由
app.include_router(health.router)
app.include_router(analyze.router)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """兜底异常处理：返回 JSON 而非 HTML。"""
    logging.exception("未捕获异常 on %s %s: %s", request.method, request.url, exc)
    return JSONResponse(
        status_code=500,
        content={"detail": f"{type(exc).__name__}: {exc}"},
    )


@app.get("/")
async def root() -> dict:
    return {
        "name": "Bug Agent",
        "version": "0.1.0",
        "docs": "/docs",
        "endpoints": ["/api/health", "/api/analyze-stream"],
    }