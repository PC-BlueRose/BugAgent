"""流水线编排器：4 步流水线 + 反思循环。"""

from __future__ import annotations

from typing import AsyncIterator

from ..config import Settings
from ..models.request import Language
from ..models.sse import EventType, SSEEvent
from . import analyze_service, execute_service, fix_service, reflect_service
from .llm_client import LLMClient


async def run_pipeline(
    code: str,
    language: Language,
    llm: LLMClient,
    settings: Settings,
) -> AsyncIterator[SSEEvent]:
    """依次执行 4 个阶段，按需重试。

    事件顺序：start → analysis → (fix → execution → reflection → [retry])* → done
    """
    yield SSEEvent(EventType.START, payload={"language": language})

    # 1. 系统分析
    analysis = await analyze_service.analyze_code(code, language, llm)
    yield SSEEvent(EventType.ANALYSIS, payload=analysis.model_dump())

    # 2-4. 修复 → 执行 → 反思（多轮）
    last_round = 0
    for round_idx in range(1, settings.max_reflect_rounds + 1):
        last_round = round_idx
        fix = await fix_service.fix_code(code, language, analysis, llm)
        yield SSEEvent(EventType.FIX, payload=fix.model_dump(), round=round_idx)

        execution = await execute_service.execute_code(
            fix.fixed_code, language, llm, settings
        )
        yield SSEEvent(EventType.EXECUTION, payload=execution.model_dump(), round=round_idx)

        reflection = await reflect_service.reflect_fix(
            original_code=code,
            fixed_code=fix.fixed_code,
            analysis=analysis,
            execution=execution,
            language=language,
            llm=llm,
        )
        yield SSEEvent(EventType.REFLECTION, payload=reflection.model_dump(), round=round_idx)

        if (
            reflection.confidence >= settings.reflect_confidence_threshold
            and not reflection.needs_retry
        ):
            break

        # 决定是否进入下一轮
        yield SSEEvent(
            EventType.RETRY,
            payload={
                "round": round_idx,
                "reason": reflection.suggestion or "置信度未达标",
                "confidence": reflection.confidence,
            },
            round=round_idx,
        )

    yield SSEEvent(EventType.DONE, payload={"rounds": last_round})