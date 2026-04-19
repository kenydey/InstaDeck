"""Builtin + user template registry."""

from __future__ import annotations

import json
import shutil
import uuid
from pathlib import Path
from typing import Any

from instadeck.config import Settings


def _builtin_dir(settings: Settings) -> Path:
    return Path(__file__).resolve().parent.parent / "assets" / "templates" / "builtin"


def _user_dir(settings: Settings) -> Path:
    d = settings.data_dir / "templates" / "user"
    d.mkdir(parents=True, exist_ok=True)
    return d


def list_templates(settings: Settings) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    bdir = _builtin_dir(settings)
    if bdir.exists():
        for p in sorted(bdir.glob("*.pptx")):
            out.append(
                {
                    "id": f"builtin:{p.stem}",
                    "display_name": p.stem,
                    "builtin": True,
                    "path": str(p),
                }
            )
    meta_dir = _user_dir(settings)
    for meta in sorted(meta_dir.glob("*.json")):
        data = json.loads(meta.read_text(encoding="utf-8"))
        tid = data.get("id", meta.stem)
        out.append(
            {
                "id": f"user:{tid}",
                "display_name": data.get("display_name", tid),
                "builtin": False,
                "uploaded_at": data.get("uploaded_at", ""),
            }
        )
    return out


def resolve_template_path(template_id: str, settings: Settings) -> Path | None:
    if template_id.startswith("builtin:"):
        key = template_id.split(":", 1)[1]
        p = _builtin_dir(settings) / f"{key}.pptx"
        return p if p.exists() else None
    if template_id.startswith("user:"):
        uid = template_id.split(":", 1)[1]
        meta = _user_dir(settings) / f"{uid}.json"
        if not meta.exists():
            return None
        data = json.loads(meta.read_text(encoding="utf-8"))
        return Path(data["file_path"])
    return None


def save_user_template(upload_path: Path, original_name: str, settings: Settings) -> str:
    uid = str(uuid.uuid4())
    udir = _user_dir(settings)
    dest = udir / f"{uid}.pptx"
    shutil.copy2(upload_path, dest)
    meta = {
        "id": uid,
        "display_name": original_name.rsplit(".", 1)[0],
        "file_path": str(dest),
        "uploaded_at": __import__("datetime").datetime.utcnow().isoformat() + "Z",
    }
    (udir / f"{uid}.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    return uid


def delete_user_template(template_id: str, settings: Settings) -> bool:
    if not template_id.startswith("user:"):
        return False
    uid = template_id.split(":", 1)[1]
    udir = _user_dir(settings)
    meta = udir / f"{uid}.json"
    if not meta.exists():
        return False
    data = json.loads(meta.read_text(encoding="utf-8"))
    fp = Path(data["file_path"])
    if fp.exists():
        fp.unlink()
    meta.unlink()
    return True
