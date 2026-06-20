"""请求体模型。"""

from typing import Literal

from pydantic import BaseModel, Field

Language = Literal["python", "c", "cpp", "java"]


class AnalyzeRequest(BaseModel):
    """`POST /api/analyze-stream` 请求体。"""

    code: str = Field(..., min_length=1, description="待分析的源代码")
    language: Language = Field(..., description="代码语言")