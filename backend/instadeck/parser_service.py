"""Document parsing + structured_hints + optional MD frontmatter."""

from __future__ import annotations

import os
import re
import sys
from pathlib import Path
from typing import Any

# Legacy DocumentParser.py: INSTADECK_DOCUMENT_PARSER_ROOT, repo root, or backend/
_here = Path(__file__).resolve()
_cands: list[Path] = []
_env = os.environ.get("INSTADECK_DOCUMENT_PARSER_ROOT")
if _env:
    _cands.append(Path(_env).resolve())
_cands.extend([_here.parents[2], _here.parents[1]])
_ROOT = next((c for c in _cands if (c / "DocumentParser.py").exists()), _here.parents[2])
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from DocumentParser import DocumentParser  # noqa: E402

from instadeck.schemas import DeckProfile, ParseDocumentResponse, StructuredHints


def _extract_tables_markdown(text: str) -> list[str]:
    blocks: list[str] = []
    lines = text.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if "|" in line and i + 1 < len(lines) and re.match(r"^\s*\|?[-:| ]+\|", lines[i + 1]):
            buf = [lines[i]]
            j = i + 1
            while j < len(lines) and "|" in lines[j]:
                buf.append(lines[j])
                j += 1
            blocks.append("\n".join(buf))
            i = j
            continue
        i += 1
    return blocks


def _chart_cues(text: str, tables: list[str]) -> list[dict[str, Any]]:
    cues: list[dict[str, Any]] = []
    if re.search(r"\d{4}\s*[-–]\s*\d{4}", text) or "同比" in text or "趋势" in text.lower():
        cues.append({"kind": "trend", "keywords": ["trend", "growth"]})
    if tables:
        cues.append({"kind": "table", "related_table_index": 0})
    return cues


def _numeric_snippets(text: str) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for m in re.finditer(r"(\d{4}).{0,40}?(\d+\.?\d*)\s*%?", text[:8000]):
        out.append({"snippet": m.group(0)[:200], "source_page": None})
        if len(out) >= 20:
            break
    return out


def _parse_md_frontmatter(raw: str) -> tuple[str, dict[str, Any] | None]:
    if not raw.lstrip().startswith("---"):
        return raw, None
    end = raw.find("\n---", 3)
    if end == -1:
        return raw, None
    fm_raw = raw[3:end].strip()
    body = raw[end + 4 :].lstrip("\n")
    meta: dict[str, Any] = {}
    for line in fm_raw.splitlines():
        if ":" in line:
            k, v = line.split(":", 1)
            meta[k.strip()] = v.strip().strip('"').strip("'")
    return body, meta or None


def _fm_to_deck_profile(meta: dict[str, Any]) -> DeckProfile | None:
    if not meta:
        return None
    ct = meta.get("content_type") or meta.get("instadeck_content_type")
    vs = meta.get("visual_style") or meta.get("theme")
    tid = meta.get("template_id")
    if not any([ct, vs, tid]):
        return None
    return DeckProfile(
        template_id=tid or "builtin:default",
        content_type=ct or "business_report",
        visual_style=vs or "balanced",
    )


def parse_uploaded_file(path: Path) -> ParseDocumentResponse:
    dp = DocumentParser()
    ext = path.suffix.lower()
    raw = path.read_text(encoding="utf-8", errors="ignore") if ext == ".md" else None
    front: DeckProfile | None = None
    parse_path = path
    if ext == ".md" and raw is not None:
        body, fm = _parse_md_frontmatter(raw)
        tmp = path.parent / f".{path.name}.body.md"
        tmp.write_text(body, encoding="utf-8")
        parse_path = tmp
        front = _fm_to_deck_profile(fm or {})
        try:
            text = dp.parse(str(parse_path))
        finally:
            if tmp.exists():
                tmp.unlink()
    else:
        text = dp.parse(str(path))

    tables = _extract_tables_markdown(text)
    hints = StructuredHints(
        tables_markdown=tables,
        numeric_blocks=_numeric_snippets(text),
        chart_cues=_chart_cues(text, tables),
    )
    return ParseDocumentResponse(
        text=text, structured_hints=hints, frontmatter_suggested_profile=front
    )
