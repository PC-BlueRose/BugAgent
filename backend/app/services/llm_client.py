"""MiniMax OpenAI 风格 API 客户端（异步）。

通过 httpx 直接 POST /chat/completions，避免引入 openai SDK。
支持：
- chat(): 一次性返回完整内容
- stream_chat(): 流式迭代 token
- json_mode=True 强制 response_format=json_object
- 自动重试（指数退避）以应对瞬时网络错误
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import AsyncIterator

import httpx

from ..config import Settings

logger = logging.getLogger(__name__)


# 可重试的 HTTP 状态码（429 限流 + 5xx 服务端错误）
RETRYABLE_STATUS = {408, 425, 429, 500, 502, 503, 504}


class LLMError(RuntimeError):
    """LLM 调用相关错误。"""


class LLMClient:
    """MiniMax /chat/completions 异步客户端（带重试）。"""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._max_retries = 3
        self._client = httpx.AsyncClient(
            base_url=settings.minimax_base_url.rstrip("/"),
            headers={
                "Authorization": f"Bearer {settings.minimax_api_key}",
                "Content-Type": "application/json",
            },
            timeout=httpx.Timeout(settings.llm_timeout_sec),
        )

    async def aclose(self) -> None:
        await self._client.aclose()

    async def __aenter__(self) -> "LLMClient":
        return self

    async def __aexit__(self, *exc: object) -> None:
        await self.aclose()

    def _build_body(
        self,
        system: str,
        user: str,
        *,
        temperature: float,
        json_mode: bool,
        stream: bool,
    ) -> dict:
        body: dict = {
            "model": self._settings.minimax_model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": temperature,
            "stream": stream,
        }
        if json_mode:
            body["response_format"] = {"type": "json_object"}
        return body

    async def chat(
        self,
        system: str,
        user: str,
        *,
        temperature: float = 0.2,
        json_mode: bool = False,
    ) -> str:
        """非流式调用，返回完整回复文本（带自动重试）。"""
        body = self._build_body(
            system, user, temperature=temperature, json_mode=json_mode, stream=False
        )
        last_error: Exception | None = None
        for attempt in range(1, self._max_retries + 1):
            try:
                resp = await self._client.post("/chat/completions", json=body)
            except (httpx.HTTPError, httpx.TimeoutException) as e:
                last_error = LLMError(f"LLM 网络错误: {e}")
                logger.warning(
                    "[llm] network error on attempt %d/%d: %s",
                    attempt, self._max_retries, e,
                )
                if attempt < self._max_retries:
                    await self._sleep_backoff(attempt)
                    continue
                raise last_error from e

            # 处理可重试的 HTTP 状态
            if resp.status_code in RETRYABLE_STATUS:
                last_error = LLMError(
                    f"LLM 返回可重试状态 {resp.status_code}: {resp.text[:300]}"
                )
                logger.warning(
                    "[llm] retryable status %d on attempt %d/%d",
                    resp.status_code, attempt, self._max_retries,
                )
                if attempt < self._max_retries:
                    await self._sleep_backoff(attempt)
                    continue
                raise last_error

            # 不可重试的 4xx
            if resp.status_code != 200:
                raise LLMError(
                    f"LLM 返回非 200: status={resp.status_code}, body={resp.text[:500]}"
                )

            # 成功
            data = resp.json()
            try:
                return data["choices"][0]["message"]["content"]
            except (KeyError, IndexError, TypeError) as e:
                raise LLMError(f"LLM 响应结构异常: {data}") from e

        # 不应该到达这里（最后一轮会 raise），防御性返回
        raise last_error if last_error else LLMError("LLM 调用重试耗尽")

    async def stream_chat(
        self,
        system: str,
        user: str,
        *,
        temperature: float = 0.2,
    ) -> AsyncIterator[str]:
        """流式调用，逐 chunk yield content 片段（流式也带重试，仅针对建连失败）。"""
        body = self._build_body(system, user, temperature=temperature, json_mode=False, stream=True)
        last_error: Exception | None = None
        for attempt in range(1, self._max_retries + 1):
            try:
                stream_ctx = self._client.stream("POST", "/chat/completions", json=body)
                break
            except (httpx.HTTPError, httpx.TimeoutException) as e:
                last_error = e
                logger.warning("[llm] stream connect error attempt %d: %s", attempt, e)
                if attempt < self._max_retries:
                    await self._sleep_backoff(attempt)
                    continue
                raise LLMError(f"LLM 流式连接错误: {e}") from e

        async with stream_ctx as resp:  # type: ignore[union-attr]
            if resp.status_code != 200:
                text = await resp.aread()
                raise LLMError(f"LLM 流式错误 status={resp.status_code}: {text[:500]!r}")
            async for line in resp.aiter_lines():
                if not line or not line.startswith("data:"):
                    continue
                payload = line[5:].strip()
                if payload == "[DONE]":
                    break
                try:
                    obj = json.loads(payload)
                    delta = obj["choices"][0]["delta"].get("content") or ""
                except Exception:  # noqa: BLE001
                    delta = ""
                if delta:
                    yield delta

    @staticmethod
    async def _sleep_backoff(attempt: int) -> None:
        """指数退避：1s, 2s, 4s, ...（上限 8s）"""
        delay = min(2 ** (attempt - 1), 8)
        logger.info("[llm] backing off %ds before retry", delay)
        await asyncio.sleep(delay)