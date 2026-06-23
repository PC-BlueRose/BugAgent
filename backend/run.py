"""生产环境入口：在 backend 目录下执行 `python run.py` 即可启动服务。

之所以需要这个文件：
- 直接 `uvicorn app.main:app` 要求当前工作目录是 backend/，否则会报
  `ModuleNotFoundError: No module named 'app'`。
- 用本文件作为入口时，会自动把 backend/ 加入 sys.path，
  并从 .env 读取 host/port，避免依赖 cd。
"""
from __future__ import annotations

import sys
from pathlib import Path

# 把当前文件所在目录（即 backend/）加入模块搜索路径
_BACKEND_DIR = Path(__file__).resolve().parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

import uvicorn  # noqa: E402  必须在 sys.path 处理之后导入

from app.config import get_settings  # noqa: E402


def main() -> None:
    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        # 生产环境建议关掉 reload
        reload=False,
        # 打印每一次 HTTP 请求，便于排查
        access_log=True,
        log_level="info",
    )


if __name__ == "__main__":
    main()
