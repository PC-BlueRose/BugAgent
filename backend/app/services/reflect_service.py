"""自我反思阶段服务：LLM 自评修复正确性。

增强：当执行实际成功（exit_code=0 且无超时）且 LLM 置信度足够高时，
自动覆盖 LLM 的 needs_retry=true，避免因 LLM 主观判断过度保守导致无谓重试。
"""

from __future__ import annotations

from ..models.domain import AnalysisResult, ExecResult, FixResult, ReflectResult
from ..models.request import Language
from ..prompts.reflect import REFLECT_SYSTEM, REFLECT_USER_TEMPLATE
from ..utils.json_extract import extract_json
from .llm_client import LLMClient

# 自动通过所需的最低置信度
AUTO_PASS_CONFIDENCE = 0.7


def _is_execution_successful(execution: ExecResult) -> bool:
    """判断执行是否真正成功：exit_code=0 且未超时。"""
    if execution.timed_out:
        return False
    if execution.exit_code != 0:
        return False
    return True


async def reflect_fix(
    original_code: str,
    fixed_code: str,
    analysis: AnalysisResult,
    execution: ExecResult,
    language: Language,
    llm: LLMClient,
) -> ReflectResult:
    """让 LLM 自评修复是否正确，并给出置信度。

    优化：
    1. 当执行实际成功（exit=0、无超时）且 LLM 置信度 ≥ AUTO_PASS_CONFIDENCE，
       自动覆盖 needs_retry=False（信任成功执行）
    2. 只有当执行真正失败或 LLM 极不确定时才进入下一轮
    """
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

    reflection = ReflectResult(
        is_correct=bool(obj.get("is_correct", False)),
        confidence=confidence,
        issues=issues,
        needs_retry=bool(obj.get("needs_retry", False)),
        suggestion=str(obj.get("suggestion") or ""),
    )

    # === 自动通过逻辑 ===
    # 当执行真正成功且 LLM 置信度足够高时，覆盖 needs_retry，
    # 避免 LLM 过度保守导致的无效重试
    if _is_execution_successful(execution) and confidence >= AUTO_PASS_CONFIDENCE:
        if reflection.needs_retry:
            reflection.needs_retry = False
            if not reflection.suggestion:
                reflection.suggestion = "（执行成功，自动通过）"
    return reflection