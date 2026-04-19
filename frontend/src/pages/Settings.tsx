import { useEffect, useState } from "react";
import { apiGet, apiPut } from "../api";

type SettingsDto = Record<string, unknown>;
type TemplateRow = { id: string; display_name: string; builtin: boolean };

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
  const [pexelsKey, setPexelsKey] = useState("");
  const [pixabayKey, setPixabayKey] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const [s, t] = await Promise.all([
          apiGet<SettingsDto>("/settings"),
          apiGet<TemplateRow[]>("/templates"),
        ]);
        setData(s);
        setTemplates(t);
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
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">LLM 三槽</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {(["llm_parser", "llm_outline", "llm_render"] as const).map((slot) => {
            const cur = (data[slot] as Record<string, unknown>) || {};
            return (
              <div key={slot} className="space-y-2 rounded-lg border border-slate-800 p-3">
                <p className="text-xs font-mono text-slate-500">{slot}</p>
                <label className="block text-xs">
                  vendor_id
                  <input
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1"
                    value={String(cur.vendor_id ?? "")}
                    onChange={(e) =>
                      setData({ ...data, [slot]: { ...cur, vendor_id: e.target.value } })
                    }
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
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">自定义模板</h2>
        <p className="mb-3 text-sm text-slate-400">上传 .pptx（ZIP 魔数校验）。内置模板不可删除。</p>
        <input
          type="file"
          accept=".pptx"
          className="text-sm"
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
      </section>

      <button
        type="button"
        className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
        onClick={async () => {
          setMsg("");
          try {
            const payload: Record<string, unknown> = {
              defaults: data.defaults,
              llm_parser: data.llm_parser,
              llm_outline: data.llm_outline,
              llm_render: data.llm_render,
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
