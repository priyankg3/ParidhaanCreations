"""
Drop-in replacement for the `emergentintegrations.llm.chat` module.

The Emergent platform shipped a private wrapper around OpenAI/Gemini.
After migrating off Emergent we no longer have that package, but a lot of
existing routers (ai_tools.py, astro.py) still import `LlmChat` / `UserMessage`
with a specific API shape. This shim keeps those routers working by
re-implementing the same tiny surface on top of `litellm` (already in
requirements.txt), which talks to OpenAI, Gemini, Anthropic, etc.

Required env vars (whichever provider you plan to use):
  * OPENAI_API_KEY
  * GEMINI_API_KEY   (for provider="gemini")
  * ANTHROPIC_API_KEY

Usage identical to Emergent's original:

    chat = LlmChat(api_key=key, session_id="abc", system_message="You are …")
    chat = chat.with_model("openai", "gpt-4o-mini")   # or "gemini", "gemini-2.5-flash"
    response = await chat.send_message(UserMessage(text="hello"))

If no provider key is set, `send_message` raises an HTTPException(503)
with a human-readable message instead of a cryptic SDK error.
"""

import os
import logging
from dataclasses import dataclass
from typing import Optional

from fastapi import HTTPException

try:
    import litellm
except ImportError:  # pragma: no cover
    litellm = None

logger = logging.getLogger(__name__)


@dataclass
class UserMessage:
    """Minimal user message wrapper, mirrors the original API."""
    text: str


class LlmChat:
    """Session-less chat object. One instance per call is fine."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        session_id: str = "",
        system_message: str = "",
    ) -> None:
        self.api_key = api_key
        self.session_id = session_id
        self.system_message = system_message
        self.provider = "openai"
        self.model = "gpt-4o-mini"

    def with_model(self, provider: str, model: str) -> "LlmChat":
        self.provider = provider
        self.model = model
        return self

    def _resolve_key(self) -> Optional[str]:
        """Pick the env var that matches the configured provider."""
        if self.api_key:
            return self.api_key
        env_map = {
            "openai": "OPENAI_API_KEY",
            "gemini": "GEMINI_API_KEY",
            "anthropic": "ANTHROPIC_API_KEY",
        }
        return os.environ.get(env_map.get(self.provider, ""))

    def _resolve_model_id(self) -> str:
        """Build the provider-prefixed model id that litellm expects."""
        if self.provider == "openai":
            return self.model
        return f"{self.provider}/{self.model}"

    async def send_message(self, message: UserMessage) -> str:
        if litellm is None:
            raise HTTPException(
                status_code=503,
                detail="LLM backend not available: install `litellm`.",
            )
        key = self._resolve_key()
        if not key:
            raise HTTPException(
                status_code=503,
                detail=(
                    f"AI features are disabled. Set the API key for "
                    f"'{self.provider}' in the server environment."
                ),
            )

        messages = []
        if self.system_message:
            messages.append({"role": "system", "content": self.system_message})
        messages.append({"role": "user", "content": message.text})

        try:
            response = await litellm.acompletion(
                model=self._resolve_model_id(),
                messages=messages,
                api_key=key,
            )
            return response.choices[0].message.content or ""
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"LLM call failed ({self.provider}/{self.model}): {e}")
            raise HTTPException(status_code=502, detail=f"LLM request failed: {e}")
