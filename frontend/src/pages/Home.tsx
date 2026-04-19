import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, apiPostFile, apiPut } from "../api";

const CONTENT_TYPES = [
  "business_report",
  "academic",
  "market_research",
  "strategic_planning",
  "product_launch",
  "investment_pitch",
  "training",
  "operations_review",
  "tech_transfer",
];

const VISUAL_STYLES = [
  "business_formal",
  "minimal",
  "chart_forward",
  "text_forward",
  "balanced",
  "story",
];

type DeckProfile = {
  template_id: string;
  content_type: string;
  visual_style: string;
  persona?: string;
};

type TemplateRow = { id: string; display_name: string; builtin: boolean };

export default function Home() {
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [defaults, setDefaults] = useState<DeckProfile | null>(null);
  const [profile, setProfile] = useState<DeckProfile>({
    template_id: "builtin:default",
    content_type: "business_report",
    visual_style: "balanced",
    persona: "",
  });
  const [brief, setBrief] = useState("用三条要点说明我们本季度增长驱动力与风险。");
  const [outlineJson, setOutlineJson] = useState("");
  const [lint, setLint] = useState<string>("");
  const [msg, setMsg] = useState("");
  const [researchCtx, setResearchCtx] = useState<unknown>(null);
  const [imageQuery, setImageQuery] = useState("office workspace");
  const [imageHits, setImageHits] = useState<unknown[]>([]);
  const [renderBusy, setRenderBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const [t, s] = await Promise.all([
          apiGet<TemplateRow[]>("/templates"),
          apiGet<{ defaults: DeckProfile }>("/settings"),
        ]);
        setTemplates(t);
        setDefaults(s.defaults);
        setProfile(s.defaults);
      } catch (e) {
        setMsg(String(e));
      }
    })();
  }, []);

  const parsedOutline = useMemo(() => {
    try {
      return JSON.parse(outlineJson || "{}");
    } catch {
      return null;
    }
  }, [outlineJson]);

  const downloadRenderedPptx = useCallback(async () => {
    if (!parsedOutline) {
      setMsg("大纲 JSON 无效");
      return;
    }
    setRenderBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/v1/render-pptx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presentation: parsedOutline, deck_profile: profile }),
      });
      if (!r.ok) throw new Error(await r.text());
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "instadeck.pptx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setMsg(String(e));
    } finally {
      setRenderBusy(false);
    }
  }, [parsedOutline, profile]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">工作台</h1>
        <p className="mt-1 text-sm text-slate-400">选择模板 / 演示类型 / 视觉风格，生成大纲、修订并渲染 PPTX。</p>
      </div>
      {msg && <p className="text-sm text-rose-400">{msg}</p>}

      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">Deck profile（覆盖默认）</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block text-sm">
            <span className="text-slate-400">模板</span>
            <select
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2"
              value={profile.template_id}
              onChange={(e) => setProfile({ ...profile, template_id: e.target.value })}
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.display_name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-slate-400">content_type</span>
            <select
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2"
              value={profile.content_type}
              onChange={(e) => setProfile({ ...profile, content_type: e.target.value })}
            >
              {CONTENT_TYPES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-slate-400">visual_style</span>
            <select
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2"
              value={profile.visual_style}
              onChange={(e) => setProfile({ ...profile, visual_style: e.target.value })}
            >
              {VISUAL_STYLES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
            onClick={() => defaults && setProfile(defaults)}
          >
            恢复为设置默认值
          </button>
          <button
            type="button"
            className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-600"
            onClick={async () => {
              if (!defaults) return;
              setMsg("");
              try {
                await apiPut("/settings", { defaults: profile });
                setDefaults(profile);
                setMsg("已写入全局默认设置");
              } catch (e) {
                setMsg(String(e));
              }
            }}
          >
            存为默认设置
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">模式 A：描述 + 调研</h2>
        <textarea
          className="h-28 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500"
            onClick={async () => {
              setMsg("");
              try {
                const rs = await apiPost<unknown>("/research", { brief, content_type: profile.content_type });
                setResearchCtx(rs);
                const pres = await apiPost<unknown>("/generate-outline", {
                  source_type: "brief",
                  brief,
                  research_snapshot: rs,
                  deck_profile: profile,
                });
                setOutlineJson(JSON.stringify(pres, null, 2));
              } catch (e) {
                setMsg(String(e));
              }
            }}
          >
            调研并生成大纲
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
            onClick={async () => {
              setMsg("");
              try {
                const pres = await apiPost<unknown>("/generate-outline", {
                  source_type: "brief",
                  brief,
                  deck_profile: profile,
                });
                setOutlineJson(JSON.stringify(pres, null, 2));
              } catch (e) {
                setMsg(String(e));
              }
            }}
          >
            仅生成大纲
          </button>
        </div>
        {researchCtx && (
          <pre className="mt-3 max-h-40 overflow-auto rounded bg-slate-950 p-3 text-xs text-slate-400">
            {JSON.stringify(researchCtx, null, 2)}
          </pre>
        )}
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">模式 B：上传文档</h2>
        <input
          type="file"
          className="text-sm"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setMsg("");
            try {
              const r = await apiPostFile("/parse-document", f);
              if (!r.ok) throw new Error(await r.text());
              const parsed = await r.json();
              const hints = parsed.structured_hints;
              const fm = parsed.frontmatter_suggested_profile;
              if (fm && window.confirm("检测到 Markdown frontmatter 建议的 deck_profile，是否应用到当前 Profile？")) {
                setProfile((p) => ({ ...p, ...fm }));
              }
              const pres = await apiPost<unknown>("/generate-outline", {
                source_type: "raw_text",
                text: parsed.text,
                structured_hints: hints,
                deck_profile: profile,
              });
              setOutlineJson(JSON.stringify(pres, null, 2));
            } catch (err) {
              setMsg(String(err));
            }
          }}
        />
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">大纲 JSON（可手改）</h2>
        <textarea
          className="h-72 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs leading-relaxed"
          value={outlineJson}
          onChange={(e) => setOutlineJson(e.target.value)}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
            onClick={async () => {
              if (!parsedOutline) {
                setLint("JSON 无效");
                return;
              }
              const r = await apiPost<{ warnings: string[] }>("/presentation/lint", parsedOutline);
              setLint(r.warnings.join("\n") || "无警告");
            }}
          >
            Critic / Lint
          </button>
          <input
            className="flex-1 min-w-[12rem] rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm"
            placeholder="自然语言修订指令，例如：把第二张改成两个要点"
            id="revise-input"
          />
          <button
            type="button"
            className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-500"
            onClick={async () => {
              const instr = (document.getElementById("revise-input") as HTMLInputElement).value;
              if (!parsedOutline || !instr) return;
              setMsg("");
              try {
                const pres = await apiPost<unknown>("/revise-outline", {
                  presentation: parsedOutline,
                  instruction: instr,
                  deck_profile: profile,
                });
                setOutlineJson(JSON.stringify(pres, null, 2));
              } catch (e) {
                setMsg(String(e));
              }
            }}
          >
            修订大纲
          </button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-800 pt-4">
          <button
            type="button"
            disabled={renderBusy}
            className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
            onClick={() => void downloadRenderedPptx()}
          >
            {renderBusy ? "正在生成 PPT…" : "生成 PPT"}
          </button>
          <span className="text-xs text-slate-500">调用后端 /api/v1/render-pptx，使用当前大纲 JSON 与上方 Deck profile</span>
        </div>
        {lint && (
          <pre className="mt-3 whitespace-pre-wrap rounded bg-slate-950 p-3 text-xs text-amber-200">{lint}</pre>
        )}
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">渲染与预览</h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={renderBusy}
            className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
            onClick={() => void downloadRenderedPptx()}
          >
            {renderBusy ? "生成中…" : "下载 PPTX（同生成）"}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">预览：v1 后端返回 stub；可在本地用 PowerPoint 打开下载文件。</p>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">图库检索</h2>
        <div className="flex flex-wrap gap-2">
          <input
            className="flex-1 min-w-[12rem] rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm"
            value={imageQuery}
            onChange={(e) => setImageQuery(e.target.value)}
          />
          <button
            type="button"
            className="rounded-lg border border-slate-600 px-3 py-2 text-sm"
            onClick={async () => {
              setMsg("");
              try {
                const hits = await apiPost<unknown[]>("/image-search", { query: imageQuery, provider: "pexels" });
                setImageHits(hits);
              } catch (e) {
                setMsg(String(e));
              }
            }}
          >
            Pexels
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-600 px-3 py-2 text-sm"
            onClick={async () => {
              setMsg("");
              try {
                const hits = await apiPost<unknown[]>("/image-search", { query: imageQuery, provider: "pixabay" });
                setImageHits(hits);
              } catch (e) {
                setMsg(String(e));
              }
            }}
          >
            Pixabay
          </button>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {imageHits.slice(0, 6).map((h, i) => {
            const hit = h as { preview_url?: string; attribution?: string };
            return (
              <figure key={i} className="overflow-hidden rounded border border-slate-800">
                {hit.preview_url && (
                  <img src={hit.preview_url} alt="" className="h-32 w-full object-cover" />
                )}
                <figcaption className="p-2 text-[10px] text-slate-500">{hit.attribution}</figcaption>
              </figure>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">参考图抽风格（FR-27）</h2>
        <input
          type="file"
          accept="image/*"
          className="text-sm"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setMsg("");
            const fd = new FormData();
            fd.append("file", f);
            const r = await fetch("/api/v1/style-from-reference", { method: "POST", body: fd });
            if (!r.ok) {
              setMsg(await r.text());
              return;
            }
            const j = await r.json();
            window.alert(JSON.stringify(j, null, 2));
          }}
        />
      </section>
    </div>
  );
}
