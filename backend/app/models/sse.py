"""SSE 事件模型。"""

from enum import Enum
from typing import Any, Optional


class EventType(str, Enum):
    """SSE 事件类型枚举。"""

    START = "start"
    ANALYSIS = "analysis"
    FIX = "fix"
    EXECUTION = "execution"
    REFLECTION = "reflection"
    RETRY = "retry"
    DONE = "done"
    ERROR = "error"


class SSEEvent:
    """SSE 事件包装。"""

    def __init__(
        self,
        type: EventType,
        payload: Optional[dict[str, Any]] = None,
        round: Optional[int] = None,
    ) -> None:
        self.type = type
        self.payload = payload or {}
        self.round = round

    def to_sse(self) -> dict[str, str]:
        """序列化为 sse-starlette 要求的 dict 格式。"""
        import json

        data: dict[str, Any] = {"type": self.type.value, "payload": self.payload}
        if self.round is not None:
            data["round"] = self.round
        return {"event": self.type.value, "data": json.dumps(data, ensure_ascii=False)}

    def model_dump(self) -> dict[str, Any]:
        """用于日志或调试。"""
        return {"type": self.type.value, "round": self.round, "payload": self.payload}