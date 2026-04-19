import json
from pathlib import Path
from typing import Any

from instadeck.config import Settings, get_settings
from instadeck.schemas import AppSettingsModel


def _path(settings: Settings) -> Path:
    settings.ensure_dirs()
    return settings.data_dir / "settings" / "app_settings.json"


def load_app_settings() -> AppSettingsModel:
    settings = get_settings()
    p = _path(settings)
    if not p.exists():
        m = AppSettingsModel()
        if settings.openai_api_key:
            m.llm_outline.model = settings.outline_model
            m.llm_outline.api_key = settings.openai_api_key
        if settings.openai_base_url:
            m.llm_outline.base_url = settings.openai_base_url
        if settings.pexels_api_key:
            m.images_pexels.api_key = settings.pexels_api_key or ""
            m.images_pexels.enabled = True
        if settings.pixabay_api_key:
            m.images_pixabay.api_key = settings.pixabay_api_key or ""
            m.images_pixabay.enabled = True
        return m
    data = json.loads(p.read_text(encoding="utf-8"))
    return AppSettingsModel.model_validate(data)


def save_app_settings(model: AppSettingsModel) -> None:
    settings = get_settings()
    p = _path(settings)
    p.write_text(model.model_dump_json(indent=2), encoding="utf-8")


def mask_key(key: str) -> str:
    if not key or len(key) < 8:
        return ""
    return key[:4] + "…" + key[-4:]


def _llm_slot_public(slot: dict[str, Any]) -> dict[str, Any]:
    s = dict(slot)
    raw_key = str(s.pop("api_key", "") or "")
    return {
        **s,
        "api_key_configured": bool(raw_key),
        "api_key_masked": mask_key(raw_key),
    }


def settings_for_response(model: AppSettingsModel) -> dict[str, Any]:
    d = model.model_dump()
    d["llm_parser"] = _llm_slot_public(d["llm_parser"])
    d["llm_outline"] = _llm_slot_public(d["llm_outline"])
    d["llm_render"] = _llm_slot_public(d["llm_render"])
    pex = dict(d.get("images_pexels") or {})
    pix = dict(d.get("images_pixabay") or {})
    pex_key = str(pex.pop("api_key", "") or "")
    pix_key = str(pix.pop("api_key", "") or "")
    d["images_pexels"] = {
        **pex,
        "api_key_configured": bool(pex_key),
        "api_key_masked": mask_key(pex_key),
    }
    d["images_pixabay"] = {
        **pix,
        "api_key_configured": bool(pix_key),
        "api_key_masked": mask_key(pix_key),
    }
    return d


def _deep_merge_dict(base: dict[str, Any], patch: dict[str, Any]) -> dict[str, Any]:
    out = dict(base)
    for k, v in patch.items():
        if k in out and isinstance(out[k], dict) and isinstance(v, dict):
            out[k] = _deep_merge_dict(out[k], v)
        else:
            out[k] = v
    return out


def merge_put(existing: AppSettingsModel, body: dict[str, Any]) -> AppSettingsModel:
    merged = _deep_merge_dict(existing.model_dump(), body)
    return AppSettingsModel.model_validate(merged)
