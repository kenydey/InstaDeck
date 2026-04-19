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

type LlmSlotPublic = { enabled?: boolean; vendor_id?: string; api_key_configured?: boolean };
type SettingsForHome = { defaults: DeckProfile; llm_outline?: LlmSlotPublic };

/** Cached result of parse-document; generate-outline runs on explicit button click. */
type ParsedDocCache = {
  text: string;
  structured_hints: unknown;
  frontmatter_suggested_profile?: unknown;
};

type OutlineViewMode = "cards" | "json";

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
  const [renderInstruction, setRenderInstruction] = useState("");
  const [pptxPreviewBusy, setPptxPreviewBusy] = useState(false);
  const [pptxPreviewJson, setPptxPreviewJson] = useState("");
  const [parsedDoc, setParsedDoc] = useState<ParsedDocCache | null>(null);
  const [parsedFileLabel, setParsedFileLabel] = useState("");
  const [outlineBusy, setOutlineBusy] = useState(false);
  const [outlineView, setOutlineView] = useState<OutlineViewMode>("cards");
  const [showGoSettings, setShowGoSettings] = useState(false);
  const [llmOutline, setLlmOutline] = useState<LlmSlotPublic | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [t, s] = await Promise.all([apiGet<TemplateRow[]>("/templates"), apiGet<SettingsForHome>("/settings")]);
        setTemplates(t);
        setDefaults(s.defaults);
        setProfile(s.defaults);
        setLlmOutline(s.llm_outline || null);
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

  const ensureRealOutlineLlmReady = useCallback(async (): Promise<boolean> => {
    setShowGoSettings(false);
    try {
      const s = await apiGet<SettingsForHome>("/settings");
      const slot = s.llm_outline || {};
      setLlmOutline(slot);
      const enabled = Boolean(slot.enabled);
      const vendor = String(slot.vendor_id || "");
      const configured = Boolean(slot.api_key_configured);
      if (!enabled || vendor === "mock" || !configured) {
        setMsg("未配置可用的 llm_outline（真实模型）。请先到【设置】启用 llm_outline 并填写 API Key（vendor 不能为 mock）。");
        setShowGoSettings(true);
        return false;
      }
      return true;
    } catch (e) {
      setMsg(`读取设置失败：${String(e)}`);
      return false;
    }
  }, []);

  const renderOutlineCards = useCallback(() => {
    const pres = parsedOutline as any;
    const slides = Array.isArray(pres?.slides) ? (pres.slides as any[]) : [];
    if (!slides.length) {
      return <p className="text-sm text-slate-500">暂无大纲。生成后将在这里按页展示。</p>;
    }
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-4">
          <p className="text-lg font-semibold text-slate-100">{String(pres?.title || "（无标题）")}</p>
          {pres?.subtitle ? <p className="mt-1 text-sm text-slate-400">{String(pres.subtitle)}</p> : null}
          {pres?.date ? <p className="mt-1 text-xs text-slate-500">{String(pres.date)}</p> : null}
        </div>
        {slides.map((s, idx) => {
          const bulletPoints = Array.isArray(s?.bullet_points) ? (s.bullet_points as any[]) : [];
          const chart = s?.chart_data;
          const categories = Array.isArray(chart?.categories) ? (chart.categories as any[]) : [];
          const series = Array.isArray(chart?.series) ? (chart.series as any[]) : [];
          return (
            <div key={idx} className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-100">
                    {idx + 1}. {String(s?.title || "（无标题页）")}
                  </p>
                  {s?.subtitle ? <p className="mt-1 text-xs text-slate-400">{String(s.subtitle)}</p> : null}
                </div>
                {s?.slide_type ? (
                  <span className="shrink-0 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-400">
                    {String(s.slide_type)}
                  </span>
                ) : null}
              </div>

              {bulletPoints.length ? (
                <ul className="mt-3 space-y-1 text-sm text-slate-200">
                  {bulletPoints.map((bp, j) => (
                    <li key={j} className="flex gap-2">
                      <span className="w-5 shrink-0 text-center text-slate-400">{String(bp?.icon || "•")}</span>
                      <span className="min-w-0 whitespace-pre-wrap">{String(bp?.text || "")}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-slate-500">（此页无要点）</p>
              )}

              {categories.length && series.length ? (
                <div className="mt-4 overflow-auto rounded border border-slate-800">
                  <table className="w-full text-xs text-slate-300">
                    <thead className="bg-slate-900/60 text-slate-400">
                      <tr>
                        <th className="px-2 py-2 text-left">Category</th>
                        {series.map((sr, k) => (
                          <th key={k} className="px-2 py-2 text-left">
                            {String(sr?.name || `S${k + 1}`)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {categories.slice(0, 30).map((c, r) => (
                        <tr key={r} className="border-t border-slate-800">
                          <td className="px-2 py-2">{String(c)}</td>
                          {series.map((sr, k) => (
                            <td key={k} className="px-2 py-2">
                              {Array.isArray(sr?.data) ? String(sr.data[r] ?? "") : ""}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }, [parsedOutline]);

  const downloadRenderedPptx = useCallback(async () => {
    if (!parsedOutline) {
      setMsg("大纲 JSON 无效");
      return;
    }
    setRenderBusy(true);
    setMsg("");
    try {
      const ri = renderInstruction.trim();
      const r = await fetch("/api/v1/render-pptx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          presentation: parsedOutline,
          deck_profile: profile,
          ...(ri ? { render_instruction: ri } : {}),
        }),
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
  }, [parsedOutline, profile, renderInstruction]);

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
          aria-label="模式 A：brief 描述"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={outlineBusy}
            className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500"
            onClick={async () => {
              if (outlineBusy) return;
              if (!(await ensureRealOutlineLlmReady())) return;
              setOutlineBusy(true);
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
                setOutlineView("cards");
              } catch (e) {
                setMsg(String(e));
              } finally {
                setOutlineBusy(false);
              }
            }}
          >
            {outlineBusy ? "生成中…" : "调研并生成大纲"}
          </button>
          <button
            type="button"
            disabled={outlineBusy}
            className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
            onClick={async () => {
              if (outlineBusy) return;
              if (!(await ensureRealOutlineLlmReady())) return;
              setOutlineBusy(true);
              setMsg("");
              try {
                const pres = await apiPost<unknown>("/generate-outline", {
                  source_type: "brief",
                  brief,
                  deck_profile: profile,
                });
                setOutlineJson(JSON.stringify(pres, null, 2));
                setOutlineView("cards");
              } catch (e) {
                setMsg(String(e));
              } finally {
                setOutlineBusy(false);
              }
            }}
          >
            {outlineBusy ? "生成中…" : "仅生成大纲"}
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
        <p className="mb-2 text-xs text-slate-500">
          选择文件后先解析；确认无误后点击「生成大纲」（使用当前上方 Deck profile）。
        </p>
        <input
          type="file"
          className="text-sm"
          aria-label="上传文档并解析（模式 B）"
          onChange={async (e) => {
            const input = e.target;
            const f = input.files?.[0];
            if (!f) return;
            setMsg("");
            setParsedDoc(null);
            setParsedFileLabel("");
            try {
              const r = await apiPostFile("/parse-document", f);
              if (!r.ok) throw new Error(await r.text());
              const parsed = (await r.json()) as {
                text: string;
                structured_hints: unknown;
                frontmatter_suggested_profile?: unknown;
              };
              const fm = parsed.frontmatter_suggested_profile;
              if (fm && window.confirm("检测到 Markdown frontmatter 建议的 deck_profile，是否应用到当前 Profile？")) {
                setProfile((p) => ({ ...p, ...(fm as DeckProfile) }));
              }
              setParsedDoc({
                text: parsed.text,
                structured_hints: parsed.structured_hints,
                frontmatter_suggested_profile: parsed.frontmatter_suggested_profile,
              });
              setParsedFileLabel(f.name);
            } catch (err) {
              setMsg(String(err));
              setParsedDoc(null);
            } finally {
              input.value = "";
            }
          }}
        />
        {parsedDoc ? (
          <div className="mt-4 space-y-3 rounded-lg border border-slate-800 bg-slate-950/50 p-4">
            <p className="text-sm text-slate-300">
              已解析 <span className="font-mono text-sky-300">{parsedFileLabel || "文件"}</span>
              ，正文约 <span className="font-mono">{parsedDoc.text.length}</span> 字符。
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={outlineBusy}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
                onClick={async () => {
                  if (!parsedDoc) return;
                  if (!(await ensureRealOutlineLlmReady())) return;
                  setOutlineBusy(true);
                  setMsg("");
                  try {
                    const pres = await apiPost<unknown>("/generate-outline", {
                      source_type: "raw_text",
                      text: parsedDoc.text,
                      structured_hints: parsedDoc.structured_hints,
                      deck_profile: profile,
                    });
                    setOutlineJson(JSON.stringify(pres, null, 2));
                    setOutlineView("cards");
                  } catch (err) {
                    setMsg(String(err));
                  } finally {
                    setOutlineBusy(false);
                  }
                }}
              >
                {outlineBusy ? "正在生成大纲…" : "生成大纲"}
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-400 hover:bg-slate-800"
                onClick={() => {
                  setParsedDoc(null);
                  setParsedFileLabel("");
                }}
              >
                清除解析结果
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">大纲</h2>
            {llmOutline ? (
              <p className="mt-1 text-xs text-slate-500">
                llm_outline：{String(llmOutline.vendor_id || "")} / {llmOutline.enabled ? "enabled" : "disabled"} /{" "}
                {llmOutline.api_key_configured ? "key ok" : "no key"}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`rounded-lg px-3 py-2 text-xs ${
                outlineView === "cards"
                  ? "bg-slate-200 text-slate-900"
                  : "border border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800"
              }`}
              onClick={() => setOutlineView("cards")}
            >
              自然语言视图
            </button>
            <button
              type="button"
              className={`rounded-lg px-3 py-2 text-xs ${
                outlineView === "json"
                  ? "bg-slate-200 text-slate-900"
                  : "border border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800"
              }`}
              onClick={() => setOutlineView("json")}
            >
              JSON（调试/可手改）
            </button>
          </div>
        </div>

        {showGoSettings ? (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded border border-rose-900/40 bg-rose-950/20 p-3 text-sm text-rose-200">
            <span>需要先配置真实模型才能生成大纲。</span>
            <button
              type="button"
              className="rounded border border-rose-700/60 bg-rose-950/40 px-3 py-1.5 text-xs hover:bg-rose-950"
              onClick={() => {
                window.location.hash = "#/settings";
              }}
            >
              去设置
            </button>
          </div>
        ) : null}

        {outlineView === "cards" ? (
          renderOutlineCards()
        ) : (
          <textarea
            className="h-72 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs leading-relaxed"
            value={outlineJson}
            onChange={(e) => setOutlineJson(e.target.value)}
            aria-label="大纲 JSON 编辑器"
          />
        )}

        <label className="mt-3 block text-sm">
          <span className="text-slate-400">可选渲染指令（render_instruction）</span>
          <textarea
            className="mt-1 h-20 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            value={renderInstruction}
            onChange={(e) => setRenderInstruction(e.target.value)}
            placeholder="例如：每页最多 5 行；尽量使用图表；结论页加醒目总结。"
          />
        </label>
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
            aria-label="修订大纲指令输入"
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
        <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/50 p-4">
          <p className="mb-2 text-sm text-slate-300">PPTX 预览（v1 stub）</p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              accept=".pptx"
              className="text-sm"
              aria-label="上传 PPTX 进行预览解析"
              onChange={async (e) => {
                const input = e.target;
                const f = input.files?.[0];
                if (!f) return;
                setPptxPreviewBusy(true);
                setMsg("");
                setPptxPreviewJson("");
                try {
                  const r = await apiPostFile("/pptx-preview", f);
                  if (!r.ok) throw new Error(await r.text());
                  const j = (await r.json()) as unknown;
                  setPptxPreviewJson(JSON.stringify(j, null, 2));
                } catch (err) {
                  setMsg(String(err));
                } finally {
                  setPptxPreviewBusy(false);
                  input.value = "";
                }
              }}
            />
            {pptxPreviewBusy ? <span className="text-xs text-slate-500">解析中…</span> : null}
          </div>
          {pptxPreviewJson ? (
            <pre className="mt-3 max-h-64 overflow-auto rounded bg-slate-950 p-3 text-xs text-slate-400">
              {pptxPreviewJson}
            </pre>
          ) : (
            <p className="mt-2 text-xs text-slate-500">用于联调接口：当前后端返回 stub JSON。</p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">图库检索</h2>
        <div className="flex flex-wrap gap-2">
          <input
            className="flex-1 min-w-[12rem] rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm"
            value={imageQuery}
            onChange={(e) => setImageQuery(e.target.value)}
            aria-label="图库检索关键词"
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
          aria-label="上传参考图片抽取风格"
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
