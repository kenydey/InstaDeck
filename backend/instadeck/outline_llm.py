"""Outline generation: template + OpenAI or mock."""

from __future__ import annotations

import json
import re
from datetime import datetime
from pathlib import Path

from instadeck.config import get_settings
from instadeck.llm_vendors import resolve_openai_compatible_config
from instadeck.schemas import (
    AppSettingsModel,
    BulletPoint,
    ChartData,
    ChartSeries,
    DeckProfile,
    Presentation,
    Slide,
    SlideType,
    StructuredHints,
)

_PROMPT_PATH = Path(__file__).parent / "prompts" / "outline_system_v1.txt"


def _load_prompt_template() -> str:
    return _PROMPT_PATH.read_text(encoding="utf-8")


def _strip_json_fence(s: str) -> str:
    s = s.strip()
    if s.startswith("```"):
        s = re.sub(r"^```(?:json)?\s*", "", s, flags=re.IGNORECASE)
        s = re.sub(r"\s*```$", "", s)
    return s.strip()


def mock_presentation(user_text: str, profile: DeckProfile) -> Presentation:
    lines = [ln.strip() for ln in user_text.splitlines() if len(ln.strip()) > 8]
    title = (lines[0][:80] if lines else "InstaDeck Presentation")[:80]
    sub = f"Generated outline — {profile.content_type}"
    slides: list[Slide] = [
        Slide(
            slide_type=SlideType.cover,
            title=title,
            subtitle=sub,
        ),
        Slide(
            slide_type=SlideType.text_only,
            title="Overview",
            bullet_points=[
                BulletPoint(
                    icon="📌",
                    text=(
                        (lines[1][:120] if len(lines) > 1 else "Key context from your document.")[:120]
                    ),
                ),
                BulletPoint(icon="🎯", text=f"Style: {profile.visual_style}"),
                BulletPoint(icon="📊", text=f"Type: {profile.content_type}"),
            ],
        ),
        Slide(
            slide_type=SlideType.chart_text,
            title="Sample metrics",
            chart_data=ChartData(
                categories=["Q1", "Q2", "Q3", "Q4"],
                series=[
                    ChartSeries(name="Series A", data=[10.0, 14.0, 12.0, 18.0]),
                    ChartSeries(name="Series B", data=[8.0, 9.0, 11.0, 10.0]),
                ],
                chart_type="column",
            ),
            bullet_points=[
                BulletPoint(icon="📈", text="Illustrative chart — replace with your data in the editor."),
            ],
        ),
    ]
    return Presentation(
        title=title,
        subtitle=sub,
        date=datetime.now().strftime("%B %Y"),
        slides=slides,
    )


async def generate_outline(
    user_text: str,
    hints: StructuredHints | None,
    profile: DeckProfile,
    app: AppSettingsModel,
) -> Presentation:
    slot = app.llm_outline
    settings = get_settings()
    hints = hints or StructuredHints()
    api_key, base_url = resolve_openai_compatible_config(slot, settings)
    if not api_key or slot.vendor_id == "mock":
        return mock_presentation(user_text, profile)

    try:
        from openai import AsyncOpenAI
    except ImportError:
        return mock_presentation(user_text, profile)

    client = AsyncOpenAI(api_key=api_key, base_url=base_url)
    tmpl = _load_prompt_template()
    try:
        prompt = tmpl.format(
            content_type=profile.content_type,
            visual_style=profile.visual_style,
            persona=profile.persona or "professional",
            user_text=user_text[:120_000],
            structured_hints_json=hints.model_dump_json(),
        )
    except (KeyError, ValueError) as e:
        raise ValueError(f"outline_prompt_format_error: {e}") from e
    resp = await client.chat.completions.create(
        model=slot.model,
        temperature=slot.temperature,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": "You output only valid JSON for a presentation object."},
            {"role": "user", "content": prompt},
        ],
    )
    raw = resp.choices[0].message.content or "{}"
    raw = _strip_json_fence(raw)
    data = json.loads(raw)
    return Presentation.model_validate(data)


async def revise_outline(
    presentation: Presentation,
    instruction: str,
    profile: DeckProfile,
    app: AppSettingsModel,
) -> Presentation:
    slot = app.llm_outline
    settings = get_settings()
    api_key, base_url = resolve_openai_compatible_config(slot, settings)
    payload = (
        "Revise the following presentation JSON according to the instruction. "
        "Output ONLY valid JSON same schema, no markdown fences.\n\nINSTRUCTION:\n"
        + instruction[:8000]
        + "\n\nCURRENT:\n"
        + presentation.model_dump_json()
    )
    if not api_key or slot.vendor_id == "mock":
        # minimal local merge: append a text slide note
        slides = list(presentation.slides)
        slides.append(
            Slide(
                slide_type=SlideType.text_only,
                title="Revision note",
                bullet_points=[
                    BulletPoint(icon="✏️", text=instruction[:200]),
                ],
            )
        )
        return presentation.model_copy(update={"slides": slides})

    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=api_key, base_url=base_url)
    resp = await client.chat.completions.create(
        model=slot.model,
        temperature=slot.temperature,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": "You revise presentation JSON; output full valid JSON only."},
            {"role": "user", "content": payload},
        ],
    )
    raw = resp.choices[0].message.content or "{}"
    raw = _strip_json_fence(raw)
    return Presentation.model_validate(json.loads(raw))
