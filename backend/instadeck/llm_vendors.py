"""OpenAI-compatible vendor metadata + per-slot URL/key resolution."""

from __future__ import annotations

from typing import Any

from instadeck.config import Settings, get_settings
from instadeck.schemas import LLMSlotConfig

VENDORS: list[dict[str, Any]] = [
    {
        "vendor_id": "openai",
        "label": "OpenAI",
        "default_base_url": "https://api.openai.com/v1",
        "doc_hint": "",
    },
    {
        "vendor_id": "azure_openai",
        "label": "Azure OpenAI（兼容模式）",
        "default_base_url": "",
        "doc_hint": "请在 Base URL 填写 Azure 资源提供的 OpenAI 兼容 endpoint（含 /v1）",
    },
    {
        "vendor_id": "deepseek",
        "label": "DeepSeek",
        "default_base_url": "https://api.deepseek.com/v1",
        "doc_hint": "",
    },
    {
        "vendor_id": "moonshot",
        "label": "Moonshot（Kimi）",
        "default_base_url": "https://api.moonshot.cn/v1",
        "doc_hint": "",
    },
    {
        "vendor_id": "zhipu",
        "label": "智谱 GLM",
        "default_base_url": "https://open.bigmodel.cn/api/paas/v4",
        "doc_hint": "",
    },
    {
        "vendor_id": "dashscope",
        "label": "阿里云 DashScope",
        "default_base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        "doc_hint": "",
    },
    {
        "vendor_id": "siliconflow",
        "label": "SiliconFlow",
        "default_base_url": "https://api.siliconflow.cn/v1",
        "doc_hint": "",
    },
    {
        "vendor_id": "openrouter",
        "label": "OpenRouter",
        "default_base_url": "https://openrouter.ai/api/v1",
        "doc_hint": "",
    },
    {
        "vendor_id": "ollama",
        "label": "Ollama（本地）",
        "default_base_url": "http://127.0.0.1:11434/v1",
        "doc_hint": "需启用 Ollama OpenAI 兼容 API",
    },
    {
        "vendor_id": "custom",
        "label": "自定义（自填 Base URL）",
        "default_base_url": "",
        "doc_hint": "需为 OpenAI 兼容 HTTP API",
    },
    {
        "vendor_id": "mock",
        "label": "Mock（不走网络）",
        "default_base_url": "",
        "doc_hint": "",
    },
]

_DEFAULT_URL: dict[str, str] = {
    str(v["vendor_id"]): str(v.get("default_base_url") or "") for v in VENDORS
}


def default_base_url_for_vendor(vendor_id: str) -> str:
    return _DEFAULT_URL.get(vendor_id, "")


def resolve_openai_compatible_config(
    slot: LLMSlotConfig,
    settings: Settings | None = None,
) -> tuple[str | None, str]:
    """Return (api_key_or_none, base_url) for AsyncOpenAI. None key => caller should use mock/offline."""
    s = settings or get_settings()
    if slot.vendor_id == "mock":
        return (None, "")
    key = (slot.api_key or "").strip() or (s.openai_api_key or "").strip()
    key_out: str | None = key if key else None
    url_slot = (slot.base_url or "").strip()
    if url_slot:
        base_url = url_slot
    else:
        base_url = (default_base_url_for_vendor(slot.vendor_id) or "").strip()
    if not base_url:
        base_url = (s.openai_base_url or "").strip() or "https://api.openai.com/v1"
    return (key_out, base_url)
