# 代码 Bug 识别 Agent

基于大模型（MiniMax）的代码 Bug 自动识别与修复工具。前端 Vue3 + 后端 Python，支持 Python / C / C++ / Java 四种语言，按 4 步流水线（系统分析 → 自动修复 → 执行验证 → 自我反思）输出结果并生成 PDF 修复报告。

## 技术栈

- **前端**：Vue 3 + Vite + TypeScript + Element Plus + Pinia + CodeMirror 6 + html2pdf.js
- **后端**：Python 3.10+ / FastAPI / httpx / sse-starlette / pydantic
- **LLM**：MiniMax 模型，OpenAI 风格接口（`base_url` + `api_key` + `model`）

## 目录结构

```
.
├── backend/        # FastAPI 后端
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── routers/    # health, analyze
│   │   ├── services/   # llm_client, analyze/fix/execute/reflect/orchestrator
│   │   ├── prompts/    # 4 阶段提示词
│   │   ├── models/     # Pydantic
│   │   └── utils/      # sandbox, json_extract
│   ├── .env.example
│   └── requirements.txt
└── frontend/       # Vue3 前端
    ├── src/
    │   ├── api/        # stream.ts SSE 解析
    │   ├── stores/     # agentStore.ts
    │   ├── views/      # WorkspaceView.vue
    │   └── components/
    └── package.json
```

## 启动步骤

### 1. 后端

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# Linux/Mac
# source .venv/bin/activate

pip install -r requirements.txt
copy .env.example .env   # Windows
# cp .env.example .env   # Linux/Mac

# 编辑 .env 填入你的 MINIMAX_API_KEY
# MINIMAX_API_KEY=sk-xxxxxx
# MINIMAX_BASE_URL=https://api.MiniMax.cn/v1
# MINIMAX_MODEL=MiniMax-M3

uvicorn app.main:app --reload --port 8000
```

健康检查：访问 http://localhost:8000/api/health 应返回 `{"status":"ok",...}`

### 2. 前端

```bash
cd frontend
npm install
npm run dev
```

打开 http://localhost:5173

## 使用流程

1. 在左侧选择代码语言（Python / C / C++ / Java），可直接粘贴代码或上传文件
2. 点击「开始分析」按钮，右侧会实时显示 4 个阶段的进度
3. 各阶段说明：
   - **系统分析**：定位代码中的 Bug 列表（行号、类型、严重程度）
   - **自动修复**：基于 Bug 列表生成完整修复代码
   - **执行验证**：Python 真实执行（subprocess + 5s 超时）；其他语言由 LLM 模拟运行
   - **自我反思**：LLM 自评修复正确性；若置信度 < 0.85 自动重试（最多 3 轮）
4. 完成后点击底部「生成 PDF 报告」下载详细修复报告

## API 接口

### `POST /api/analyze-stream`（SSE）

请求：
```json
{ "code": "...", "language": "python" }
```

事件流（`text/event-stream`）：
- `start` / `analysis` / `fix` / `execution` / `reflection` / `retry` / `done` / `error`

### `GET /api/health`
返回 `{"status":"ok","model":"MiniMax-M3"}`

## 已知限制

- **Windows 沙箱**：`resource` 模块在 Windows 不可用，仅靠 `timeout=5s` 兜底。生产建议使用 Docker 隔离。
- **C/C++/Java 执行**：仅 LLM 模拟运行结果，不真实编译执行。
- **Token 成本**：超过 8000 字符的代码会被截断。
- **安全性**：仅 Python 真实执行，README 默认假设你信任自己的代码输入。

## 风险与免责

本工具仅用于辅助学习和代码审查。自动修复结果不一定正确，请人工复核后再使用。不要对来自不可信源的代码启用「Python 执行」功能。