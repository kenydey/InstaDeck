from pathlib import Path

from instadeck.schemas import DeckProfile, StructuredHints


def test_outline_prompt_template_formats_without_keyerror() -> None:
    tmpl_path = Path(__file__).resolve().parents[1] / "instadeck" / "prompts" / "outline_system_v1.txt"
    tmpl = tmpl_path.read_text(encoding="utf-8")
    profile = DeckProfile(content_type="business_report", visual_style="balanced", persona="")
    hints = StructuredHints()
    out = tmpl.format(
        content_type=profile.content_type,
        visual_style=profile.visual_style,
        persona=profile.persona or "professional",
        user_text="hello world",
        structured_hints_json=hints.model_dump_json(),
    )
    assert "business_report" in out
    assert "balanced" in out
    assert "hello world" in out
    assert "{content_type}" not in out
