import { useEffect, useState } from "react";
import { apiGet, apiPut } from "../api";

type SettingsDto = Record<string, unknown>;
type TemplateRow = { id: string; display_name: string; builtin: boolean };
type LlmSlotKey = "llm_parser" | "llm_outline" | "llm_render";
type VendorRow = { vendor_id: string; label: string; default_base_url?: string; doc_hint?: string };

const LLM_SLOTS: LlmSlotKey[] = ["llm_parser", "llm_outline", "llm_render"];

function stripLlmResponseFields(slot: Record<string, unknown>): Record<string, unknown> {
  const { api_key_configured, api_key_masked, ...rest } = slot;
  return rest;
}

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

export default function Settings() {
  const [data, setData] = useState<SettingsDto | null>(null);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [health, setHealth] = useState<string>("");
  const [pexelsKey, setPexelsKey] = useState("");
  const [pixabayKey, setPixabayKey] = useState("");
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [llmKeyDraft, setLlmKeyDraft] = useState<Record<LlmSlotKey, string>>({
    llm_parser: "",
    llm_outline: "",
    llm_render: "",
  });
  const [msg, setMsg] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const [s, t, v] = await Promise.all([
          apiGet<SettingsDto>("/settings"),
          apiGet<TemplateRow[]>("/templates"),
          apiGet<VendorRow[]>("/llm/vendors"),
        ]);
        setData(s);
        setTemplates(t);
        setVendors(v);
      } catch (e) {
        setMsg(String(e));
      }
    })();
  }, []);

  if (!data) {
    return <p className="text-slate-400">{msg || "加载中…"}</p>;
  }

  const defaults = (data.defaults as Record<string, string>) || {};

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-white">设置</h1>
      {msg && <p className="text-rose-400">{msg}</p>}
      {health && <p className="text-xs text-slate-400">{health}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
          onClick={async () => {
            setMsg("");
            setHealth("");
            try {
              const h = await apiGet<{ status: string; version: string }>("/health");
              setHealth(`后端状态：${h.status}（${h.version}）`);
            } catch (e) {
              setHealth(`后端状态：不可用（${String(e)}）`);
            }
          }}
        >
          检查连接
        </button>
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">默认 deck_profile</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block text-sm">
            <span className="text-slate-400">模板</span>
            <select
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2"
              value={defaults.template_id || "builtin:default"}
              onChange={(e) => setData({ ...data, defaults: { ...defaults, template_id: e.target.value } })}
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.display_name} {t.builtin ? "(内置)" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-slate-400">演示类型 content_type</span>
            <select
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2"
              value={defaults.content_type || "business_report"}
              onChange={(e) => setData({ ...data, defaults: { ...defaults, content_type: e.target.value } })}
            >
              {CONTENT_TYPES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-slate-400">视觉风格 visual_style</span>
            <select
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2"
              value={defaults.visual_style || "balanced"}
              onChange={(e) => setData({ ...data, defaults: { ...defaults, visual_style: e.target.value } })}
            >
              {VISUAL_STYLES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">LLM 三槽（OpenAI 兼容）</h2>
        <p className="mb-4 text-xs text-slate-500">
          每槽可单独配置厂商、Base URL 与 API Key；未填 Key 时回退环境变量 OPENAI_API_KEY。厂商列表来自{" "}
          <code className="text-slate-400">GET /api/v1/llm/vendors</code>。
        </p>
        <label className="mb-4 flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={Boolean(data.use_same_llm_for_all)}
            onChange={(e) => setData({ ...data, use_same_llm_for_all: e.target.checked })}
          />
          所有槽位使用相同 LLM（当前仅作为配置项保存）
        </label>
        <div className="grid gap-6 md:grid-cols-3">
          {LLM_SLOTS.map((slot) => {
            const cur = (data[slot] as Record<string, unknown>) || {};
            const masked = (cur.api_key_masked as string) || "";
            const vendorId = String(cur.vendor_id ?? "openai");
            const known = new Set(vendors.map((x) => x.vendor_id));
            const vendorList =
              known.has(vendorId) || !vendorId
                ? vendors
                : [
                    { vendor_id: vendorId, label: `${vendorId}（当前值）`, default_base_url: "", doc_hint: "" },
                    ...vendors,
                  ];
            const vendorMeta = vendorList.find((x) => x.vendor_id === vendorId);
            return (
              <div key={slot} className="space-y-2 rounded-lg border border-slate-800 p-3">
                <p className="text-xs font-mono text-slate-500">{slot}</p>
                <label className="block text-xs">
                  厂商
                  <select
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5"
                    value={vendorId}
                    onChange={(e) => {
                      const vid = e.target.value;
                      const v = vendorList.find((x) => x.vendor_id === vid);
                      const next: Record<string, unknown> = { ...cur, vendor_id: vid };
                      const bu = String(cur.base_url ?? "").trim();
                      if (v?.default_base_url && !bu) {
                        next.base_url = v.default_base_url;
                      }
                      setData({ ...data, [slot]: next });
                    }}
                  >
                    {vendorList.map((v) => (
                      <option key={v.vendor_id} value={v.vendor_id}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </label>
                {vendorMeta?.doc_hint ? (
                  <p className="text-[10px] leading-snug text-slate-500">{vendorMeta.doc_hint}</p>
                ) : null}
                <label className="block text-xs">
                  Base URL
                  <input
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 font-mono text-[11px]"
                    placeholder="https://…/v1"
                    value={String(cur.base_url ?? "")}
                    onChange={(e) => setData({ ...data, [slot]: { ...cur, base_url: e.target.value } })}
                  />
                </label>
                <label className="block text-xs">
                  API Key（保存时写入服务端）
                  <input
                    type="password"
                    autoComplete="off"
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 font-mono text-[11px]"
                    placeholder={masked || "未配置"}
                    value={llmKeyDraft[slot]}
                    onChange={(e) => setLlmKeyDraft((d) => ({ ...d, [slot]: e.target.value }))}
                  />
                </label>
                <label className="block text-xs">
                  model
                  <input
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1"
                    value={String(cur.model ?? "")}
                    onChange={(e) => setData({ ...data, [slot]: { ...cur, model: e.target.value } })}
                  />
                </label>
                <label className="block text-xs">
                  temperature
                  <input
                    type="number"
                    step={0.1}
                    min={0}
                    max={2}
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1"
                    value={Number(cur.temperature ?? 0.3)}
                    onChange={(e) =>
                      setData({
                        ...data,
                        [slot]: { ...cur, temperature: Number.parseFloat(e.target.value) || 0 },
                      })
                    }
                  />
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={Boolean(cur.enabled)}
                    onChange={(e) => setData({ ...data, [slot]: { ...cur, enabled: e.target.checked } })}
                  />
                  enabled
                </label>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">图库密钥（仅服务端存储）</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm">
            Pexels API Key
            <input
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 font-mono text-sm"
              placeholder={(data.images_pexels as { api_key_masked?: string })?.api_key_masked || "未配置"}
              value={pexelsKey}
              onChange={(e) => setPexelsKey(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            Pixabay API Key
            <input
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 font-mono text-sm"
              placeholder={(data.images_pixabay as { api_key_masked?: string })?.api_key_masked || "未配置"}
              value={pixabayKey}
              onChange={(e) => setPixabayKey(e.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">要点（bullets）</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={Boolean((data.bullets as { auto_icon_enabled?: boolean } | undefined)?.auto_icon_enabled)}
              onChange={(e) =>
                setData({
                  ...data,
                  bullets: { ...(data.bullets as object), auto_icon_enabled: e.target.checked },
                })
              }
            />
            自动 icon（启用/禁用）
          </label>
          <label className="block text-sm">
            <span className="text-slate-400">装饰模式</span>
            <select
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2"
              value={String((data.bullets as { decoration_mode?: string } | undefined)?.decoration_mode || "emoji")}
              onChange={(e) =>
                setData({
                  ...data,
                  bullets: { ...(data.bullets as object), decoration_mode: e.target.value },
                })
              }
            >
              <option value="emoji">emoji</option>
              <option value="small_image">small_image</option>
              <option value="native_shape">native_shape</option>
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">自定义模板</h2>
        <p className="mb-3 text-sm text-slate-400">上传 .pptx（ZIP 魔数校验）。内置模板不可删除。</p>
        <input
          type="file"
          accept=".pptx"
          className="text-sm"
          aria-label="上传自定义 PPTX 模板"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setMsg("");
            const fd = new FormData();
            fd.append("file", f);
            const r = await fetch("/api/v1/templates/upload", { method: "POST", body: fd });
            if (!r.ok) {
              setMsg(await r.text());
              return;
            }
            const j = await r.json();
            setMsg(`已上传：${j.template_id}`);
            setTemplates(await apiGet<TemplateRow[]>("/templates"));
          }}
        />
        <div className="mt-4 space-y-2">
          {templates
            .filter((t) => !t.builtin)
            .map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded border border-slate-800 bg-slate-950/40 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-slate-200">{t.display_name}</p>
                  <p className="truncate text-[11px] text-slate-500">{t.id}</p>
                </div>
                <button
                  type="button"
                  className="rounded border border-rose-700/60 bg-rose-950/40 px-3 py-1.5 text-xs text-rose-200 hover:bg-rose-950"
                  onClick={async () => {
                    if (!window.confirm(`确定删除模板「${t.display_name}」？`)) return;
                    setMsg("");
                    try {
                      const r = await fetch(`/api/v1/templates/${encodeURIComponent(t.id)}`, {
                        method: "DELETE",
                      });
                      if (!r.ok) throw new Error(await r.text());
                      setTemplates(await apiGet<TemplateRow[]>("/templates"));
                    } catch (e) {
                      setMsg(String(e));
                    }
                  }}
                >
                  删除
                </button>
              </div>
            ))}
          {templates.filter((t) => !t.builtin).length === 0 ? (
            <p className="text-xs text-slate-500">暂无用户自定义模板。</p>
          ) : null}
        </div>
      </section>

      <button
        type="button"
        className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
        onClick={async () => {
          setMsg("");
          try {
            const buildLlm = (key: LlmSlotKey) => {
              const raw = (data[key] as Record<string, unknown>) || {};
              const cur = stripLlmResponseFields(raw);
              const draft = llmKeyDraft[key].trim();
              if (draft) cur.api_key = draft;
              return cur;
            };
            const payload: Record<string, unknown> = {
              defaults: data.defaults,
              llm_parser: buildLlm("llm_parser"),
              llm_outline: buildLlm("llm_outline"),
              llm_render: buildLlm("llm_render"),
              bullets: data.bullets,
              use_same_llm_for_all: data.use_same_llm_for_all,
            };
            if (pexelsKey.trim()) {
              payload.images_pexels = { api_key: pexelsKey.trim(), enabled: true };
            }
            if (pixabayKey.trim()) {
              payload.images_pixabay = { api_key: pixabayKey.trim(), enabled: true };
            }
            await apiPut("/settings", payload);
            setPexelsKey("");
            setPixabayKey("");
            setLlmKeyDraft({ llm_parser: "", llm_outline: "", llm_render: "" });
            setMsg("已保存");
            setData(await apiGet("/settings"));
          } catch (e) {
            setMsg(String(e));
          }
        }}
      >
        保存设置
      </button>
      <p className="text-xs text-slate-500">
        说明：列表中的 Key 为脱敏展示；仅在输入框粘贴新 Key 并保存时才会更新服务端配置。
      </p>
    </div>
  );
}
