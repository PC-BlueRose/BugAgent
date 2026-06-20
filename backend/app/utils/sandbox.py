"""Python 代码沙箱执行：subprocess + 超时 + (类 Unix) 资源限制。

注意：Windows 下 `resource` 模块不可用，仅靠 timeout 兜底。
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from ..models.domain import ExecResult

IS_WINDOWS = sys.platform.startswith("win")


def _apply_resource_limits(mem_mb: int) -> None:
    """在子进程中设置资源限制（仅 POSIX 平台）。"""
    if IS_WINDOWS:
        return
    try:
        import resource

        # CPU 时间限制（秒）
        resource.setrlimit(resource.RLIMIT_CPU, (5, 5))
        # 内存限制
        mem_bytes = mem_mb * 1024 * 1024
        resource.setrlimit(resource.RLIMIT_AS, (mem_bytes, mem_bytes))
        # 进程数限制（防 fork bomb）
        try:
            resource.setrlimit(resource.RLIMIT_NPROC, (1, 1))
        except (ValueError, OSError):
            pass
        # 禁止创建 core dump
        resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
    except Exception:
        # 沙箱限制失败不影响主流程
        pass


def run_python(code: str, *, timeout_sec: int = 5, mem_mb: int = 256) -> ExecResult:
    """在临时目录中执行 Python 代码，返回执行结果。

    超时返回 timed_out=True，exit_code=-1。
    任何子进程异常都被捕获并返回安全的 ExecResult。
    """
    tmp_dir = Path(tempfile.mkdtemp(prefix="bug_sandbox_"))
    src_file = tmp_dir / "main.py"
    try:
        src_file.write_text(code, encoding="utf-8")

        proc = subprocess.run(
            [sys.executable, "-I", "-B", "-u", str(src_file)],
            capture_output=True,
            text=True,
            timeout=timeout_sec,
            preexec_fn=_apply_resource_limits(mem_mb) if not IS_WINDOWS else None,
        )
        return ExecResult(
            stdout=proc.stdout or "",
            stderr=proc.stderr or "",
            exit_code=proc.returncode,
            timed_out=False,
            executed=True,
            note="Python 真实执行",
        )
    except subprocess.TimeoutExpired as e:
        return ExecResult(
            stdout=(e.stdout or b"").decode("utf-8", errors="replace") if isinstance(e.stdout, bytes) else (e.stdout or ""),
            stderr=(e.stderr or b"").decode("utf-8", errors="replace") if isinstance(e.stderr, bytes) else (e.stderr or ""),
            exit_code=-1,
            timed_out=True,
            executed=True,
            note=f"执行超时（>{timeout_sec}s），已强制终止",
        )
    except Exception as e:  # noqa: BLE001
        return ExecResult(
            stdout="",
            stderr=str(e),
            exit_code=-1,
            timed_out=False,
            executed=True,
            note=f"执行异常: {type(e).__name__}",
        )
    finally:
        try:
            shutil.rmtree(tmp_dir, ignore_errors=True)
        except Exception:
            pass