from __future__ import annotations

from instadeck.schemas import AppSettingsModel, DeckProfile
from instadeck.settings_store import merge_put


def test_deep_merge_defaults_deck_profile() -> None:
    base = AppSettingsModel()
    merged = merge_put(
        base,
        {"defaults": {"content_type": "academic", "template_id": "builtin:default"}},
    )
    assert merged.defaults.content_type == "academic"
    assert merged.defaults.visual_style == DeckProfile().visual_style
