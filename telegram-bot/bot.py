"""
Paridhaan Creations Telegram Bot — entry point.

Runs in long-polling mode. Deployed as a separate Railway service
(see telegram-bot/README.md for setup).
"""
from __future__ import annotations

import logging
import sys

from telegram import BotCommand
from telegram.ext import Application, ApplicationBuilder, ContextTypes

from config import load_settings
from services.api_client import ApiClient


def _setup_logging(level: str) -> None:
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    # Quiet noisy loggers
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("telegram.ext.Application").setLevel(logging.INFO)


async def _on_startup(app: Application) -> None:
    log = logging.getLogger(__name__)
    api: ApiClient = app.bot_data["api"]
    ok = await api.health()
    log.info("Backend health check: %s", "OK" if ok else "FAILED (continuing)")

    # Advertise commands in the Telegram UI
    await app.bot.set_my_commands(
        [
            BotCommand("start", "Main menu"),
            BotCommand("catalog", "Browse categories"),
            BotCommand("cart", "View my cart"),
            BotCommand("orders", "My orders"),
            BotCommand("help", "Help & commands"),
        ]
    )
    me = await app.bot.get_me()
    log.info("Bot online as @%s (id=%s)", me.username, me.id)
    app.bot_data["bot_username"] = me.username


async def _on_shutdown(app: Application) -> None:
    api: ApiClient = app.bot_data.get("api")
    if api:
        await api.aclose()


async def error_handler(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
    logging.getLogger(__name__).exception(
        "Unhandled error while processing update: %s", context.error
    )


def build_app() -> Application:
    settings = load_settings()
    _setup_logging(settings.log_level)

    api = ApiClient(
        base_url=settings.api_base_url,
        internal_token=settings.internal_api_token,
    )

    app = (
        ApplicationBuilder()
        .token(settings.bot_token)
        .post_init(_on_startup)
        .post_shutdown(_on_shutdown)
        .build()
    )

    # Stash shared state so handlers can reach it via context.application.bot_data
    app.bot_data["api"] = api
    app.bot_data["settings"] = settings

    # Register handler modules
    from handlers import start, catalog, cart, checkout, orders  # noqa: WPS433

    start.register(app)
    catalog.register(app)
    cart.register(app)
    checkout.register(app)
    orders.register(app)

    app.add_error_handler(error_handler)
    return app


def main() -> None:
    app = build_app()
    settings = app.bot_data["settings"]
    logging.getLogger(__name__).info(
        "Starting long-polling (timeout=%ss) against %s",
        settings.polling_timeout,
        settings.api_base_url,
    )
    # run_polling handles signals and graceful shutdown internally.
    app.run_polling(
        poll_interval=1.0,
        timeout=settings.polling_timeout,
        drop_pending_updates=True,
    )


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(0)
