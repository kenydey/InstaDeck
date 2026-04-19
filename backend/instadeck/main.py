"""InstaDeck FastAPI application."""

from __future__ import annotations

import os
import tempfile
from pathlib import Path
from typing import Any, Literal, Optional

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from starlette.responses import Response

from instadeck import __version__, templates_service
from instadeck.bootstrap import ensure_builtin_default
from instadeck.config import get_settings
from instadeck.lint_presentation import lint_presentation
from instadeck.outline_llm import generate_outline, revise_outline
from instadeck.parser_service import parse_uploaded_file
from instadeck.render_gate import maybe_render_llm_patch
from instadeck.renderer import render_presentation_to_path
from instadeck.research_service import run_research
from instadeck.schemas import (
    DeckProfile,
    ParseDocumentResponse,
    Presentation,
    ResearchResponse,
    StructuredHints,
)
from instadeck.settings_store import load_app_settings, merge_put, save_app_settings, settings_for_response
from instadeck.stock_images import search_pexels, search_pixabay
from instadeck.style_reference import style_from_image

API = "/api/v1"


class ResearchBody(BaseModel):
    brief: str
    content_type: Optional[str] = None


class GenerateOutlineBody(BaseModel):
    source_type: Literal["brief", "raw_text"]
    text: Optional[str] = None
    brief: Optional[str] = None
    research_snapshot: Optional[ResearchResponse] = None
    structured_hints: Optional[StructuredHints] = None
    deck_profile: Optional[DeckProfile] = None


class ReviseBody(BaseModel):
    presentation: Presentation
    instruction: str
    deck_profile: Optional[DeckProfile] = None


class ImageSearchBody(BaseModel):
    query: str
    provider: str = Field(pattern="^(pexels|pixabay)$")


class RenderBody(BaseModel):
    presentation: Presentation
    deck_profile: Optional[DeckProfile] = None
    render_instruction: Optional[str] = None


def merge_deck_profile(base: DeckProfile, override: DeckProfile | None) -> DeckProfile:
    if override is None:
        return base
    return base.model_copy(update=override.model_dump(exclude_none=True))


def create_app() -> FastAPI:
    settings = get_settings()
    settings.ensure_dirs()
    builtin_default = Path(__file__).resolve().parent.parent / "assets" / "templates" / "builtin" / "default.pptx"
    ensure_builtin_default(builtin_default)

    app = FastAPI(title="InstaDeck API", version=__version__)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.on_event("startup")
    def _startup() -> None:
        settings.ensure_dirs()
        ensure_builtin_default(builtin_default)

    @app.get(f"{API}/health")
    def health() -> dict[str, str]:
        return {"status": "ok", "service": "instadeck", "version": __version__}

    @app.get(f"{API}/settings")
    def get_settings_api() -> dict[str, Any]:
        return settings_for_response(load_app_settings())

    @app.put(f"{API}/settings")
    def put_settings_api(payload: dict[str, Any]) -> dict[str, Any]:
        cur = load_app_settings()
        merged = merge_put(cur, payload)
        save_app_settings(merged)
        return settings_for_response(merged)

    @app.get(f"{API}/templates")
    def list_templates_api() -> list[dict[str, Any]]:
        return templates_service.list_templates(settings)

    @app.post(f"{API}/templates/upload")
    async def upload_template(file: UploadFile = File(...)) -> dict[str, str]:
        if not file.filename or not file.filename.lower().endswith(".pptx"):
            raise HTTPException(400, "only .pptx")
        suffix = Path(file.filename).suffix
        raw = await file.read()
        if len(raw) < 4 or raw[:2] != b"PK":
            raise HTTPException(400, "invalid_pptx_zip")
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(raw)
            tmp_path = Path(tmp.name)
        try:
            uid = templates_service.save_user_template(tmp_path, file.filename, settings)
            return {"template_id": f"user:{uid}"}
        finally:
            if tmp_path.exists():
                tmp_path.unlink()

    @app.delete(f"{API}/templates/{{tid}}")
    def delete_template(tid: str) -> dict[str, bool]:
        ok = templates_service.delete_user_template(tid, settings)
        if not ok:
            raise HTTPException(403 if tid.startswith("builtin:") else 404, "cannot delete")
        return {"deleted": True}

    @app.post(f"{API}/parse-document", response_model=ParseDocumentResponse)
    async def parse_document(file: UploadFile = File(...)) -> ParseDocumentResponse:
        suffix = Path(file.filename or "doc").suffix or ".txt"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(await file.read())
            p = Path(tmp.name)
        try:
            return parse_uploaded_file(p)
        finally:
            p.unlink(missing_ok=True)

    @app.post(f"{API}/research", response_model=ResearchResponse)
    async def research_api(payload: ResearchBody) -> ResearchResponse:
        return await run_research(payload.brief, payload.content_type)

    @app.post(f"{API}/generate-outline")
    async def generate_outline_api(payload: GenerateOutlineBody) -> Presentation:
        app_m = load_app_settings()
        profile = merge_deck_profile(app_m.defaults, payload.deck_profile)
        if payload.source_type == "brief":
            base = payload.brief or ""
            if payload.research_snapshot:
                base += "\n\n" + payload.research_snapshot.context_text
        else:
            base = payload.text or ""
        hints = payload.structured_hints
        try:
            return await generate_outline(base, hints, profile, app_m)
        except Exception as e:
            raise HTTPException(422, str(e)) from e

    @app.post(f"{API}/revise-outline")
    async def revise_outline_api(payload: ReviseBody) -> Presentation:
        app_m = load_app_settings()
        profile = merge_deck_profile(app_m.defaults, payload.deck_profile)
        try:
            return await revise_outline(payload.presentation, payload.instruction, profile, app_m)
        except Exception as e:
            raise HTTPException(422, str(e)) from e

    @app.post(f"{API}/image-search")
    async def image_search(payload: ImageSearchBody) -> list[dict[str, Any]]:
        if payload.provider == "pexels":
            r = await search_pexels(payload.query)
        else:
            r = await search_pixabay(payload.query)
        return r

    @app.post(f"{API}/render-pptx")
    async def render_pptx(payload: RenderBody) -> Response:
        app_m = load_app_settings()
        profile = merge_deck_profile(app_m.defaults, payload.deck_profile)
        pres = payload.presentation
        if payload.render_instruction:
            pres = await maybe_render_llm_patch(pres, payload.render_instruction, app_m)
        tpl = templates_service.resolve_template_path(profile.template_id, settings)
        if tpl is None and profile.template_id.startswith(("builtin:", "user:")):
            raise HTTPException(
                status_code=400,
                detail={"error_code": "unknown_template_id", "template_id": profile.template_id},
            )
        fd, tmp_name = tempfile.mkstemp(suffix=".pptx", dir=settings.data_dir / "tmp")
        os.close(fd)
        out = Path(tmp_name)
        try:
            render_presentation_to_path(pres, out, tpl)
            data = out.read_bytes()
        except Exception as e:
            out.unlink(missing_ok=True)
            raise HTTPException(422, str(e)) from e
        out.unlink(missing_ok=True)
        return Response(
            content=data,
            media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
            headers={"Content-Disposition": 'attachment; filename="instadeck.pptx"'},
        )

    @app.post(f"{API}/pptx-preview")
    async def pptx_preview(file: UploadFile = File(...)) -> dict[str, Any]:
        # v1: return metadata without LibreOffice; frontend may use local preview later
        data = await file.read()
        return {"pages": 1, "message": "stub_preview", "size_bytes": len(data)}

    @app.post(f"{API}/presentation/lint")
    def presentation_lint(p: Presentation) -> dict[str, Any]:
        return lint_presentation(p).model_dump()

    @app.post(f"{API}/style-from-reference")
    async def style_from_ref(file: UploadFile = File(...)) -> dict[str, Any]:
        data = await file.read()
        mime = file.content_type or "image/png"
        r = await style_from_image(data, mime)
        return r.model_dump()

    return app


app = create_app()
