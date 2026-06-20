"""健康检查端点。"""

from fastapi import APIRouter, Depends

from ..config import Settings, get_settings

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
async def health(settings: Settings = Depends(get_settings)) -> dict:
    """返回服务状态与当前模型信息。"""
    return {
        "status": "ok",
        "model": settings.minimax_model,
        "base_url": settings.minimax_base_url,
    }