# Paridhaan Creations — Telegram Bot

Telegram bot ([@ParidhaanCreationsBot](https://t.me/ParidhaanCreationsBot)) and
channel ([@ParidhaanCreations](https://t.me/ParidhaanCreations)) for the
Paridhaan Creations storefront.

## Architecture

- **Runtime:** Separate Railway service, deployed from this `telegram-bot/`
  subdirectory of the main monorepo
- **Mode:** Long polling (via `python-telegram-bot v21`, async)
- **Data:** No direct DB access — calls the existing FastAPI backend at
  `https://api.paridhaancreations.xyz/api`
- **Channel integration:** Admin product create on the website →
  backend calls bot's internal notify endpoint → bot posts to
  `@ParidhaanCreations` with a "Buy in Bot" deep-link

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│  Telegram   │◄────►│   Bot        │─────►│  FastAPI    │
│  user       │      │  (worker)    │      │  backend    │
└─────────────┘      └──────────────┘      └──────┬──────┘
                            │                     │
                            ▼                     ▼
                     ┌──────────────┐      ┌─────────────┐
                     │  Channel     │      │  MongoDB    │
                     │  @paridhaan… │      │  Atlas      │
                     └──────────────┘      └─────────────┘
```

## Local development

```bash
cd telegram-bot
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your real TELEGRAM_BOT_TOKEN
python bot.py
```

The bot will poll Telegram and log to stdout. Message your bot
in Telegram to test `/start`, `/catalog`, etc.

## Railway deployment

The bot runs as a **second Railway service** inside the existing
`ParidhaanCreations` project (alongside the `backend` service).

**One-time setup:**

1. In Railway → your project → **New Service** → **Deploy from GitHub Repo**
2. Choose `shryti78/paridhaancreations`, branch `main`
3. Service **Settings** → **Root Directory** = `telegram-bot`
4. **Variables** tab, add:
   - `TELEGRAM_BOT_TOKEN` (from @BotFather)
   - `TELEGRAM_CHANNEL_ID` = `@ParidhaanCreations`
   - `API_BASE_URL` = `https://api.paridhaancreations.xyz/api`
   - `INTERNAL_API_TOKEN` (same value as on the backend service — generate with `python -c "import secrets; print(secrets.token_urlsafe(32))"`)
   - `WEB_BASE_URL` = `https://paridhaancreations.xyz`
5. Service **Settings** → **Networking** → leave **public networking off**
   (worker only; it initiates all connections)
6. Deploy. Railway will pick up `Procfile`'s `worker:` line.

After deploy, Railway's logs should show:
```
Backend health check: OK
Bot online as @ParidhaanCreationsBot (id=...)
Starting long-polling (timeout=30s) against https://api.paridhaancreations.xyz/api
```

## @BotFather setup checklist

- `/newbot` → name `Paridhaan Creations`, username `ParidhaanCreationsBot`
- `/setdescription`: `Shop authentic Indian handicrafts, pooja articles, and Laddu Gopal dresses from Paridhaan Creations — browse, order and track right here.`
- `/setabouttext`: `Paridhaan Creations — handicrafts & pooja articles store.`
- `/setcommands` → paste:
  ```
  start - Main menu
  catalog - Browse categories
  cart - View my cart
  orders - My orders
  help - Help & commands
  ```
- `/setuserpic` → upload a square logo

For the channel:
- Create public channel, username `ParidhaanCreations`
- Add `@ParidhaanCreationsBot` as admin with "Post Messages" permission

## What's shipped

| Feature          | State         |
| ---------------- | ------------- |
| `/start` + menu  | ✅ working     |
| `/catalog`       | ✅ working (photo cards, 5-per-page pagination) |
| Browse category  | ✅ working with real images, price, size, color |
| Product detail   | ✅ working     |
| Deep-link `/start buy_<id>` | ✅ working (from channel posts) |
| Deep-link `/start catalog`  | ✅ working (from digest "Browse" button) |
| Channel: daily digest (19:00 IST)   | ✅ working |
| Channel: immediate-post (`mode="now"`)   | ✅ working (30s poll) |
| `/cart`          | 🚧 stub (needs user login) |
| `/orders`        | 🚧 stub (needs user login) |
| Checkout         | 🚧 stub (needs user login + Razorpay link flow) |

## Channel posting — how it works

Every product created via admin API is auto-enqueued with one of
three modes (defaults to `digest`):

| Mode     | When it posts |
| -------- | ------------- |
| `now`    | Within ~30s (bot polls `/api/internal/telegram/pending/now`) |
| `digest` | Batched into the 19:00 IST daily album post |
| `skip`   | Never posted |

### Daily digest shape

Bot drains `/api/internal/telegram/pending/digest` at 19:00 IST:

- **0 products** → no post (silent).
- **1 product** → single rich photo card with "Buy in Bot" button.
- **2–10 products** → one Telegram album (swipeable gallery, single
  notification) with a short summary caption listing each product
  by name + price, followed by a "Browse new arrivals in Bot" button
  message. Album carousels can't carry inline keyboards directly,
  hence the follow-up message.
- **>10 products** → top 10 as album with "and N more — browse all
  in the bot" tail. The rest roll into the next day's digest
  naturally (they stay pending).

### Setting mode when creating a product

The admin product-create endpoint (`POST /api/admin/products`) accepts
an optional `channel_post_mode` field on the payload:

```json
{
  "name": "New Laddu Gopal Dress",
  "price": 199,
  ...
  "channel_post_mode": "now"   // "now" | "digest" | "skip"
}
```

Admin UI dropdown for this field ships in Phase 4 Part C
(follow-up PR). Until then, every new product defaults to
`digest` — safe, batched, 7 PM IST.

## Next PR: login + cart + checkout

Flow:
1. Email OTP via existing `/api/auth/*` (new `/request-otp` + `/verify-otp` endpoints)
2. Store `telegram_user_id ↔ platform_user_id` mapping on the backend
3. Bot keeps a short-lived session token per Telegram user in `context.user_data`
4. Cart/orders/checkout then hit authenticated endpoints with that token

## Directory layout

```
telegram-bot/
├── bot.py                    # Entry point
├── config.py                 # Settings loader
├── handlers/
│   ├── start.py              # /start, main menu, deep-link router
│   ├── catalog.py            # Categories, products, product detail
│   ├── cart.py               # (stub)
│   ├── checkout.py           # (stub)
│   └── orders.py             # (stub)
├── services/
│   ├── api_client.py         # httpx wrapper around the FastAPI backend
│   └── notifier.py           # Channel post helper
├── keyboards/
│   └── inline.py             # Inline keyboards + callback-data helpers
├── requirements.txt
├── Procfile                  # worker: python -u bot.py
├── railway.json              # Railway build/deploy config
└── .env.example
```
