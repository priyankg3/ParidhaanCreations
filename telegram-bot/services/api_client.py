"""
API client wrapper for the Paridhaan Creations FastAPI backend.

The bot NEVER touches MongoDB directly — all reads/writes go through
the existing REST API, keeping a single source of truth.

Two auth modes:
  - Public endpoints (products, categories): no auth header
  - Internal endpoints (telegram-specific): X-Internal-Token header

User-scoped actions (cart, orders, checkout) require a logged-in
platform user. For now the bot links Telegram users to platform
users via email (OTP flow in a later PR); until then those methods
raise NotImplementedError.
"""
from __future__ import annotations

import logging
from typing import Any, Optional

import httpx

logger = logging.getLogger(__name__)


class ApiError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(f"API error {status}: {message}")
        self.status = status
        self.message = message


class ApiClient:
    def __init__(self, base_url: str, internal_token: str, timeout: float = 15.0):
        self._base_url = base_url.rstrip("/")
        self._internal_token = internal_token
        self._client = httpx.AsyncClient(timeout=timeout)

    async def aclose(self) -> None:
        await self._client.aclose()

    # ---------- low-level ----------

    async def _request(
        self,
        method: str,
        path: str,
        *,
        params: Optional[dict] = None,
        json: Optional[dict] = None,
        internal: bool = False,
    ) -> Any:
        url = f"{self._base_url}{path}"
        headers: dict[str, str] = {}
        if internal:
            headers["X-Internal-Token"] = self._internal_token

        try:
            resp = await self._client.request(
                method, url, params=params, json=json, headers=headers
            )
        except httpx.HTTPError as e:
            logger.exception("HTTP error calling %s %s: %s", method, url, e)
            raise ApiError(0, str(e)) from e

        if resp.status_code >= 400:
            # Try to extract FastAPI {"detail": "..."} shape
            try:
                detail = resp.json().get("detail", resp.text)
            except Exception:
                detail = resp.text
            raise ApiError(resp.status_code, str(detail))

        if resp.status_code == 204 or not resp.content:
            return None
        return resp.json()

    # ---------- public catalog ----------

    async def list_categories(self) -> list[dict]:
        data = await self._request("GET", "/categories")
        return data or []

    async def list_products(
        self,
        *,
        category: Optional[str] = None,
        search: Optional[str] = None,
        featured: Optional[bool] = None,
        limit: int = 10,
        skip: int = 0,
    ) -> list[dict]:
        params: dict[str, Any] = {"limit": limit, "skip": skip}
        if category:
            params["category"] = category
        if search:
            params["search"] = search
        if featured is not None:
            params["featured"] = str(featured).lower()
        data = await self._request("GET", "/products", params=params)
        # Backend may return a list or {"items": [...]} shape; normalise.
        if isinstance(data, dict) and "items" in data:
            return data["items"]
        return data or []

    async def get_product(self, product_id: str) -> Optional[dict]:
        try:
            return await self._request("GET", f"/products/{product_id}")
        except ApiError as e:
            if e.status == 404:
                return None
            raise

    # ---------- internal (service-to-service) ----------

    async def health(self) -> bool:
        try:
            await self._request("GET", "/")
            return True
        except ApiError:
            return False
