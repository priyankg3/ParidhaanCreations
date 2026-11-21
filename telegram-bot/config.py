"""
Paridhaan Creations Telegram Bot - Configuration

Loads environment variables and exposes typed settings.
Fail-fast on missing required values at import time.
"""
import os
import logging
from dataclasses import dataclass
from dotenv import load_dotenv

# Load .env if present (local dev only; Railway injects env directly)
load_dotenv()

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class Settings:
    # Telegram
    bot_token: str
    channel_id: str  # e.g. "@paridhaancreations"

    # Backend API
    api_base_url: str  # e.g. "https://api.paridhaancreations.xyz/api"
    internal_api_token: str  # shared secret for service-to-service calls

    # Public storefront (for deep links back to website)
    web_base_url: str  # e.g. "https://paridhaancreations.xyz"

    # Behaviour
    log_level: str
    polling_timeout: int  # seconds, long-poll timeout


def _require(key: str) -> str:
    val = os.environ.get(key)
    if not val:
        raise RuntimeError(
            f"Missing required env var: {key}. "
            f"Set it in Railway service variables or local .env"
        )
    return val


def load_settings() -> Settings:
    return Settings(
        bot_token=_require("TELEGRAM_BOT_TOKEN"),
        channel_id=os.environ.get("TELEGRAM_CHANNEL_ID", "@ParidhaanCreations"),
        api_base_url=os.environ.get(
            "API_BASE_URL", "https://api.paridhaancreations.xyz/api"
        ).rstrip("/"),
        internal_api_token=_require("INTERNAL_API_TOKEN"),
        web_base_url=os.environ.get(
            "WEB_BASE_URL", "https://paridhaancreations.xyz"
        ).rstrip("/"),
        log_level=os.environ.get("LOG_LEVEL", "INFO").upper(),
        polling_timeout=int(os.environ.get("POLLING_TIMEOUT", "30")),
    )
