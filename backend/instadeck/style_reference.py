"""FR-27: Extract palette hints from reference image (mock without vision key)."""

from __future__ import annotations

import base64

from instadeck.config import get_settings
from instadeck.schemas import StyleFromReferenceResponse


async def style_from_image(image_bytes: bytes, mime: str = "image/png") -> StyleFromReferenceResponse:
    settings = get_settings()
    if not settings.openai_api_key:
        return StyleFromReferenceResponse(
            theme_override={"primary": "#00529B", "accent": "#6DB948"},
            suggested_visual_style="business_formal",
            notes="Mock palette (no OPENAI_API_KEY).",
        )
    try:
        from openai import AsyncOpenAI
    except ImportError:
        return StyleFromReferenceResponse(
            theme_override={"primary": "#333333"},
            suggested_visual_style="minimal",
            notes="openai package missing.",
        )
    b64 = base64.standard_b64encode(image_bytes).decode("ascii")
    client = AsyncOpenAI(api_key=settings.openai_api_key, base_url=settings.openai_base_url)
    resp = await client.chat.completions.create(
        model=settings.style_vision_model,
        temperature=0.2,
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": (
                            "Return JSON: {primary_hex, accent_hex, suggested_visual_style, notes}. "
                            "suggested_visual_style ∈ business_formal|minimal|chart_forward|"
                            "text_forward|balanced|story"
                        ),
                    },
                    {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}},
                ],
            }
        ],
    )
    import json

    raw = resp.choices[0].message.content or "{}"
    data = json.loads(raw)
    return StyleFromReferenceResponse(
        theme_override={
            "primary": data.get("primary_hex", "#00529B"),
            "accent": data.get("accent_hex", "#00A3E0"),
        },
        suggested_visual_style=data.get("suggested_visual_style", "balanced"),
        notes=data.get("notes", ""),
    )
