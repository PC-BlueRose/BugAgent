"""领域模型：4 个阶段的核心数据结构。"""

from typing import Literal, Optional

from pydantic import BaseModel, Field

Severity = Literal["low", "medium", "high"]


class BugItem(BaseModel):
    """单条 Bug 记录。"""

    line: Optional[int] = Field(None, description="Bug 所在行号（从 1 开始），无明确位置时为 null")
    type: str = Field(..., description="Bug 类型，如 SyntaxError / LogicError / NullPointer 等")
    description: str = Field(..., description="Bug 详细描述")
    severity: Severity = Field(..., description="严重程度")


class AnalysisResult(BaseModel):
    """系统分析阶段输出。"""

    summary: str = Field(..., description="整体分析摘要")
    bugs: list[BugItem] = Field(default_factory=list, description="Bug 列表")


class FixResult(BaseModel):
    """自动修复阶段输出。"""

    fixed_code: str = Field(..., description="修复后的完整代码")
    explanation: str = Field("", description="修复说明")


class ExecResult(BaseModel):
    """执行验证阶段输出。"""

    stdout: str = ""
    stderr: str = ""
    exit_code: int = -1
    timed_out: bool = False
    executed: bool = Field(..., description="是否真实执行（仅 Python 为 true）")
    note: str = Field("", description="备注（如 '模拟运行'）")


class ReflectResult(BaseModel):
    """自我反思阶段输出。"""

    is_correct: bool = Field(..., description="LLM 自评：修复是否正确")
    confidence: float = Field(..., ge=0.0, le=1.0, description="置信度 0-1")
    issues: list[str] = Field(default_factory=list, description="仍存在的问题列表")
    needs_retry: bool = Field(False, description="是否需要再次修复")
    suggestion: str = Field("", description="改进建议（重试时携带）")