"""系统分析阶段服务：从 LLM 获取 Bug 列表。"""

from __future__ import annotations

from ..models.domain import AnalysisResult, BugItem
from ..models.request import Language
from ..prompts.analyze import ANALYZE_SYSTEM, ANALYZE_USER_TEMPLATE
from ..utils.json_extract import extract_json
from .llm_client import LLMClient


async def analyze_code(
    code: str,
    language: Language,
    llm: LLMClient,
) -> AnalysisResult:
    """调用 LLM 分析代码并返回结构化 Bug 列表。"""
    user_prompt = ANALYZE_USER_TEMPLATE.format(language=language, code=code)
    raw = await llm.chat(ANALYZE_SYSTEM, user_prompt, temperature=0.1, json_mode=True)

    obj = extract_json(raw) or {}
    bugs_raw = obj.get("bugs") or []
    bugs: list[BugItem] = []
    for b in bugs_raw:
        if not isinstance(b, dict):
            continue
        try:
            bugs.append(
                BugItem(
                    line=b.get("line"),
                    type=str(b.get("type") or "Unknown"),
                    description=str(b.get("description") or ""),
                    severity=b.get("severity") if b.get("severity") in ("low", "medium", "high") else "medium",
                )
            )
        except Exception:  # noqa: BLE001
            continue

    summary = str(obj.get("summary") or "（无摘要）")
    return AnalysisResult(summary=summary, bugs=bugs)