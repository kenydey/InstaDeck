from __future__ import annotations

from instadeck.config import Settings
from instadeck.llm_vendors import resolve_openai_compatible_config
from instadeck.schemas import LLMSlotConfig


def test_resolve_prefers_slot_key_and_url() -> None:
    slot = LLMSlotConfig(
        vendor_id="deepseek",
        api_key="slot-key",
        base_url="https://api.example.com/v1",
    )
    env = Settings(
        openai_api_key="env-key",
        openai_base_url="https://api.openai.com/v1",
    )
    k, u = resolve_openai_compatible_config(slot, env)
    assert k == "slot-key"
    assert u == "https://api.example.com/v1"


def test_resolve_mock_returns_no_key() -> None:
    slot = LLMSlotConfig(vendor_id="mock", api_key="x")
    k, u = resolve_openai_compatible_config(slot, Settings())
    assert k is None and u == ""
