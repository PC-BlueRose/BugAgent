"""SSE 分析流端点。"""

import asyncio
import logging

from fastapi import APIRouter, Depends
from sse_starlette.sse import EventSourceResponse

from ..config import Settings, get_settings
from ..models.request import AnalyzeRequest
from ..models.sse import EventType, SSEEvent
from ..services import orchestrator
from ..services.llm_client import LLMClient

router = APIRouter(prefix="/api", tags=["analyze"])
logger = logging.getLogger(__name__)


@router.post("/analyze-stream")
async def analyze_stream(
    req: AnalyzeRequest,
    settings: Settings = Depends(get_settings),
) -> EventSourceResponse:
    """接收代码与语言，按 4 步流水线推送 SSE 事件。"""

    async def event_generator():
        llm = LLMClient(settings)
        try:
            async for ev in orchestrator.run_pipeline(
                code=req.code, language=req.language, llm=llm, settings=settings
            ):
                yield ev.to_sse()
                # 让出事件循环，避免 SSE 帧粘连
                await asyncio.sleep(0)
        except asyncio.CancelledError:
            logger.info("客户端断开 SSE 连接")
            raise
        except Exception as e:  # noqa: BLE001
            logger.exception("流水线异常: %s", e)
            err_ev = SSEEvent(
                EventType.ERROR, payload={"message": f"{type(e).__name__}: {e}"}
            )
            yield err_ev.to_sse()
        finally:
            await llm.aclose()

    return EventSourceResponse(event_generator())