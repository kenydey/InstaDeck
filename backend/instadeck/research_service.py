"""Web research: Tavily if key present else heuristic mock."""

from __future__ import annotations

import httpx

from instadeck.config import get_settings
from instadeck.schemas import ResearchResponse, ResearchSource


async def run_research(brief: str, content_type: str | None = None) -> ResearchResponse:
    settings = get_settings()
    q = brief[:500]
    if content_type:
        q = f"{content_type}: {q}"
    if settings.tavily_api_key:
        async with httpx.AsyncClient(timeout=30.0) as client:
            r = await client.post(
                "https://api.tavily.com/search",
                json={
                    "api_key": settings.tavily_api_key,
                    "query": q,
                    "search_depth": "basic",
                    "max_results": 5,
                },
            )
            r.raise_for_status()
            data = r.json()
            sources = [
                ResearchSource(
                    title=o.get("title", ""),
                    url=o.get("url", ""),
                    snippet=o.get("content", "")[:400],
                )
                for o in data.get("results", [])
            ]
            ctx = "\n\n".join(f"- {s.title}: {s.snippet}" for s in sources)
            dps = []
            for o in data.get("results", [])[:3]:
                dps.append({"label": o.get("title", "")[:40], "metrics": {}, "source_url": o.get("url", "")})
            return ResearchResponse(sources=sources, context_text=ctx or brief[:2000], data_points=dps)

    # Mock
    sources = [
        ResearchSource(
            title="Reference (mock)",
            url="https://example.com",
            snippet=f"Summary for: {q[:200]}",
        )
    ]
    return ResearchResponse(
        sources=sources,
        context_text=f"(Mock research) {brief[:1500]}",
        data_points=[{"label": "2024", "metrics": {"value": 100.0}, "source_url": "https://example.com"}],
    )
