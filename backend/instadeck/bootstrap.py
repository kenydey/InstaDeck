"""Create default template pptx if missing."""

from pathlib import Path

from pptx import Presentation


def ensure_builtin_default(target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists():
        return
    prs = Presentation()
    prs.save(str(target))
