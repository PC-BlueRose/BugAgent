# Bug Agent UI - Apple Style 简约 设计 spec

**日期**: 2026-06-20
**作者**: 与用户沟通后确定
**目标**: 把当前赛博朋克 UI 重设计为 Apple macOS Sonoma 简约风格，支持亮/暗双主题切换

> 前序：赛博朋克版本已保存为 `cyberpunk-v1` git tag，可回退。

---

## 1. Context

用户试用了赛博朋克风格后反馈「不够好看」，希望改为苹果公司风格的简约 UI。要求：
- 整体克制（被减法美学）
- 双主题切换（亮色 + 暗色）
- Apple 系统蓝作为主调色
- Xcode-Lite 风格的代码编辑器
- SF Symbols 风格的阶段状态
- macOS Sonoma 标志性毛玻璃效果

---

## 2. 整体设计决策（已与用户确认）

| 决策项 | 选择 |
|---|---|
| 主题模式 | **双主题切换**（亮色 + 暗色） |
| 主调色 | **Apple 系统蓝**（亮 `#007AFF` / 暗 `#0A84FF`） |
| 字体 | **系统字体**（`-apple-system, BlinkMacSystemFont, "SF Pro Display"`, "SF Pro Text"`) |
| 代码字体 | **SF Mono**（`SF Mono, ui-monospace, Menlo, monospace`） |
| 代码编辑器 | **Xcode-Lite 风**（浅色 + 语法高亮） |
| 阶段卡片 | **SF Symbols 勾选列表**（横向卡片 + 状态图标） |
| 装饰元素 | **仅毛玻璃**（顶部/底部 `backdrop-filter: blur(20px) saturate(180%)`） |
| PDF 模板 | **Apple 标准 A4**（纯白 + SF Pro + 干净表格） |
| 布局 | 三列 VSCode 风（保留） |

---

## 3. 配色系统（CSS 变量）

### 3.1 亮色主题（默认）

```css
:root {
  /* 背景 */
  --bg-base: #ffffff;            /* 主背景：纯白 */
  --bg-panel: #fafafa;           /* 面板背景：极浅灰 */
  --bg-elevated: #f5f5f7;        /* 提升层（hover） */
  --bg-code: #ffffff;            /* 代码区：与背景一致 */

  /* 边框 */
  --border-base: #e5e5ea;        /* 默认边框 */
  --border-strong: #d1d1d6;      /* 强调边框 */

  /* 主色 */
  --primary: #007aff;            /* Apple 系统蓝 */
  --primary-soft: rgba(0, 122, 255, 0.08);
  --primary-hover: #0a84ff;

  /* 状态色 */
  --success: #34c759;            /* Apple 绿 */
  --warning: #ff9500;            /* Apple 橙 */
  --error: #ff3b30;              /* Apple 红 */

  /* 文字 */
  --text-primary: #1d1d1f;
  --text-secondary: #6e6e73;     /* 次文字（Apple 标准 secondary） */
  --text-tertiary: #8e8e93;       /* 弱化文字 */
  --text-on-primary: #ffffff;

  /* 语法高亮 */
  --syntax-keyword: #af52de;      /* 紫 */
  --syntax-function: #4f46e5;     /* 蓝 */
  --syntax-string: #c2410c;       /* 橙 */
  --syntax-comment: #6b7280;      /* 灰 */
  --syntax-number: #098658;       /* 绿 */
  --syntax-operator: #1d1d1f;
  --syntax-default: #1d1d1f;

  /* 阴影（Apple 标准） */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.12);
}
```

### 3.2 暗色主题

```css
[data-theme='dark'] {
  --bg-base: #1e1e1e;
  --bg-panel: #2c2c2e;
  --bg-elevated: #3a3a3c;
  --bg-code: #1e1e1e;

  --border-base: #38383a;
  --border-strong: #48484a;

  --primary: #0a84ff;
  --primary-soft: rgba(10, 132, 255, 0.15);
  --primary-hover: #409cff;

  --success: #30d158;
  --warning: #ff9f0a;
  --error: #ff453a;

  --text-primary: #f5f5f7;
  --text-secondary: #98989d;
  --text-tertiary: #6e6e73;

  --syntax-keyword: #ff7ab6;
  --syntax-function: #5ac8fa;
  --syntax-string: #ff9f0a;
  --syntax-comment: #6e6e73;
  --syntax-number: #30d158;

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.2);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.4);
}
```

### 3.3 字体

```css
--font-system: -apple-system, BlinkMacSystemFont, 'SF Pro Display',
  'SF Pro Text', 'Helvetica Neue', 'PingFang SC', 'Microsoft YaHei', sans-serif;
--font-mono: 'SF Mono', ui-monospace, Menlo, Consolas, 'Courier New', monospace;
```

### 3.4 圆角与间距

```css
--radius-sm: 6px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-xl: 16px;

--space-xs: 4px;
--space-sm: 8px;
--space-md: 12px;
--space-lg: 16px;
--space-xl: 24px;
```

---

## 4. 布局架构

### 4.1 整体三列

```
┌─────────────────────────────────────────────────────────────────────┐
│  ▌ Bug Agent              ⏱ 12.4s  ·  ✓ 完成     ☀ / 🌙  │ ← 毛玻璃
├──────────┬──────────────────────────────────┬──────────────────────┤
│          │                                   │                      │
│ History  │ Source Code                       │ Analysis Pipeline    │
│ 200px    │ flex-1                            │ 460px                │
│          │                                   │                      │
│ ✓ py     │ 1  def add(a, b):               │ ✓ 系统分析           │
│   12.4s  │ 2      return a + b             │   检测 2 个 bug      │
│ ✓ c      │ 3  print(add(1, 2))           │                      │
│   8.1s   │                                   │ ✓ 自动修复           │
│ ✓ java   │ (浅色背景 + 语法高亮)           │   def 已修补         │
│   15.7s  │                                   │                      │
│ ✓ cpp    │                                   │ ⏳ 执行验证           │
│   9.3s   │                                   │   正在运行...        │
│          │ [ 开始分析 ]  [ 停止 ]           │                      │
│          │                                   │ ○ 自我反思           │
│          │                                   │   等待中             │
├──────────┴──────────────────────────────────┴──────────────────────┤
│  [ ⬇ 生成 PDF 报告 ]    点击下载 A4 报告 (1 轮, 12.4s)     │ ← 毛玻璃
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 Header（毛玻璃）
```css
.ws-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 1px solid var(--border-base);
}
[data-theme='dark'] .ws-header {
  background: rgba(30, 30, 30, 0.72);
}
```

### 4.3 Footer（毛玻璃）
类似 Header，固定在底部。

### 4.4 历史栏
```css
.hp-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s ease;
}
.hp-item:hover {
  background: var(--bg-elevated);
}
.hp-item.is-active {
  background: var(--primary-soft);
  border-left: 2px solid var(--primary);
}
```

### 4.5 代码编辑器
- 背景：`var(--bg-code)`（亮 `#FFFFFF` / 暗 `#1E1E1E`）
- 字体：`var(--font-mono)`
- 行号：左对齐 灰色
- 当前行高亮：`background: rgba(0, 122, 255, 0.04)`
- 无扫描线、无霓虹光晕 — 纯静态

### 4.6 阶段卡片（SF Symbols 风格）

```vue
<template>
  <div :class="['stage', `is-${status}`]">
    <span class="stage-icon">
      <!-- SVG 模拟 SF Symbols -->
      <template v-if="status === 'done'">✓</template>
      <template v-else-if="status === 'running'">⏳</template>
      <template v-else-if="status === 'error'">✗</template>
      <template v-else>○</template>
    </span>
    <div class="stage-body">
      <div class="stage-title">{{ title }}</div>
      <div class="stage-desc">{{ description }}</div>
    </div>
  </div>
</template>

<style>
.stage {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-base);
}
.stage-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
}
.stage.is-done .stage-icon {
  color: var(--success);
}
.stage.is-running .stage-icon {
  color: var(--primary);
}
.stage.is-error .stage-icon {
  color: var(--error);
}
.stage.is-idle .stage-icon {
  color: var(--text-tertiary);
}
</style>
```

---

## 5. 主题切换实现

### 5.1 三种模式
1. **跟随系统**：CSS `@media (prefers-color-scheme: dark)`
2. **手动亮色**：`<html data-theme="light">`
3. **手动暗色**：`<html data-theme="dark">`

### 5.2 状态持久化
- `localStorage['bug-agent-theme'] = 'light' | 'dark' | 'auto'`
- 默认 `'auto'`

### 5.3 切换按钮
Header 右上角小图标按钮（☀/🌙）：
```vue
<button class="theme-toggle" @click="cycleTheme">
  {{ themeIcon }}
</button>
```

---

## 6. PDF 模板（Apple 标准 A4）

### 6.1 整体规格
- A4 portrait, 纯白背景 `#FFFFFF`
- 字体：`-apple-system, "SF Pro Text", "PingFang SC", "Microsoft YaHei", sans-serif`
- 主色：`#1D1D1F` 文字 / `#007AFF` Apple 蓝强调
- 表格：`#F5F5F7` 表头 + `#E5E5EA` 细边框

### 6.2 章节结构
```
Bug Agent — 代码修复报告                    ← SF Pro Display 22pt
═══════════════════════════════════════
2026/6/20 14:00  |  Python  |  18.7s     ← 元信息（次色 #6E6E73）

1. 分析摘要
代码存在两处语法错误...

2. Bug 列表（2）
┌──────┬────────┬──────┬────────────┐
│ 行号 │ 类型   │ 严重 │ 描述       │
├──────┼────────┼──────┼────────────┤
│ 1    │Syntax..│ high │ ...        │
│ 3    │Syntax..│ high │ ...        │
└──────┴────────┴──────┴────────────┘

3. 原始代码
def add(a, b):                  ← 等宽
    return a + b
print(add(1, 2))

4. 修复后代码
def add(a, b):
    return a + b
print(add(1, 2))

5. 执行结果
退出码：0  |  真实执行  |  否  |  Python 真实执行

stdout: 3
stderr: (empty)

6. 自我反思
修复正确：✓  是  |  置信度：99.0%  |  需要重试：否

仍存在的问题
  • ...
```

---

## 7. 组件改动清单

### 7.1 复用现有组件
- `BugListCard.vue` - 改用 Apple 风格表格
- `FixResultCard.vue` - 等宽代码块（无霓虹光晕）
- `ExecResultCard.vue` - 简洁指标 + 等宽 stdout/stderr
- `ReflectionCard.vue` - 简洁标签 + 蓝色进度条
- `HistoryPanel.vue` - 极简列表
- `StageCard.vue` - SF Symbols 勾选风格
- `CodeEditor.vue` - 改为 contenteditable pre（保留 + Apple 配色）

### 7.2 需重写
- `WorkspaceView.vue` - 全新样式 + 主题切换按钮 + 毛玻璃 Header/Footer
- `CyberButton.vue` → `AppleButton.vue`（不删，新建 Apple 风格版本）
- `pdf.ts` - Apple 风格 PDF 模板
- `style.css` - 全局 Apple 配色变量

### 7.3 新增
- `ThemeToggle.vue` - 主题切换按钮

### 7.4 删除
- `CyberButton.vue` - 不再使用（保留文件但不在 main.ts 注册）

### 7.5 store 改动
- `agentStore.ts` 新增 `theme: 'auto' | 'light' | 'dark'` 字段
- `applyTheme()` action 切换主题并写 localStorage
- 在 `App.vue` 初始化时根据 localStorage + prefers-color-scheme 应用主题

---

## 8. 关键文件清单

| 文件 | 改动类型 | 说明 |
|---|---|---|
| `frontend/src/style.css` | **重写** | Apple 全局变量 + 主题 |
| `frontend/src/views/WorkspaceView.vue` | **重写** | 新布局 + 毛玻璃 |
| `frontend/src/components/CodeEditor.vue` | 修改 | Apple 配色 |
| `frontend/src/components/StageCard.vue` | 修改 | SF Symbols 风格 |
| `frontend/src/components/HistoryPanel.vue` | 修改 | 极简列表 |
| `frontend/src/components/BugListCard.vue` | 修改 | Apple 表格 |
| `frontend/src/components/FixResultCard.vue` | 修改 | 等宽代码块 |
| `frontend/src/components/ExecResultCard.vue` | 修改 | 简洁指标 |
| `frontend/src/components/ReflectionCard.vue` | 修改 | 蓝色进度条 |
| `frontend/src/components/ThemeToggle.vue` | **新建** | 主题切换按钮 |
| `frontend/src/utils/pdf.ts` | 修改 | Apple PDF 模板 |
| `frontend/src/stores/agentStore.ts` | 修改 | 新增 theme 字段 |
| `frontend/src/App.vue` | 修改 | 初始化主题 |
| `frontend/src/main.ts` | 微调 | 确保主题初始化 |

---

## 9. 验证标准

### 9.1 视觉验证
- 双主题切换正常（手动按钮 + 跟随系统）
- 毛玻璃 Header/Footer 正确显示
- 阶段状态用 SF Symbols 风格图标
- 代码编辑器无霓虹效果，纯 Xcode 风格
- 字体在 macOS / Windows / Linux 都正常

### 9.2 交互验证
- 主题切换无闪烁
- localStorage 持久化跨刷新
- 阶段状态变化时图标颜色正确切换
- PDF 报告与 UI 风格一致

### 9.3 端到端测试
所有现有测试继续通过：
- 22/22 项测试（基于 cyberpunk UI 测试结构）
- 主题切换测试（新增）

---

## 10. 不在范围内

- 添加新的分析阶段
- 改变后端 API
- 多用户/账号系统
- 移动端适配（仅桌面）
- 国际化（仅中文）
- 苹果官方 SF Symbols 字体（用 SVG / Unicode 模拟）