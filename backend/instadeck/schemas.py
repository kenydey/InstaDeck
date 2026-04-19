from __future__ import annotations

from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field, model_validator


class SlideType(str, Enum):
    cover = "cover"
    text_only = "text_only"
    chart_text = "chart_text"
    chart_only = "chart_only"


class ChartSeries(BaseModel):
    name: str
    data: list[float]


class ChartData(BaseModel):
    categories: list[str]
    series: list[ChartSeries]
    chart_type: str  # pie, bar, line, column, waterfall, combo


class BulletPoint(BaseModel):
    icon: str = ""
    text: str


class Slide(BaseModel):
    slide_type: SlideType
    title: str
    subtitle: Optional[str] = None
    chart_data: Optional[ChartData] = None
    bullet_points: Optional[list[BulletPoint]] = None
    image_keyword: Optional[str] = None
    image_attribution: Optional[str] = None

    @model_validator(mode="after")
    def validate_slide(self) -> Slide:
        st = self.slide_type
        if st in (SlideType.chart_text, SlideType.chart_only) and self.chart_data is None:
            raise ValueError(f"{st} requires chart_data")
        if st in (SlideType.cover, SlideType.text_only) and self.chart_data is not None:
            raise ValueError(f"{st} must not include chart_data")
        if st in (SlideType.text_only, SlideType.chart_text):
            if not self.bullet_points:
                raise ValueError(f"{st} requires bullet_points")
        if st == SlideType.chart_only and self.bullet_points:
            raise ValueError("chart_only must not include bullet_points")
        if self.image_keyword and __import__("re").search(r"[\u4e00-\u9fff]", self.image_keyword):
            raise ValueError("image_keyword must be ASCII-friendly for stock search")
        return self


class Presentation(BaseModel):
    title: str
    subtitle: Optional[str] = None
    date: str
    slides: list[Slide]


# --- Deck profile & settings ---


class LLMSlotConfig(BaseModel):
    vendor_id: str = "openai"
    model: str = "gpt-4o-mini"
    temperature: float = 0.3
    enabled: bool = True


class ImageProviderConfig(BaseModel):
    enabled: bool = False
    api_key: str = ""


class BulletSettings(BaseModel):
    auto_icon_enabled: bool = True
    decoration_mode: str = "emoji"  # emoji | small_image | native_shape


class DeckProfile(BaseModel):
    template_id: str = "builtin:default"
    content_type: str = "business_report"
    visual_style: str = "balanced"
    persona: str = ""


class AppSettingsModel(BaseModel):
    use_same_llm_for_all: bool = False
    llm_parser: LLMSlotConfig = Field(default_factory=lambda: LLMSlotConfig(enabled=False))
    llm_outline: LLMSlotConfig = Field(default_factory=LLMSlotConfig)
    llm_render: LLMSlotConfig = Field(
        default_factory=lambda: LLMSlotConfig(enabled=False, model="gpt-4o-mini")
    )
    images_pexels: ImageProviderConfig = Field(default_factory=ImageProviderConfig)
    images_pixabay: ImageProviderConfig = Field(default_factory=ImageProviderConfig)
    bullets: BulletSettings = Field(default_factory=BulletSettings)
    defaults: DeckProfile = Field(default_factory=DeckProfile)


class StructuredHints(BaseModel):
    tables_markdown: list[str] = Field(default_factory=list)
    numeric_blocks: list[dict[str, Any]] = Field(default_factory=list)
    chart_cues: list[dict[str, Any]] = Field(default_factory=list)


class ParseDocumentResponse(BaseModel):
    text: str
    structured_hints: StructuredHints
    frontmatter_suggested_profile: Optional[DeckProfile] = None


class ResearchSource(BaseModel):
    title: str
    url: str
    snippet: str


class ResearchResponse(BaseModel):
    sources: list[ResearchSource]
    context_text: str
    data_points: list[dict[str, Any]]


class LintResponse(BaseModel):
    warnings: list[str]
    suggested_patch: Optional[dict[str, Any]] = None


class StyleFromReferenceResponse(BaseModel):
    theme_override: dict[str, Any]
    suggested_visual_style: str
    notes: str = ""
