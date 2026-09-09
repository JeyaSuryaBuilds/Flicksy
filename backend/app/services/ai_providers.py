"""
Modular AI provider architecture for Flicksy AI.

Providers implement a single async method: generate(prompt, system) -> str.
The orchestrator (ai_service.py) tries providers in order and falls back on failure.

API keys are read from environment variables ONLY — never passed from the frontend,
never logged, never returned in any API response.
"""
import os
import httpx


class AIProviderError(Exception):
    """Raised when a provider fails to produce a response (network, auth, quota, etc)."""


class GeminiProvider:
    name = "gemini"

    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY", "")
        self.model = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key)

    async def generate(self, prompt: str, system: str = "") -> str:
        if not self.is_configured:
            raise AIProviderError("GEMINI_API_KEY is not set")

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
        contents = []
        if system:
            # Gemini has no dedicated system role in the basic REST call — prepend as context.
            contents.append({"role": "user", "parts": [{"text": f"[System instructions]\n{system}"}]})
            contents.append({"role": "model", "parts": [{"text": "Understood."}]})
        contents.append({"role": "user", "parts": [{"text": prompt}]})

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json={"contents": contents})
            if resp.status_code != 200:
                raise AIProviderError(f"Gemini error {resp.status_code}: {resp.text[:200]}")
            data = resp.json()
            try:
                return data["candidates"][0]["content"]["parts"][0]["text"].strip()
            except (KeyError, IndexError) as e:
                raise AIProviderError(f"Unexpected Gemini response shape: {e}")


class OpenRouterProvider:
    name = "openrouter"

    def __init__(self):
        self.api_key = os.getenv("OPENROUTER_API_KEY", "")
        self.model = os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.1-8b-instruct:free")

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key)

    async def generate(self, prompt: str, system: str = "") -> str:
        if not self.is_configured:
            raise AIProviderError("OPENROUTER_API_KEY is not set")

        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={"model": self.model, "messages": messages},
            )
            if resp.status_code != 200:
                raise AIProviderError(f"OpenRouter error {resp.status_code}: {resp.text[:200]}")
            data = resp.json()
            try:
                return data["choices"][0]["message"]["content"].strip()
            except (KeyError, IndexError) as e:
                raise AIProviderError(f"Unexpected OpenRouter response shape: {e}")
