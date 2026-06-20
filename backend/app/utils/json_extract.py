"""从 LLM 文本输出中提取 JSON 对象（兜底逻辑）。"""

from __future__ import annotations

import json
import re
from typing import Any


def extract_json(text: str) -> dict[str, Any] | None:
    """从字符串中抽取第一个完整的 JSON 对象。

    策略：
    1. 尝试去除 markdown 代码块包裹（```json ... ```）后直接解析
    2. 失败时用正则匹配最外层 {...} 并解析
    """
    if not text:
        return None

    # 去除前后空白
    cleaned = text.strip()

    # 1. 去除 markdown 代码块
    fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", cleaned, re.IGNORECASE)
    if fence_match:
        cleaned = fence_match.group(1).strip()

    # 2. 尝试直接解析
    try:
        obj = json.loads(cleaned)
        if isinstance(obj, dict):
            return obj
    except json.JSONDecodeError:
        pass

    # 3. 用正则查找第一个 {...}
    brace_match = re.search(r"\{[\s\S]*\}", text)
    if brace_match:
        candidate = brace_match.group(0)
        try:
            obj = json.loads(candidate)
            if isinstance(obj, dict):
                return obj
        except json.JSONDecodeError:
            # 尝试宽松解析（截断尾部）
            for end in range(len(candidate), 0, -1):
                try:
                    obj = json.loads(candidate[:end])
                    if isinstance(obj, dict):
                        return obj
                except json.JSONDecodeError:
                    continue
    return None