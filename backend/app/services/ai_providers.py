"""
Modular AI provider architecture for Flickzy AI.

Providers implement a single async method:
generate(prompt, system) -> str.

The orchestrator (ai_service.py) tries providers in order and falls back
on failure.

API keys are read from environment variables ONLY.
"""

import os

import httpx


class AIProviderError(Exception):
    """Raised when a provider fails to produce a response."""


class GeminiProvider:
    name = "gemini"

    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY", "")
        self.model = os.getenv(
            "GEMINI_MODEL",
            "gemini-1.5-flash",
        )

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key)

    async def generate(
        self,
        prompt: str,
        system: str = "",
    ) -> str:
        if not self.is_configured:
            raise AIProviderError(
                "GEMINI_API_KEY is not set"
            )

        url = (
            "https://generativelanguage.googleapis.com/"
            f"v1beta/models/{self.model}:generateContent"
            f"?key={self.api_key}"
        )

        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {
                            "text": prompt,
                        }
                    ],
                }
            ]
        }

        # Gemini REST API supports system_instruction separately.
        # This is much more reliable than pretending system instructions
        # are a previous user/model conversation.
        if system:
            payload["systemInstruction"] = {
                "parts": [
                    {
                        "text": system,
                    }
                ]
            }

        async with httpx.AsyncClient(
            timeout=30.0
        ) as client:
            resp = await client.post(
                url,
                json=payload,
            )

        if resp.status_code != 200:
            raise AIProviderError(
                f"Gemini error {resp.status_code}: "
                f"{resp.text[:300]}"
            )

        data = resp.json()

        try:
            candidates = data["candidates"]

            if not candidates:
                raise AIProviderError(
                    "Gemini returned no candidates"
                )

            parts = candidates[0]["content"]["parts"]

            text = "".join(
                part.get("text", "")
                for part in parts
                if isinstance(part, dict)
            ).strip()

            if not text:
                raise AIProviderError(
                    "Gemini returned an empty response"
                )

            return text

        except (KeyError, IndexError, TypeError) as exc:
            raise AIProviderError(
                f"Unexpected Gemini response shape: {exc}"
            ) from exc


class OpenRouterProvider:
    name = "openrouter"

    def __init__(self):
        self.api_key = os.getenv(
            "OPENROUTER_API_KEY",
            "",
        )
        self.model = os.getenv(
            "OPENROUTER_MODEL",
            "meta-llama/llama-3.1-8b-instruct:free",
        )

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key)

    async def generate(
        self,
        prompt: str,
        system: str = "",
    ) -> str:
        if not self.is_configured:
            raise AIProviderError(
                "OPENROUTER_API_KEY is not set"
            )

        messages = []

        if system:
            messages.append(
                {
                    "role": "system",
                    "content": system,
                }
            )

        messages.append(
            {
                "role": "user",
                "content": prompt,
            }
        )

        async with httpx.AsyncClient(
            timeout=30.0
        ) as client:
            resp = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": (
                        f"Bearer {self.api_key}"
                    ),
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.model,
                    "messages": messages,
                },
            )

        if resp.status_code != 200:
            raise AIProviderError(
                f"OpenRouter error {resp.status_code}: "
                f"{resp.text[:300]}"
            )

        data = resp.json()

        try:
            choices = data["choices"]

            if not choices:
                raise AIProviderError(
                    "OpenRouter returned no choices"
                )

            text = (
                choices[0]["message"]["content"]
                .strip()
            )

            if not text:
                raise AIProviderError(
                    "OpenRouter returned an empty response"
                )

            return text

        except (KeyError, IndexError, TypeError) as exc:
            raise AIProviderError(
                f"Unexpected OpenRouter response shape: {exc}"
            ) from exc