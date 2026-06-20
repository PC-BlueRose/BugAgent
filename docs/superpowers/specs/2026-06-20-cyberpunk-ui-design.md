# Bug Agent UI - Cyberpunk Cyber 设计 spec

**日期**: 2026-06-20
**作者**: 与用户沟通后确定
**目标**: 把当前朴素的 Vue 3 前端界面重新设计为「Cyberpunk Cyber」风格的炫酷 UI

---

## 1. Context

当前 Bug Agent 前端是一个标准的 Element Plus 风格管理界面：
- 浅色背景、灰色边框、标准按钮
- 4 个阶段卡片上下堆叠，视觉平淡
- 没有动画/视觉反馈
- PDF 报告也是普通白底文档

用户希望把整个界面重新设计为「看起来很炫酷」的赛博朋克风格：深黑背景 + 霓虹色（青蓝/品红）+ HUD 边框 + CRT 终端代码区 + 轻微辉光动效。同时让 PDF 报告与 UI 风格统一。

---

## 2. 整体设计决策（已与用户确认）

| 决策项 | 选择 |
|---|---|
| 视觉风格 | **赛博朋克 Cyberpunk**（经典款） |
| 主色调 | **青蓝 `#00f0ff` + 品红 `#ff0080`** |
| 背景色 | 深黑 `#0a0e1a` + 文字 `#e0e6ed` |
| 整体版式 | **三列 VSCode 风**（历史/代码/流水线） |
| 动效强度 | **极丰富**（脉冲、辉光、扫光） |
| 代码编辑器 | **CRT 终端风**（青绿光晕 + 扫描线 + 闪烁光标） |
| 阶段卡片 | **HUD 边框 + 数据流式填充** |
| 中间面板 | **输入 + 运行**（不要终端日志） |
| 装饰效果 | 仅**整体轻微辉光**（不加扫描线/粒子/完成闪光） |
| PDF 模板 | **与 UI 同款赛博风**（深色 + 青/品红） |

---

## 3. 布局架构

### 3.1 整体三列

```
┌────────────────────────────────────────────────────────────────────┐
│ Header: 标题 + 计时 + 状态徽章                                       │
├──────────┬──────────────────────────────────┬──────────────────────┤
│          │                                   │                      │
│ 左栏     │ 中栏                              │ 右栏                 │
│ HISTORY  │ INPUT :: SOURCE CODE             │ AGENT :: PIPELINE   │
│ 200px    │ flex-1                            │ 460px                │
│          │                                   │                      │
│ 最近分析 │ ┌─ 工具行 ─────────────────┐   │ ┌─01 SYSTEM ANALY──┐│
│ 列表     │ │ Lang | 上传 | 示例 | 清空 │   │ │ ✓ Two bugs found  ││
│          │ └────────────────────────────┘   │ └───────────────────┘│
│ ◉ 进行中 │                                   │ ┌─02 AUTO FIX ─────┐│
│ ✓ 完成   │ ┌─ 代码编辑器 (CRT 风) ───────┐  │ │ ✓ Patched        ││
│          │ │  $ def add(a, b):          │  │ └───────────────────┘│
│          │ │  _                          │  │ ┌─03 EXECUTION ────┐│
│          │ │  扫描线 + 闪烁光标          │  │ │ ⏳ Running        ││
│          │ └──────────────────────────────┘  │ └───────────────────┘│
│          │                                   │ ┌─04 REFLECTION ───┐│
│          │ ┌─ 运行按钮 ─────────────────┐  │ │ ○ Waiting         ││
│          │ │  ▶ 开始分析    ⏹ 停止       │  │ └───────────────────┘│
│          │ └──────────────────────────────┘  │                      │
├──────────┴──────────────────────────────────┴──────────────────────┤
│ Footer: PDF 按钮 + 状态提示                                          │
└────────────────────────────────────────────────────────────────────┘
```

### 3.2 配色系统

```css
:root {
  --bg-base: #0a0e1a;          /* 主背景：深黑带蓝 */
  --bg-panel: #111726;         /* 面板背景：稍亮一点 */
  --bg-code: #000000;          /* 代码区：纯黑 */
  --bg-elevated: #1a2138;      /* 提升层（hover/active） */

  --border-base: #2a3149;       /* 默认边框 */
  --border-active: #00f0ff;    /* 激活/聚焦边框：青蓝 */

  --primary: #00f0ff;          /* 主色：青蓝霓虹 */
  --accent: #ff0080;           /* 强调色：品红霓虹 */
  --success: #00ff9f;           /* 成功：青绿 */
  --warning: #ffe600;           /* 警告：黄 */
  --error: #ff3860;            /* 错误：红 */

  --text-primary: #e0e6ed;     /* 主文字 */
  --text-secondary: #8b96a8;   /* 次文字 */
  --text-muted: #4a5568;       /* 弱化文字 */
  --text-code: #7fdbff;        /* 代码文字：浅青绿 */

  --shadow-glow-primary: 0 0 12px rgba(0, 240, 255, 0.5);
  --shadow-glow-accent: 0 0 12px rgba(255, 0, 128, 0.5);
}
```

### 3.3 字体系统

```css
--font-mono: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
--font-display: 'JetBrains Mono', 'Fira Code', sans-serif;

/* 字号 */
--text-xs: 11px;
--text-sm: 12px;
--text-base: 13px;
--text-md: 14px;
--text-lg: 16px;
--text-xl: 20px;
--text-2xl: 24px;

/* 字间距 */
--tracking-tight: 0.02em;
--tracking-wide: 0.05em;
--tracking-wider: 0.1em;
```

---

## 4. 各区域详细设计

### 4.1 Header（顶部）
```
┌────────────────────────────────────────────────────────────────────┐
│  ▓▓▓ BUG//AGENT v2.4 ▓▓▓              ◉ ANALYZING · ⏱ 12.4s     │
└────────────────────────────────────────────────────────────────────┘
```

- 左：标题用 `▓▓▓` 装饰符包围，等宽字体加粗，字间距 0.1em，文字 `#00f0ff`
- 右：状态徽章 + 计时器
  - 状态：`<el-tag>` 改用自定义 CSS，背景透明，1px 边框，按状态变色
  - 计时器：`▌ ⏱ 12.4s` 格式，品红色，等宽字体
- 底部：1px `#00f0ff` 细分割线 + 微小辉光 `box-shadow: 0 0 8px rgba(0, 240, 255, 0.3)`

### 4.2 左栏 - History

```
┌──────────┐
│▌ HISTORY │
│          │
│ ◉ py_main│  ← 进行中（青色 + 脉冲点）
│   12.4s  │
│ ✓ c_loop │  ← 完成（品红 ✓）
│   8.1s   │
│ ✓ java   │
│   15.7s  │
│ ✓ cpp    │
│   9.3s   │
│          │
└──────────┘
```

- 标题：`▌ HISTORY`（带前缀装饰符 + 字间距）
- 历史项卡片：
  - 状态图标 + 语言名（紧凑）
  - 耗时（小字）
  - 状态色：进行中=青（脉冲点）、完成=品红 ✓、未开始=灰、空=暗灰
  - hover: 边框 `#00f0ff`，轻微辉光
  - 选中: 同上 + 内嵌辉光
- 底部: 不需要滚动条，超出部分截断显示

### 4.3 中栏 - 代码区

```
┌────────────────────────────────────────┐
│▌INPUT :: SOURCE CODE                    │
│ Python ▼ | 📁 上传 | 示例 | 清空   47字符│
├────────────────────────────────────────┤
│ $ def add(a, b):                       │
│     return a + b                       │
│ $ print(add(1, 2)                     │
│ _ ← 闪烁光标                            │
│                                         │
│ (微弱 CRT 扫描线背景)                  │
├────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────┐         │
│  │ ▶ 开始分析   │  │ ⏹ 停止   │         │
│  └──────────────┘  └──────────┘         │
└────────────────────────────────────────┘
```

#### 代码编辑器（CRT 风）
- 替换当前的 `textarea + highlight.js` 实现，改为：
  - 单一 `pre` + `code` 标签（不用 textarea，避免 v-model 同步问题）
  - 内容用 `contenteditable="true"` 让用户可输入
  - 字符变化时实时同步到 store（input 事件 → emit update:modelValue）
  - 视觉上覆盖一个闪烁光标（CSS 动画）
- 关键 CSS：
  ```css
  .code-editor {
    background: #000;
    color: #7fdbff;
    font-family: var(--font-mono);
    text-shadow: 0 0 4px rgba(127, 219, 255, 0.6);
    caret-color: #00f0ff;
    position: relative;
  }
  .code-editor::before {
    content: '';
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      to bottom,
      transparent 0,
      transparent 2px,
      rgba(0, 240, 255, 0.025) 2px,
      rgba(0, 240, 255, 0.025) 4px
    );
    pointer-events: none;
  }
  .code-editor::after {
    /* 闪烁光标 */
    content: '_';
    color: #00f0ff;
    animation: caret-blink 1s steps(2) infinite;
  }
  ```

#### 工具行
- 语言选择：`el-select` 重写样式，圆角 0，1px 边框，激活时青蓝
- 按钮：4 个并排，全部用 `▌` 前缀
- 字符数：右对齐，等宽小字

#### 运行按钮
- 「▶ 开始分析」: 主按钮
  - 背景：`#00f0ff`
  - 文字：`#0a0e1a`（黑底白字）
  - box-shadow: `0 0 16px rgba(0, 240, 255, 0.6)`
  - hover: 辉光增强到 0.8
  - active: 缩小 0.98
- 「⏹ 停止」: 次按钮
  - 透明背景，1px `#ff0080` 边框
  - 文字品红
  - hover: 边框辉光

### 4.4 右栏 - 4 阶段 HUD 卡片

```
┌────────────────────┐
│▌AGENT :: PIPELINE   │
├────────────────────┤
│ ╭─[ 01 ANALYSIS ]─╮│ ← 完成态：品红边
│ │ ✓ Two bugs      ││
│ ╰──────────────────╯│
├────────────────────┤
│ ╭─[ 02 FIX ]─────╮│ ← 完成态：品红边
│ │ ✓ def add:     ││
│ ╰──────────────────╯│
├────────────────────┤
│ ╭─[ 03 EXEC ]────╮ │ ← 进行中：青边 + 脉冲辉光
│ │ ⏳ Running...  │ │
│ ╰──────────────────╯│
├────────────────────┤
│ ╭─[ 04 REFLECT ]─╮│ ← 未开始：灰边
│ │ ○ Waiting      ││
│ ╰──────────────────╯│
└────────────────────┘
```

- 卡片视觉规格：
  ```css
  .stage-card {
    background: var(--bg-panel);
    border: 1px solid var(--border-base);
    padding: 12px 14px;
    margin-bottom: 10px;
    position: relative;
    transition: all 0.3s ease;
  }
  .stage-card.done {
    border-color: var(--accent);
    box-shadow: var(--shadow-glow-accent);
  }
  .stage-card.running {
    border-color: var(--primary);
    animation: pulse-glow 2s ease-in-out infinite;
  }
  ```
- 角标序号：`01-04`，等宽字体，小字，半透明
- 状态徽章（右上角）：
  - ✓ 完成（品红）
  - ⏳ 进行中（青，脉冲点动画）
  - ○ 待开始（灰）
  - ✗ 出错（红，闪烁）
- 内容区：复用现有 BugListCard / FixResultCard / ExecResultCard / ReflectionCard，但用更紧凑的版式
  - 修复卡片：代码块改为深黑底 + 青绿字
  - 执行卡片：stdout/stderr 用单色背景区分

---

## 5. PDF 模板（赛博风同款）

PDF 也用深色背景，但保持打印可读性。

### 5.1 整体规格
- A4 portrait
- 背景：`#0a0e1a`
- 文字：`#e0e6ed`
- 主色：`#00f0ff`
- 强调色：`#ff0080`
- 代码块：`#000` 背景 + `#7fdbff` 文字

### 5.2 章节结构
```
[BUG//AGENT REPORT v2.4]                ← 大标题，青蓝，字间距 0.1em
═══════════════════════════════════════
生成时间：...  |  语言：Python  |  ...
─────────────────────────────────────
▓▓▓ 1. 分析摘要                          ← 章节标题（带 ▓▓▓ 前缀）
   代码存在两处语法错误...
▓▓▓ 2. Bug 列表
   ┌────┬────────┬──────┬──────────┐
   │ 行 │ 类型   │严重度│ 描述     │
   ├────┼────────┼──────┼──────────┤
   │ 1  │Syntax..│ high │ ...      │
   └────┴────────┴──────┴──────────┘
▓▓▓ 3. 原始代码
   ┌──────────────────────────────┐
   │ def add(a, b):               │  ← 深色代码块
   │     return a + b             │
   └──────────────────────────────┘
...
─────────────────────────────────────
                            BUG//AGENT v2.4 | 第 1 / N 页
```

### 5.3 PDF 文件结构
- 修改 [pdf.ts](frontend/src/utils/pdf.ts) 中的 `getReportCss()` 和 `buildReportHtml()`
- 字体仍用 html2canvas 渲染后嵌入 jsPDF（保留现有方案）
- CSS 改为赛博风调色板

---

## 6. 组件改动清单

### 6.1 复用现有组件
- `BugListCard.vue` - 适配紧凑赛博风表格
- `FixResultCard.vue` - 紧凑代码块展示
- `ExecResultCard.vue` - 单色 stdout/stderr
- `ReflectionCard.vue` - 紧凑标签 + 置信度条

### 6.2 需重写的组件
- `WorkspaceView.vue` - 三列布局 + 全新样式
- `CodeMirrorEditor.vue` → `CodeEditor.vue` - 改用 contenteditable pre（CRT 风）
- `ReportPreviewDialog.vue` - 赛博 PDF 模板

### 6.3 新增组件
- `HistoryPanel.vue` - 左栏历史列表
- `CyberButton.vue` - 统一按钮样式（青蓝主按钮 / 品红次按钮）

### 6.4 store 改动
- `agentStore.ts` 新增 `history: HistoryEntry[]` 字段
  - 每次分析完成时记录 `{ code, language, status, elapsedMs, timestamp }`
  - localStorage 持久化（最多 20 条）
  - 左栏点击历史项可以重新加载代码

---

## 7. 关键文件清单

| 文件 | 改动类型 | 说明 |
|---|---|---|
| `frontend/src/views/WorkspaceView.vue` | **重写** | 三列布局 + 全新赛博样式 |
| `frontend/src/components/CodeEditor.vue` | **新建** | 替换 CodeMirrorEditor，contenteditable CRT 风 |
| `frontend/src/components/HistoryPanel.vue` | **新建** | 左栏历史列表 |
| `frontend/src/components/CyberButton.vue` | **新建** | 赛博风按钮组件 |
| `frontend/src/components/StageCard.vue` | **新建** | HUD 边框卡片包装器 |
| `frontend/src/components/BugListCard.vue` | 修改 | 紧凑赛博表格 |
| `frontend/src/components/FixResultCard.vue` | 修改 | 紧凑代码块 |
| `frontend/src/components/ExecResultCard.vue` | 修改 | 单色 stdout/stderr |
| `frontend/src/components/ReflectionCard.vue` | 修改 | 紧凑标签 |
| `frontend/src/utils/pdf.ts` | 修改 | PDF 赛博模板（CSS + HTML） |
| `frontend/src/stores/agentStore.ts` | 修改 | 新增 history 字段 + localStorage |
| `frontend/src/style.css` | 修改 | 全局赛博变量 |

---

## 8. 验证标准

### 8.1 视觉验证（Playwright + 截图对比）
- 截图与设计 mockup 一致
- 三列布局对齐
- 颜色完全符合配色变量
- 字体全部为等宽

### 8.2 交互验证
- 阶段状态切换有正确辉光动画
- 代码编辑器可输入 + 同步到 store
- 历史列表可点击加载
- PDF 下载后用 Edge 打开正常显示
- PDF 视觉风格与 UI 一致（深色 + 青/品红）

### 8.3 端到端测试
所有现有 14/14 项端到端测试继续通过：
- 编辑器同步
- 4 阶段流程
- 计时显示
- PDF 视觉内容

---

## 9. 不在范围内

- 添加新的分析阶段
- 改变后端 API
- 多用户/账号系统
- 暗/亮模式切换（只做暗模式赛博）
- 移动端适配（仅桌面）
- 国际化（仅中文）