from __future__ import annotations

from instadeck.image_preprocess import preprocess_for_placeholder
from PIL import Image


def test_preprocess_cover_crop() -> None:
    im = Image.new("RGB", (800, 200), color=(255, 0, 0))
    import io

    buf = io.BytesIO()
    im.save(buf, format="PNG")
    out = preprocess_for_placeholder(buf.getvalue(), 100, 100)
    im2 = Image.open(io.BytesIO(out))
    assert im2.size == (100, 100)
