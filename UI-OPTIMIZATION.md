# Claudia Enterprise UI 优化分析报告

> **设计原则**：在保留现有风格的基础上进行增量优化，不推倒重来。  
> **分析时间**：2026-04-11  
> **分析范围**：src/ 目录下所有 React 组件、样式文件、主题配置

---

## 目录

1. [技术栈概览](#1-技术栈概览)
2. [现有 UI 风格识别](#2-现有-ui-风格识别)
3. [UI 问题诊断](#3-ui-问题诊断)
4. [快速优化（1-2天）](#4-快速优化1-2天)
5. [中期优化（1-2周）](#5-中期优化1-2周)
6. [长期优化（1个月+）](#6-长期优化1个月)
7. [新功能 UI 建议](#7-新功能-ui-建议)
8. [竞品分析对照](#8-竞品分析对照)
9. [实施优先级建议](#9-实施优先级建议)

---

## 1. 技术栈概览

| 类别 | 技术 |
|------|------|
| 框架 | React 18 + TypeScript + Vite |
| 样式 | Tailwind CSS v4 (CSS-first 配置) + 自定义 CSS |
| UI 组件 | shadcn/ui 风格（基于 Radix UI） |
| 动画 | Framer Motion |
| 状态管理 | Zustand |
| 图标 | Lucide React |
| 桌面 | Tauri (src-tauri/) |
| 表单 | React Hook Form + Zod |
| 国际化 | 自定义 i18n（14 种语言） |

**颜色空间**：使用 `oklch()` 定义所有主题色，这是现代色彩管理最佳实践，保证了亮度和色相的精确控制。

---

## 2. 现有 UI 风格识别

### 2.1 主题系统

```
styles.css 中定义的 Token：
├── 4 个预设主题：dark / gray / light / white
├── 自定义主题：theme-custom（用户可自定义 18 个颜色变量）
└── Font Scale：支持用户自定义字体大小倍率

暗色主题（默认 oklch 值）：
  background:  oklch(0.12 0.01 240)  深蓝黑
  card:       oklch(0.14 0.01 240)
  primary:    oklch(0.98 0.01 240)  白色文字
  muted:      oklch(0.16 0.01 240)
  accent:     oklch(0.16 0.01 240)
  border:     oklch(0.16 0.01 240)
  destructive: oklch(0.6 0.2 25)    红橙
  green-500:  oklch(0.72 0.2 142)   绿色（成功状态）
```

### 2.2 组件设计语言

```
组件风格：shadcn/ui 风格 + Claude 品牌定制

Card 卡片：
  ┌─────────────────────────────────┐
  │ ● 深色背景 oklch(0.14)           │
  │ ● 1px border oklch(0.16)        │
  │ ● hover: shadow-md + scale(1.01) │
  └─────────────────────────────────┘

Button 变体 (CVA)：
  default / destructive / outline / secondary / ghost / link
  尺寸：default(sm) / lg / icon

Dialog：
  ● Radix UI 驱动
  ● 黑色 80% 透明遮罩 bg-black/80
  ● 动画：zoom-in-95 / fade-in-0

表单 Input：
  ● 透明背景（bg: transparent）
  ● border-color: var(--color-input)
```

### 2.3 布局结构

```
┌─────────────────────────────────────────────┐
│ Topbar（状态指示器 + 6 个导航按钮 + 语言选择） │  48px
├─────────────────────────────────────────────┤
│ TabManager                                  │  32px
│ [Projects] [Session:xxx] [Settings] [+New]  │
├─────────────────────────────────────────────┤
│ TabContent (绝对定位堆叠，opacity 切换)      │  flex-1
│                                             │
│  ProjectsView:                              │
│  [+ New Session]                            │
│  [Running Sessions Cards...]                │
│  [Project Grid 3cols]                       │
│                                             │
│  SessionView:                               │
│  [SessionHeader + 工具栏]                    │
│  [MessageList (虚拟滚动)]                    │
│  [FloatingPromptInput 底部固定]              │
└─────────────────────────────────────────────┘
```

### 2.4 动画系统

| 元素 | 动画类型 | 时长 |
|------|---------|------|
| 页面/卡片入场 | opacity 0→1, y: -20→0 | 300-500ms |
| 退出动画 | opacity 1→0, y: 0→-10 | 200ms |
| Tab 切换 | opacity 0→1 | 200ms |
| Shimmer Hover | 伪元素 left -100%→100% | 500ms |
| Trailing Border | CSS conic-gradient 旋转 | 2s 循环 |
| 滚动条 | 3px 细滚动条 + hover 反馈 | 200ms ease |

### 2.5 特色视觉元素

- **Rotating Symbol** (`◐◓◑◒` 循环动画)：用于品牌标识
- **Shimmer Hover**：卡片悬停时的流光效果
- **Trailing Border**：悬停时边框的渐变旋转线（CSS `conic-gradient` + CSS `@property`）
- **扫描线动画**：用于 NFO Credits 页面
- **Token Counter**：会话界面中实时显示 token 消耗

---

## 3. UI 问题诊断

### 3.1 🔴 严重问题

#### 问题 1：无障碍访问问题（严重）
```css
/* styles.css:272-282 */
*:focus, *:focus-visible {
  outline: none !important;
  box-shadow: none !important;
}
```
**影响**：键盘用户无法看到焦点指示器，完全移除了所有元素的 focus 可见样式。这违反了 WCAG 2.1 AA 标准。

**建议修复**：
```css
/* 恢复 focus-visible 样式，但仅在键盘导航时显示 */
*:focus {
  outline: none; /* 保持全局无轮廓 */
}
*:focus-visible {
  outline: 2px solid var(--color-ring);
  outline-offset: 2px;
  border-radius: 4px;
}
```

#### 问题 2：硬编码颜色值（广泛存在）
```typescript
// MCPManager.tsx:123
<Network className="h-5 w-5 text-blue-500" />  // 硬编码 Tailwind 颜色

// UsageDashboard.tsx:614
className="bg-[#d97757]"  // 硬编码十六进制

// BashWidget.tsx:72
className="bg-zinc-950"   // 使用 zinc 而非 CSS 变量

// CCAgents.tsx 中多处
className="text-blue-600" / "text-green-600"
```

**影响**：当用户切换到浅色主题时，这些硬编码颜色会失去对比度或显得不协调。应该统一使用 CSS 变量。

#### 问题 3：虚拟滚动在 ClaudeCodeSession 中不完善
```typescript
// ClaudeCodeSession.tsx 使用了 @tanstack/react-virtual
// 但 MessageList 可能有性能问题
const displayableMessages = useMemo(() => {
  return messages.filter(/* ... */);
}, [messages]);
```
**影响**：长会话（数千条消息）可能导致性能下降。

### 3.2 🟡 中等问题

#### 问题 4：Tab 栏视觉区分度不足
```typescript
// TabManager.tsx:74-76
isActive
  ? "bg-card text-card-foreground before:bg-primary"
  : "bg-transparent text-muted-foreground hover:bg-muted/40"
```
**现状**：活跃 Tab 仅通过底部 0.5px 的 `before:bg-primary` 线条区分  
**问题**：在深色主题下，`bg-card` 和 `bg-transparent` 颜色接近，区分不够明显

#### 问题 5：设置页面信息密度过高
```typescript
// Settings.tsx:92
const [activeTab, setActiveTab] = useState("general");
// 一个 Tab 包含 10+ 个子分类，全部平铺
```
**影响**：用户需要滚动很久才能找到特定设置项。

#### 问题 6：缺少键盘快捷键 UI
```typescript
// App.tsx:159-206
// 定义了键盘快捷键（Ctrl+T / Ctrl+W / Ctrl+Tab）
// 但没有 UI 向用户展示这些快捷键
```
**影响**：新用户不知道快捷键存在，高级用户难以记忆。

#### 问题 7：移动端适配缺失
- 所有响应式断点仅用于 Grid 列数（`md:grid-cols-2`）
- 但 Tauri 桌面应用通常不需要移动端适配
- **然而**：设置面板、UsageDashboard 在窄窗口下可能有布局问题

#### 问题 8：ProjectList 路径显示溢出
```typescript
// ProjectList.tsx:138-140
<p className="text-sm text-muted-foreground mb-3 font-mono truncate">
  {project.path}
</p>
```
**问题**：`truncate` 在单行时有效，但如果路径超长（>容器宽度），仍然会溢出。

### 3.3 🟢 轻微问题

#### 问题 9：Welcome 页面动画与其他页面不一致
- Welcome 使用 `motion.div` + `scale` 动画
- 主页内容（ProjectsView）基本无动效
- 建议统一过渡风格

#### 问题 10：SessionList 卡片 hover 反馈不明显
```typescript
// SessionList.tsx:209
className="transition-all hover:shadow-md hover:scale-[1.01]"
```
**问题**：卡片有 scale 效果，但按钮区域交互反馈不清晰（特别是删除按钮误触风险）。

#### 问题 11：残留的废弃文件
```
ClaudeCodeSession.refactored.tsx  ← 同名文件的旧版本残留
```
**影响**：代码维护困惑。

#### 问题 12：Toast 样式与整体设计语言不完全统一
- Toast 容器位置与 Dialog 可能重叠
- 没有区分成功/错误/信息的视觉强度梯度

---

## 4. 快速优化（1-2天）

> 不改架构，小改动大提升

### 4.1 修复无障碍焦点指示器

**文件**：`src/styles.css`

```css
/* 在 :focus 规则后添加 */
*:focus-visible {
  outline: 2px solid var(--color-ring);
  outline-offset: 2px;
  border-radius: var(--radius-base);
}

/* 针对特定组件保留 focus 样式 */
button:focus-visible,
[role="button"]:focus-visible,
input:focus-visible,
textarea:focus-visible {
  outline: 2px solid var(--color-ring);
  outline-offset: 2px;
}
```

### 4.2 增强 Tab 栏活跃状态指示

**文件**：`src/components/TabManager.tsx`

```tsx
// 方案：增加更明显的活跃 Tab 视觉区分
// 替换当前 TabItem 的样式逻辑

isActive ? (
  "bg-card text-card-foreground" +
  " border-b-2 border-primary" +  // 加粗底部边框
  " shadow-sm" +                   // 添加阴影
  " font-medium"                  // 字体加粗
) : (
  "bg-transparent text-muted-foreground" +
  " hover:bg-muted/40 hover:text-foreground"
)
```

### 4.3 添加键盘快捷键提示

**文件**：`src/components/Topbar.tsx` + 新建 `src/components/KeyboardShortcutsDialog.tsx`

```tsx
// 在 Topbar 添加 "?" 按钮
<Button variant="ghost" size="icon" 
  onClick={() => setShowShortcuts(true)} 
  className="h-8 w-8"
  title="Keyboard Shortcuts (?)">
  <Keyboard className="h-4 w-4" />
</Button>

// 快捷键对话框内容：
┌──────────────────────────────────────────┐
│ Keyboard Shortcuts                       │
├──────────────────────────────────────────┤
│ Navigation                               │
│   Ctrl/Cmd + T      New Tab              │
│   Ctrl/Cmd + W      Close Tab            │
│   Ctrl/Cmd + Tab    Next Tab             │
│   Ctrl/Cmd + Shift  Previous Tab         │
│   Ctrl/Cmd + 1-9    Switch to Tab N      │
├──────────────────────────────────────────┤
│ Session                                  │
│   Ctrl/Cmd + Enter  Send Message         │
│   Escape            Cancel Input         │
└──────────────────────────────────────────┘
```

### 4.4 统一所有硬编码颜色为 CSS 变量

**原则**：将 `text-blue-500` → `text-primary`，`bg-[#d97757]` → `bg-accent` 或新增 token。

| 硬编码颜色 | 替换为 |
|-----------|--------|
| `text-blue-500` | `text-primary` 或 CSS 变量 |
| `text-blue-600` | `text-primary` |
| `text-green-600` | `text-green-500`（已有 token）|
| `bg-[#d97757]` | `bg-accent` 或 `var(--color-accent)` |
| `bg-zinc-950` | `bg-card` |

### 4.5 SessionList 卡片交互优化

```tsx
// SessionList.tsx:209
className={cn(
  "transition-all duration-200",
  "hover:shadow-md hover:scale-[1.01] active:scale-[0.99]",
  "focus-within:ring-2 focus-within:ring-ring", // 新增：焦点状态
  session.todo_data ? "border-l-4 border-l-primary" : ""
)}
```

### 4.6 修复路径溢出

```tsx
// ProjectList.tsx:138-140
<p 
  className="text-sm text-muted-foreground mb-3 font-mono truncate" 
  title={project.path}  // 悬停显示完整路径
>
  {project.path}
</p>
```

### 4.7 添加面包屑导航

在 Projects/Sessions 页面添加面包屑：

```
┌─────────────────────────────────────────────────┐
│ ← Projects > my-project > session_20240312      │
└─────────────────────────────────────────────────┘
```

---

## 5. 中期优化（1-2周）

> 小幅重构，显著体验提升

### 5.1 重构设置页面为两栏布局

```
┌──────────────────────────────────────────────────────┐
│ Settings                                              │
├──────────────┬───────────────────────────────────────┤
│ General      │  Theme                                │
│ Theme        │  ┌─────────────────────────────────┐  │
│ Claude Bin   │  │ [Dark] [Gray] [Light] [Custom]  │  │
│ ──────────   │  └─────────────────────────────────┘  │
│ Permissions  │                                       │
│ Env Vars     │  Font Scale                           │
│ Hooks        │  [Slider: 80% ───●─── 150%]           │
│ ──────────   │                                       │
│ Proxy        │  Custom Colors (当选择 Custom 时)       │
│ Audio        │  [Background Picker] [Text Picker] ... │
│ Analytics    │                                       │
└──────────────┴───────────────────────────────────────┘
```

**实现方案**：
- 将 Settings 改为 Sidebar + Content 的两栏布局
- Sidebar 固定宽度 200px，可折叠
- Content 区使用 Responsive Grid

### 5.2 完善 Token 颜色系统

在 `src/styles.css` 添加缺失的语义化 Token：

```css
/* 语义化颜色 Token */
@theme {
  /* 状态色 */
  --color-success: oklch(0.72 0.2 142);  /* 绿色 */
  --color-warning: oklch(0.75 0.2 85);  /* 黄色 */
  --color-info:    oklch(0.70 0.15 240); /* 蓝色 */
  
  /* 流光高亮色 */
  --color-highlight: #d97757;
  --color-highlight-glow: rgba(217, 119, 87, 0.3);
}
```

### 5.3 增强 UsageDashboard 图表

```
现状：纯 CSS 条形图（DIY 实现）
建议：引入轻量级图表库（如 Chart.js 或 Recharts）

Timeline Tab 优化：
┌─────────────────────────────────────────────────┐
│ Daily Usage (Mar 2026)              [7D][30D][All]│
├─────────────────────────────────────────────────┤
│  $12 ─┤                              ┌───┐       │
│   $8 ─┤          ┌───┐     ┌───┐    │   │       │
│   $4 ─┤   ┌───┐  │   │ ┌───┤   │    │   │ ┌───┐│
│   $0 ─┴───┴───┴──┴───┴─┴───┴───┴────┴───┴─┴───┴┤
│        1    5   10  15  20  25  30             │
│  ● Opus   ● Sonnet   ● Haiku（堆叠条形图）       │
└─────────────────────────────────────────────────┘
```

### 5.4 添加命令面板（Command Palette）

类似 VS Code 的 `Ctrl+Shift+P`：

```
┌─────────────────────────────────────────────────┐
│ 🔍 Type a command or search...                  │
├─────────────────────────────────────────────────┤
│ Recent Commands                                 │
│   > Open Projects                    Ctrl+1     │
│   > New Session                      Ctrl+T     │
│   > Usage Dashboard                             │
│   > MCP Manager                                 │
│   > Settings                                    │
├─────────────────────────────────────────────────┤
│ Navigation                                      │
│   Go to Session...                              │
│   Go to Project...                              │
│   Search Sessions                               │
└─────────────────────────────────────────────────┘
```

**技术实现**：使用 Framer Motion 的 AnimatePresence + 键盘事件监听。

### 5.5 优化长列表性能

```tsx
// ClaudeCodeSession 中的 MessageList 优化
const virtualizer = useVirtualizer({
  count: displayableMessages.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 120, // 估算每条消息高度
  overscan: 5, // 预渲染上下 5 条
});
```

### 5.6 MCP Manager 拓扑视图

```
MCP Manager
├── Servers (列表视图)
├── Add Server (表单)
├── Import/Export
└── Topology (NEW 可视化视图) ← 新增

Topology 视图：
    ┌─────────┐
    │ Claude  │
    └────┬────┘
         │
    ┌────▼────┐
    │  MCP    │
    │ Hub     │
    └────┬────┘
    ┌────┼────┬───────────┐
    ▼    ▼    ▼           ▼
  ┌──┐ ┌──┐ ┌──┐        ┌──┐
  │FS│ │Git│ │Web│ ...   │DB│
  └──┘ └──┘ └──┘        └──┘
```

### 5.7 通知中心 UI

```tsx
// 替代现有的 Toast 系统，添加持久通知中心
┌──────────────────────────────────┐
│ Notifications              [All][Unread] │
├──────────────────────────────────┤
│ 🔵 New agent run completed        │
│    "Code Review Agent" finished   │
│    2 min ago              [×]   │
├──────────────────────────────────┤
│ 🟢 Session saved                 │
│    Project: my-app               │
│    5 min ago              [×]   │
├──────────────────────────────────┤
│ 🟡 MCP server disconnected       │
│    Filesystem server went offline│
│    1 hour ago             [×]   │
└──────────────────────────────────┘
```

### 5.8 清理废弃代码

```bash
# 删除废弃文件
rm src/components/ClaudeCodeSession.refactored.tsx

# 检查其他潜在的废弃引用
grep -r "ClaudeCodeSession.refactored" src/
```

---

## 6. 长期优化（1个月+）

> 架构级优化

### 6.1 Agent 可视化构建器

```
┌──────────────────────────────────────────────────────────────────┐
│ Agent Canvas                                      [Save] [Run]   │
├─────────────┬────────────────────────────────────────────────────┤
│ Tools      │  ┌─────────┐      ┌─────────┐      ┌─────────┐     │
│ ─────────  │  │  Start  │─────▶│  Task   │─────▶│  End    │     │
│ FileSystem │  └─────────┘      └────┬────┘      └─────────┘     │
│ Git        │                        │                           │
│ Terminal   │                  ┌────▼────┐                      │
│ WebSearch  │                  │ Condition│                      │
│ Database   │                  └────┬────┘                      │
│ ─────────  │          ┌──────────┼──────────┐                │
│ Templates  │          ▼                     ▼                   │
│ CodeReview │    ┌──────────┐         ┌──────────┐              │
│ BugFix     │    │ Subtask A│         │ Subtask B│              │
│ Refactor   │    └──────────┘         └──────────┘              │
│            │                                                  │
└────────────┴────────────────────────────────────────────────────┘
```

**技术栈建议**：使用 React Flow（基于 xyflow）实现节点编辑器。

### 6.2 多会话管理仪表板

```
┌──────────────────────────────────────────────────────────────────┐
│ Session Manager                        [Grid] [List] [Timeline]  │
├──────────────────────────────────────────────────────────────────┤
│ Filter: [All Sessions ▼] [Model: Any ▼] [Project ▼] [Date ▼]   │
├──────────────────────────────────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│ │ ● Session A  │ │ ○ Session B  │ │ ● Session C  │             │
│ │ my-project   │ │ api-design   │ │ frontend     │             │
│ │ Sonnet 4    │ │ Opus 4      │ │ Haiku       │             │
│ │ 1,234 tokens │ │ 5,678 tokens │ │ 234 tokens   │             │
│ │ 10 min ago   │ │ 2 hours ago  │ │ 3 days ago   │             │
│ └──────────────┘ └──────────────┘ └──────────────┘             │
│  ● = Running   ○ = Completed  ⊗ = Error                        │
└──────────────────────────────────────────────────────────────────┘
```

### 6.3 可折叠侧边栏 + 可调节面板

```
┌────┬──────────────────────────────────────────────┐
│    │                                              │
│ S  │   [Project Tree]  [Session Content]          │
│ I  │      ↔ 可拖动分割线 ←→                       │
│ D  │                                              │
│ E  │                                              │
│ B  │   ◐ Claude Code Session                      │
│ A  │   ┌──────────────────────────────────────┐   │
│ R  │   │ Session Header                        │   │
│    │   ├──────────────────────────────────────┤   │
│    │   │ MessageList (flex-1)                  │   │
│    │   │                                       │   │
│    │   │                                       │   │
│    │   ├──────────────────────────────────────┤   │
│    │   │ [FloatingPromptInput]                  │   │
│    │   └──────────────────────────────────────┘   │
└────┴──────────────────────────────────────────────┘
```

**技术实现**：使用 `dnd-kit` 或 Framer Motion Drag 实现分割线拖动。

### 6.4 全局搜索

```tsx
┌──────────────────────────────────────────────────┐
│ 🔍 Search sessions, agents, projects, settings...│
├──────────────────────────────────────────────────┤
│ Sessions (3)                                     │
│   "auth implementation" - my-project            │
│   "fix bug in login" - frontend                  │
│                                                  │
│ Projects (1)                                     │
│   "claudia-enterprise"                           │
│                                                  │
│ Agents (2)                                       │
│   Code Review Agent                              │
│   Bug Fix Assistant                               │
│                                                  │
│ Settings (1)                                     │
│   Theme settings                                  │
└──────────────────────────────────────────────────┘
```

### 6.5 主题系统增强

```
┌─────────────────────────────────────────────────────┐
│ Theme Settings                                       │
├─────────────────────────────────────────────────────┤
│ Presets      │  Custom                               │
│ [Dark] [Gray]│  Background: [  oklch(0.12)  ] ●    │
│ [Light][White]│  Text:       [  oklch(0.98)  ] ●    │
│              │  Accent:     [  #d97757     ] ●       │
│              │  ─────────────────────────────────   │
│              │  Live Preview:                        │
│              │  ┌───────────────────────────────┐   │
│              │  │ Sample Card                   │   │
│              │  │ Button [Primary] [Outline]    │   │
│              │  └───────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### 6.6 国际化 UI 增强

```
当前状态：14 种语言，静态文本替换
建议：添加 RTL 支持（阿拉伯语、希伯来语）

Arabic UI 预览：
┌──────────────────────────────────────┐
│      [Settings] [Agents] → [←NFO]     │
│                                       │
│  أهلاً بك!                           │
│                                       │
│  ┌─────────┐  ┌─────────┐            │
│  │ CC Agents│  │ Projects │            │
│  └─────────┘  └─────────┘            │
└──────────────────────────────────────┘
```

---

## 7. 新功能 UI 建议

### 7.1 Agent 可视化构建器（高优先级）

**竞品参考**：LangFlow, Flowise, CrewAI Studio

**UI 组件需求**：
- 节点编辑器（React Flow）
- 属性面板（右侧抽屉）
- 工具栏（顶部）
- 预览面板（底部可折叠）

### 7.2 MCP 服务器管理界面

**已有基础**：MCPServerList, MCPAddServer, MCPImportExport

**缺失 UI**：
- 服务器健康检查状态实时显示
- 工具/Tools 可用性列表
- MCP 流量监控
- 服务器配置模板市场

### 7.3 用量仪表盘增强

**已有基础**：UsageDashboard（4 个 Summary Cards + 5 个 Tabs）

**缺失 UI**：
- 实时用量监控（不刷新页面）
- 预算告警设置（阈值 + 通知）
- 成本预测（基于历史趋势）
- 多账户支持（切换 API Key）

### 7.4 多会话管理

**缺失 UI**：
- 会话分组/标签
- 会话搜索（全文 + 过滤）
- 会话比较（diff view）
- 会话导出（PDF, Markdown, HTML）

### 7.5 工作流自动化

```
┌─────────────────────────────────────────────────┐
│ Workflow Automation                              │
├─────────────────────────────────────────────────┤
│ Trigger:    [Schedule ▼] [Webhook] [Manual]    │
│             Every day at 9:00 AM                │
├─────────────────────────────────────────────────┤
│ Steps:                                       │
│   1. [Agent: Code Review] ──→                  │
│   2. [If: Issues found] ──→ [Slack通知]         │
│   3. [Else:]           ──→ [Commit]             │
│                                                  │
│   [+ Add Step]                                  │
├─────────────────────────────────────────────────┤
│  [Save as Draft]              [Activate]        │
└─────────────────────────────────────────────────┘
```

---

## 8. 竞品分析对照

| 功能 | Claude Code CLI | Cursor | GitHub Copilot | Claudia (当前) | Claudia (建议) |
|------|----------------|--------|----------------|---------------|---------------|
| 深色主题 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 多会话管理 | 基础 | 高级 | 基础 | 基础 | 中级 |
| 用量仪表盘 | ✗ | ✗ | ✗ | ✓ | ✓ 增强 |
| Agent 构建器 | ✗ | ✓ (Agent Mode) | 基础 | ✗ | 中期 |
| MCP 管理 | ✗ | ✗ | ✗ | ✓ | ✓ 增强 |
| 键盘快捷键 | 基础 | 高级 | 基础 | 基础 | 高级 |
| 自定义主题 | ✗ | ✓ | ✗ | ✓ | ✓ 增强 |
| 命令面板 | ✗ | ✓ | ✗ | ✗ | 中期 |
| 会话比较 | ✗ | ✗ | ✗ | ✗ | 长期 |
| 移动端 | N/A | ✗ | ✗ | N/A | — |

**竞品亮点参考**：
- **Cursor**：Agent Mode 的可视化流程、Command K 的全局搜索
- **VS Code**：丰富的键盘快捷键生态、分栏视图
- **Linear**：极致的动画流畅度、深浅色无差别设计

---

## 9. 实施优先级建议

### 🚀 立即执行（本周）

| # | 任务 | 工作量 | 影响 |
|---|------|--------|------|
| 1 | 修复 `focus-visible` 无障碍问题 | 1 小时 | 高 |
| 2 | 统一硬编码颜色为 CSS 变量 | 2 小时 | 中 |
| 3 | 增强 Tab 栏活跃状态视觉 | 1 小时 | 中 |
| 4 | 添加键盘快捷键提示弹窗 | 2 小时 | 高 |

### 📅 短期（1-2 周）

| # | 任务 | 工作量 | 影响 |
|---|------|--------|------|
| 5 | 重构 Settings 为两栏布局 | 3 天 | 高 |
| 6 | 添加命令面板 | 2 天 | 高 |
| 7 | 完善 Token 颜色系统 | 1 天 | 中 |
| 8 | 清理废弃代码文件 | 1 小时 | 低 |

### 📆 中期（1 个月）

| # | 任务 | 工作量 | 影响 |
|---|------|--------|------|
| 9 | Agent 可视化构建器 | 2 周 | 高 |
| 10 | MCP 拓扑视图 | 3 天 | 中 |
| 11 | UsageDashboard 图表增强 | 1 周 | 中 |
| 12 | 可折叠侧边栏 + 分割面板 | 1 周 | 高 |

### 🎯 长期（1 个月+）

| # | 任务 | 工作量 | 影响 |
|---|------|--------|------|
| 13 | 多会话管理仪表板 | 2 周 | 高 |
| 14 | 全局搜索 | 1 周 | 高 |
| 15 | 工作流自动化 | 2 周 | 中 |
| 16 | RTL 国际化 | 1 周 | 低 |

---

## 附录 A：当前文件结构

```
src/
├── components/
│   ├── ui/                    # shadcn/ui 风格基础组件
│   │   ├── button.tsx         # CVA 变体按钮
│   │   ├── card.tsx           # 卡片容器
│   │   ├── dialog.tsx         # Radix Dialog 封装
│   │   ├── input.tsx          # 表单输入
│   │   ├── tabs.tsx           # 选项卡
│   │   └── ...
│   ├── Topbar.tsx             # 顶部导航栏
│   ├── TabManager.tsx         # 多标签页管理
│   ├── TabContent.tsx         # 标签页内容区
│   ├── ProjectList.tsx        # 项目列表（卡片网格）
│   ├── SessionList.tsx        # 会话列表
│   ├── ClaudeCodeSession.tsx  # 核心会话界面
│   ├── UsageDashboard.tsx     # 用量仪表盘
│   ├── MCPManager.tsx         # MCP 服务器管理
│   ├── Settings.tsx           # 设置页面
│   ├── CCAgents.tsx           # Agent 列表
│   ├── AgentsModal.tsx        # Agent 管理弹窗
│   └── claude-code-session/   # 会话子组件
│       ├── SessionHeader.tsx
│       ├── MessageList.tsx
│       └── PromptQueue.tsx
├── contexts/
│   ├── TabContext.tsx         # 标签页状态管理
│   ├── ThemeContext.tsx       # 主题管理
│   └── ToastContext.tsx       # Toast 通知
├── styles.css                 # 全局样式 + Tailwind 主题
└── lib/
    └── claudeSyntaxTheme.ts   # 代码高亮主题
```

## 附录 B：关键样式 Token 速查

```css
/* 背景层级 */
--color-background    /* 最底层：oklch(0.12) */
--color-card         /* 卡片层：oklch(0.14) */
--color-muted        /* 次要区：oklch(0.16) */

/* 文字层级 */
--color-foreground   /* 主要文字：oklch(0.98) */
--color-muted-foreground  /* 次要文字：oklch(0.68) */

/* 交互色 */
--color-primary      /* 主色调：白色文字 */
--color-accent      /* 强调色：oklch(0.16) */
--color-destructive  /* 危险色：oklch(0.6 0.2 25) */
--color-green-500   /* 成功色：oklch(0.72 0.2 142) */

/* 品牌色 */
--color-highlight   /* #d97757（橙色流光）*/
```

---

*报告生成：Claude Sonnet 4.6 — UI/UX 设计分析*  
*下次建议：基于用户反馈更新优先级，关注"快速优化"部分的实际体验提升效果*
