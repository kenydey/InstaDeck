# InstaDeck

**InstaDeck** 是从零搭建的「文档 / 描述 → 结构化大纲 → 可编辑 PPTX」全栈应用：FastAPI 后端 + React（Vite + TypeScript + Tailwind）前端。

## 术语

| 术语 | 含义 |
|------|------|
| `content_type` | 演示类型（商务汇报、学术研究、市调、战略规划等），主要影响 **大脑层** Prompt 与调研 query |
| `visual_style` | 视觉风格（偏商务、简洁、图表、文字等），主要影响 **渲染层** 主题映射 |
| `template_id` | 幻灯片母版：`builtin:{key}` 或 `user:{uuid}` |
| `deck_profile` | 上述三者组合；工作台可覆盖设置页默认值 |
| `structured_hints` | 解析层输出的表格 / 数值块 / 图表线索，供大纲生成 |
| `chart_spec` / 数据图 | 仅通过 **Office 原生 Chart**（python-pptx）渲染，不用 PNG 顶替 |
| 装饰图 | 图库（Pexels / Pixabay）配图，经 **Pillow** 预处理后插入 |

## 架构（摘要）

- **解析层**：`POST /api/v1/parse-document`（可选 Parser 槽 LLM）
- **调研层**：`POST /api/v1/research`
- **大脑层**：`POST /api/v1/generate-outline`、`POST /api/v1/revise-outline`（Outline 槽）
- **渲染层**：`POST /api/v1/render-pptx`（可选 Render 槽闸门 + `PPTXRenderer`）
- **设置**：`GET/PUT /api/v1/settings`；模板：`GET/POST/DELETE /api/v1/templates`

详见仓库内开发计划（Cursor Plans）与 `.env.example`。

## 快速开始

### 前置

- Python 3.11+
- [uv](https://docs.astral.sh/uv/)（推荐）或 pip
- Node.js 20+（前端）

### 一键安装

```bash
# Linux / macOS
./scripts/install.sh

# Windows
powershell -ExecutionPolicy Bypass -File scripts/install.ps1
```

### 本地运行

**后端**（仓库根目录下 `backend/`）：

```bash
cd backend
uv sync
cp ../.env.example ../.env   # 按需填写密钥
uv run uvicorn instadeck.main:app --reload --host 0.0.0.0 --port 8000
```

**前端**：

```bash
cd frontend
npm install
npm run dev
```

浏览器打开 Vite 提示的地址；API 经 `vite.config.ts` 代理到 `http://127.0.0.1:8000`。

### Docker

```bash
docker compose up --build
```

## 模板占位符契约

内置与用户模板须与渲染器约定一致（首版使用 **空白版式** 自建形状；若使用自定义 `.pptx`，须包含渲染器可写入的版式索引，详见 `backend/instadeck/renderer.py` 注释）。

## 路线图 v2（不阻断 v1）

- **Graphviz 逻辑图**：slide 标记 `diagram_kind: graphviz_dot` 时服务端 DOT → PNG 插入（与数据图通道隔离，见计划 FR-29）。
- **长任务进度**：WebSocket 或 SSE 推送解析 / 大纲 / 渲染阶段。
- **更强 PDF 解析**：MinerU 等可选管线。
- **MCP 工具封装**：将内部 API 以 MCP 暴露给外部 Agent（范围另行立项）。

## 许可证

MIT（若需修改请更新本文件）
# Test commit from Hermes Agent
