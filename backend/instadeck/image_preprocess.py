"""FR-24: Decorative image preprocessing (object-fit cover style) before add_picture."""

from __future__ import annotations

import io

from PIL import Image


def preprocess_for_placeholder(
    image_bytes: bytes,
    target_w: int,
    target_h: int,
    fmt: str = "PNG",
    max_edge: int | None = 2048,
) -> bytes:
    """Scale & center-crop to cover target box."""
    im = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    iw, ih = im.size
    if max_edge and max(iw, ih) > max_edge:
        scale_down = max_edge / float(max(iw, ih))
        im = im.resize((max(1, int(iw * scale_down)), max(1, int(ih * scale_down))), Image.Resampling.LANCZOS)
        iw, ih = im.size
    tw, th = target_w, target_h
    scale = max(tw / iw, th / ih)
    nw, nh = int(iw * scale), int(ih * scale)
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    left = max(0, (nw - tw) // 2)
    top = max(0, (nh - th) // 2)
    im = im.crop((left, top, left + tw, top + th))
    buf = io.BytesIO()
    im.save(buf, format=fmt)
    return buf.getvalue()
