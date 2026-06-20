"""自我反思阶段服务：LLM 自评修复正确性。"""

from __future__ import annotations

from ..models.domain import AnalysisResult, ExecResult, FixResult, ReflectResult
from ..models.request import Language
from ..prompts.reflect import REFLECT_SYSTEM, REFLECT_USER_TEMPLATE
from ..utils.json_extract import extract_json
from .llm_client import LLMClient


async def reflect_fix(
    original_code: str,
    fixed_code: str,
    analysis: AnalysisResult,
    execution: ExecResult,
    language: Language,
    llm: LLMClient,
) -> ReflectResult:
    """让 LLM 自评修复是否正确，并给出置信度。"""
    bug_lines = []
    for i, b in enumerate(analysis.bugs, 1):
        loc = f"第 {b.line} 行" if b.line else "未知位置"
        bug_lines.append(f"{i}. [{loc}] [{b.severity}] {b.type}: {b.description}")
    bug_list = "\n".join(bug_lines) or "（无）"

    user_prompt = REFLECT_USER_TEMPLATE.format(
        language=language,
        original_code=original_code,
        fixed_code=fixed_code,
        stdout=execution.stdout[:1000],
        stderr=execution.stderr[:1000],
        exit_code=execution.exit_code,
        timed_out=execution.timed_out,
        bug_list=bug_list,
    )

    raw = await llm.chat(REFLECT_SYSTEM, user_prompt, temperature=0.1, json_mode=True)
    obj = extract_json(raw) or {}

    try:
        confidence = float(obj.get("confidence", 0.0))
    except (TypeError, ValueError):
        confidence = 0.0
    confidence = max(0.0, min(1.0, confidence))

    issues_raw = obj.get("issues") or []
    if not isinstance(issues_raw, list):
        issues_raw = []
    issues = [str(x) for x in issues_raw if x]

    return ReflectResult(
        is_correct=bool(obj.get("is_correct", False)),
        confidence=confidence,
        issues=issues,
        needs_retry=bool(obj.get("needs_retry", False)),
        suggestion=str(obj.get("suggestion") or ""),
    )