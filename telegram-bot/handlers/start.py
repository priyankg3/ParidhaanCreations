"""
/start handler and main-menu callbacks.

Deep-link format supported:
  /start                   → welcome + main menu
  /start buy_<product_id>  → jump straight to product view (channel click-through)
"""
from __future__ import annotations

import logging

from telegram import Update
from telegram.constants import ParseMode
from telegram.ext import (
    Application,
    CallbackQueryHandler,
    CommandHandler,
    ContextTypes,
)

from keyboards.inline import CB_MAIN_MENU, main_menu

logger = logging.getLogger(__name__)


WELCOME_TEXT = (
    "🙏  <b>Welcome to Paridhaan Creations</b>\n\n"
    "Authentic Indian handicrafts, pooja articles, and Laddu Gopal "
    "dresses — now shoppable right here on Telegram.\n\n"
    "What would you like to do?"
)


async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user = update.effective_user
    args = context.args or []

    logger.info(
        "user=%s (%s) /start args=%s",
        user.id if user else "?",
        user.username if user else "?",
        args,
    )

    # Deep link: /start buy_<product_id>  → forward to catalog.view_product
    if args and args[0].startswith("buy_"):
        product_id = args[0][len("buy_"):]
        # Lazy import to avoid circular at module load
        from handlers.catalog import view_product_by_id
        await view_product_by_id(update, context, product_id)
        return

    await update.effective_message.reply_text(
        WELCOME_TEXT,
        parse_mode=ParseMode.HTML,
        reply_markup=main_menu(),
    )


async def cb_main_menu(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    await query.edit_message_text(
        WELCOME_TEXT,
        parse_mode=ParseMode.HTML,
        reply_markup=main_menu(),
    )


async def cmd_help(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.effective_message.reply_text(
        "Commands:\n"
        "/start — main menu\n"
        "/catalog — browse categories\n"
        "/cart — view cart\n"
        "/orders — my orders\n"
        "/help — this message\n\n"
        "Website: https://paridhaancreations.xyz"
    )


def register(app: Application) -> None:
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("help", cmd_help))
    app.add_handler(CallbackQueryHandler(cb_main_menu, pattern=f"^{CB_MAIN_MENU}$"))
