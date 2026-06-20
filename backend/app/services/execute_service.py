"""执行验证阶段服务：

- Python：subprocess 真实执行（utils.sandbox）
- 其他语言：调 LLM 模拟运行结果
"""

from __future__ import annotations

from ..config import Settings
from ..models.domain import ExecResult
from ..models.request import Language
from ..prompts.execute_sim import EXECUTE_SIM_SYSTEM, EXECUTE_SIM_USER_TEMPLATE
from ..utils.json_extract import extract_json
from ..utils.sandbox import run_python
from .llm_client import LLMClient


async def execute_code(
    code: str,
    language: Language,
    llm: LLMClient,
    settings: Settings,
) -> ExecResult:
    """执行代码（Python 真实，其他模拟）。"""
    if language == "python":
        return run_python(
            code,
            timeout_sec=settings.python_exec_timeout_sec,
            mem_mb=settings.python_mem_limit_mb,
        )

    # C / C++ / Java：模拟运行
    user_prompt = EXECUTE_SIM_USER_TEMPLATE.format(language=language, code=code)
    raw = await llm.chat(EXECUTE_SIM_SYSTEM, user_prompt, temperature=0.1, json_mode=True)
    obj = extract_json(raw) or {}
    return ExecResult(
        stdout=str(obj.get("stdout") or ""),
        stderr=str(obj.get("stderr") or ""),
        exit_code=int(obj.get("exit_code") or 0),
        timed_out=False,
        executed=False,
        note=f"{language} 模拟执行（未真实编译运行）",
    )