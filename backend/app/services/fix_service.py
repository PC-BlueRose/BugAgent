"""自动修复阶段服务：基于 Bug 列表生成修复代码。"""

from __future__ import annotations

import re

from ..models.domain import AnalysisResult, FixResult
from ..models.request import Language
from ..prompts.fix import FIX_SYSTEM, FIX_USER_TEMPLATE
from .llm_client import LLMClient

CODE_BLOCK_RE = re.compile(r"```[a-zA-Z]*\s*([\s\S]*?)```", re.MULTILINE)
FENCE_SECTION_RE = re.compile(
    r"===FIXED_CODE_START===\s*```[a-zA-Z]*\s*([\s\S]*?)```\s*===FIXED_CODE_END===",
    re.IGNORECASE,
)


def _extract_fixed_code(raw: str) -> tuple[str, str]:
    """从 LLM 输出中抽取修复后的代码与说明。

    返回 (code, explanation)。优先匹配 FIXED_CODE_START/END 标记，
    否则退化为第一个代码块 + 代码块之前的所有文本作为说明。
    """
    if not raw:
        return "", ""

    m = FENCE_SECTION_RE.search(raw)
    if m:
        code = m.group(1).strip()
        before = raw[: m.start()].strip()
        after = raw[m.end() :].strip()
        explanation = (before + ("\n" + after if after else "")).strip()
        return code, explanation

    blocks = CODE_BLOCK_RE.findall(raw)
    if blocks:
        code = blocks[0].strip()
        # 说明 = 第一个代码块之前的文字
        first_block = CODE_BLOCK_RE.search(raw)
        if first_block:
            explanation = raw[: first_block.start()].strip()
        else:
            explanation = ""
        return code, explanation

    # 无代码块：整段当作代码，说明为空
    return raw.strip(), ""


async def fix_code(
    code: str,
    language: Language,
    analysis: AnalysisResult,
    llm: LLMClient,
) -> FixResult:
    """基于分析结果调用 LLM 修复代码。"""
    if not analysis.bugs:
        # 无 Bug：原样返回
        return FixResult(fixed_code=code, explanation="原始代码无明显 Bug，未做修改。")

    bug_lines = []
    for i, b in enumerate(analysis.bugs, 1):
        loc = f"第 {b.line} 行" if b.line else "未知位置"
        bug_lines.append(f"{i}. [{loc}] [{b.severity}] {b.type}: {b.description}")
    bug_list = "\n".join(bug_lines)

    user_prompt = FIX_USER_TEMPLATE.format(
        language=language, bug_list=bug_list, code=code
    )
    raw = await llm.chat(FIX_SYSTEM, user_prompt, temperature=0.2)
    fixed_code, explanation = _extract_fixed_code(raw)
    if not fixed_code:
        # 兜底：使用原文
        fixed_code = code
        explanation = "LLM 未返回有效代码块，保持原样。"
    return FixResult(fixed_code=fixed_code, explanation=explanation)