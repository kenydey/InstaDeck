"""Render-slot JSON gate: reject patches that remove chart_data or inject executable code."""

from __future__ import annotations

import json
from typing import Any

from instadeck.schemas import Presentation


def apply_render_llm_patch_safe(
    base: Presentation,
    patch: dict[str, Any] | None,
) -> Presentation:
    if not patch:
        return base
    raw = json.dumps(patch)
    if "exec(" in raw or "__import__" in raw:
        raise ValueError("unsafe_patch")
    merged = base.model_dump()
    # only allow shallow title/subtitle/bullet icon/text updates at top-level slides by index
    slides_patch = patch.get("slides")
    if isinstance(slides_patch, list):
        for i, sp in enumerate(slides_patch):
            if i >= len(merged["slides"]) or not isinstance(sp, dict):
                continue
            slide = merged["slides"][i]
            if "title" in sp:
                slide["title"] = str(sp["title"])[:500]
            if "subtitle" in sp and sp["subtitle"] is not None:
                slide["subtitle"] = str(sp["subtitle"])[:500]
            if "bullet_points" in sp and slide.get("bullet_points") is not None:
                bps = sp["bullet_points"]
                if isinstance(bps, list) and len(bps) == len(slide["bullet_points"]):
                    for j, bp in enumerate(bps):
                        if isinstance(bp, dict):
                            if "icon" in bp:
                                slide["bullet_points"][j]["icon"] = str(bp["icon"])[:8]
                            if "text" in bp:
                                slide["bullet_points"][j]["text"] = str(bp["text"])[:500]
            if "chart_data" in sp:
                raise ValueError("chart_data_mutation_forbidden")
    return Presentation.model_validate(merged)


async def maybe_render_llm_patch(
    presentation: Presentation,
    instruction: str,
    app,
) -> Presentation:
    if not app.llm_render.enabled:
        return presentation
    settings = __import__("instadeck.config", fromlist=["get_settings"]).get_settings()
    if not settings.openai_api_key:
        return presentation
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=settings.openai_api_key, base_url=settings.openai_base_url)
    sys_msg = (
        "You may only output JSON patch: { slides: [ { optional title, subtitle, "
        "bullet_points same length with icon/text only } ] }. Never include chart_data."
    )
    resp = await client.chat.completions.create(
        model=app.llm_render.model,
        temperature=0.1,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": sys_msg},
            {
                "role": "user",
                "content": json.dumps(presentation.model_dump())
                + "\nInstruction:\n"
                + instruction[:4000],
            },
        ],
    )
    import json as _json

    patch = _json.loads(resp.choices[0].message.content or "{}")
    return apply_render_llm_patch_safe(presentation, patch)
