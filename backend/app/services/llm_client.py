"""MiniMax OpenAI 风格 API 客户端（异步）。

通过 httpx 直接 POST /chat/completions，避免引入 openai SDK。
支持：
- chat(): 一次性返回完整内容
- stream_chat(): 流式迭代 token
- json_mode=True 强制 response_format=json_object
"""

from __future__ import annotations

import json
from typing import AsyncIterator

import httpx

from ..config import Settings


class LLMError(RuntimeError):
    """LLM 调用相关错误。"""


class LLMClient:
    """MiniMax /chat/completions 异步客户端。"""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
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
        """非流式调用，返回完整回复文本。"""
        body = self._build_body(system, user, temperature=temperature, json_mode=json_mode, stream=False)
        try:
            resp = await self._client.post("/chat/completions", json=body)
        except httpx.HTTPError as e:
            raise LLMError(f"LLM 网络错误: {e}") from e

        if resp.status_code != 200:
            raise LLMError(
                f"LLM 返回非 200: status={resp.status_code}, body={resp.text[:500]}"
            )

        data = resp.json()
        try:
            return data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as e:
            raise LLMError(f"LLM 响应结构异常: {data}") from e

    async def stream_chat(
        self,
        system: str,
        user: str,
        *,
        temperature: float = 0.2,
    ) -> AsyncIterator[str]:
        """流式调用，逐 chunk yield content 片段。"""
        body = self._build_body(system, user, temperature=temperature, json_mode=False, stream=True)
        async with self._client.stream("POST", "/chat/completions", json=body) as resp:
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