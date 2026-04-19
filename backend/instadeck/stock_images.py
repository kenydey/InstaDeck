"""Pexels + Pixabay search."""

from __future__ import annotations

from typing import Any

import httpx

from instadeck.config import get_settings
from instadeck.settings_store import load_app_settings


def _pexels_key() -> str:
    app = load_app_settings()
    return (app.images_pexels.api_key or "").strip() or (get_settings().pexels_api_key or "")


def _pixabay_key() -> str:
    app = load_app_settings()
    return (app.images_pixabay.api_key or "").strip() or (get_settings().pixabay_api_key or "")


async def search_pexels(query: str, per_page: int = 6) -> list[dict[str, Any]]:
    key = _pexels_key()
    if not key:
        return []
    async with httpx.AsyncClient(timeout=20.0) as client:
        r = await client.get(
            "https://api.pexels.com/v1/search",
            params={"query": query, "per_page": per_page},
            headers={"Authorization": key},
        )
        r.raise_for_status()
        data = r.json()
    out: list[dict[str, Any]] = []
    for p in data.get("photos", []):
        src = p.get("src", {})
        out.append(
            {
                "provider": "pexels",
                "preview_url": src.get("medium", ""),
                "download_url": src.get("large", ""),
                "photographer": p.get("photographer", ""),
                "attribution": f"Photo by {p.get('photographer', '')} on Pexels",
            }
        )
    return out


async def search_pixabay(query: str, per_page: int = 6) -> list[dict[str, Any]]:
    key = _pixabay_key()
    if not key:
        return []
    async with httpx.AsyncClient(timeout=20.0) as client:
        r = await client.get(
            "https://pixabay.com/api/",
            params={"key": key, "q": query, "per_page": per_page, "image_type": "photo"},
        )
        r.raise_for_status()
        data = r.json()
    out: list[dict[str, Any]] = []
    for h in data.get("hits", []):
        out.append(
            {
                "provider": "pixabay",
                "preview_url": h.get("previewURL", ""),
                "download_url": h.get("largeImageURL", h.get("webformatURL", "")),
                "photographer": h.get("user", ""),
                "attribution": f"Image by {h.get('user', '')} from Pixabay",
            }
        )
    return out
