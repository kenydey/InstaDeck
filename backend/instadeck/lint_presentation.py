"""FR-26: Rule-based presentation lint / critic."""

from __future__ import annotations

from instadeck.schemas import LintResponse, Presentation, SlideType


def lint_presentation(p: Presentation) -> LintResponse:
    warnings: list[str] = []
    if not p.slides:
        warnings.append("Presentation has no slides.")
    if p.slides and p.slides[0].slide_type != SlideType.cover:
        warnings.append("First slide is not cover; consider adding a cover slide.")
    for i, s in enumerate(p.slides):
        if s.slide_type in (SlideType.text_only, SlideType.chart_text):
            if not s.bullet_points:
                warnings.append(f"Slide {i + 1} ({s.slide_type}) missing bullet_points.")
        if s.slide_type in (SlideType.chart_text, SlideType.chart_only):
            if s.chart_data is None:
                warnings.append(f"Slide {i + 1} missing chart_data.")
            elif not s.chart_data.series:
                warnings.append(f"Slide {i + 1} chart has no series.")
    return LintResponse(warnings=warnings, suggested_patch=None)
