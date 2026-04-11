# Claudia 后续开发路线图

> 基于 Claudia v0.1.65 开源项目，综合 Claude Sonnet / GPT-5.4 / Gemini 3.1-pro 三模型分析

---

## 一、项目现状评估

### 代码规模

| 维度 | 数量 |
|------|------|
| 前端组件 | 61 个 TypeScript/TSX 文件 |
| Rust 后端模块 | 11 个文件（commands 7 + checkpoint 3 + process 1） |
| UI 基础组件 | 19 个 shadcn/ui 组件 |
| 状态管理 | 2 个 Zustand Store（agentStore, sessionStore） |
| 国际化 | 13 种语言 |
| 版本 | 0.1.65 |

### 技术栈确认

```
前端: React 18 + TypeScript + Vite 6 + Tailwind CSS v4 + shadcn/ui + Zustand + framer-motion
后端: Rust + Tauri 2 + rusqlite (SQLite) + tokio + reqwest
工具: Bun (包管理) + Vitest (测试) + ESLint + Prettier
```

### 架构优点
- Tauri 2 进程隔离设计合理
- Rust 后端 + SQLite 本地存储，无需服务器
- shadcn/ui 组件库选择得当，UI 一致性好
- 多 Tab 会话管理已实现
- 国际化支持完善（13 种语言）

### 架构问题（三模型共识）

| 问题 | 来源 | 严重程度 |
|------|------|---------|
| 前后端契约漂移风险 | GPT | 🔴 高 |
| 状态分散（3+ 种状��源） | GPT | 🔴 高 |
| 61 个组件维护成本陡增 | GPT | 🟡 中 |
| 无障碍 focus 样式被移除 | Claude Designer | 🔴 高 |
| 硬编码颜色破坏主题一致性 | Claude Designer | 🟡 中 |
| Agent 执行黑盒问题 | Gemini | 🔴 高 |
| MCP 配置缺乏可视化 | Gemini | 🟡 中 |

---

## 二、竞品定位分析

### 核心竞品对比

| 产品 | Stars | 定位 | Claudia 应借鉴 |
|------|-------|------|---------------|
| **Opcode** | 15k | 功能最全的 Claude Code GUI | 避免正面同质，做减法 |
| **CCHub** | — | MCP/Skills/Hooks 管理 | 整合 MCP 管理能力 |
| **Cline** | 30k | VS Code 插件，年增长 4704% | 开源社区运营 |
| **Cursor** | — | AI IDE 霸主 | 多模型支持 + 订阅制定价 |
| **Claude Code 官方** | 84.6k | CLI 原生 | GUI 必须紧跟 CLI 功能 |

### 差异化方向（Gemini 建议）

1. **极简主义** — 避开 Opcode 的功能堆砌，聚焦流畅体验
2. **可视化工作流** — 将 Agent 思考过程用节点树展示
3. **MCP 生态枢纽** — 一键管理 MCP Servers 的命令中心

---

## 三、开发路线图

### Phase 0: 技术债务清理（第 1-2 周）

**目标**：稳固基础，建立开发信心

| 优先级 | 任务 | 预计工时 |
|--------|------|---------|
| P0 | 修复无障碍 focus 样式 | 2h |
| P0 | 统一颜色变��，消除硬编码 | 4h |
| P0 | 为关键 Rust command 补充类型文档 | 4h |
| P1 | 补齐核心组件单元测试（TabManager, SessionList） | 8h |
| P1 | 清理废弃文件（LoggerMigrationExample, I18nTest 等） | 2h |
| P2 | 代码规范：统一命名、文件结构重组 | 4h |

**交付**：CI 通过、零 warning、核心组件有测试覆盖

---

### Phase 1: 体验优化（第 3-6 周）

**目标**：在现有 UI 风格基础上显著提升交互体验

| 优先级 | 任务 | 预计工时 | 来源建议 |
|--------|------|---------|---------|
| P0 | Agent 执行步骤树可视化（替代黑盒等待） | 40h | Gemini |
| P0 | StreamMessage 流式输出防抖 + 代码块工具栏 | 20h | Gemini |
| P0 | 前后端契约统一：为所有 Tauri command 加 Zod schema | 16h | GPT |
| P1 | 全局命令面板（Cmd+K 唤起） | 24h | Gemini |
| P1 | 双层侧边栏（项目列表 + 会话列表） | 20h | Gemini |
| P1 | MCP 连接状态指示灯 + 可视化配置 | 16h | Gemini |
| P2 | Settings 页面两栏重构 | 12h | Claude Designer |
| P2 | Token 颜色系统统一 | 8h | Claude Designer |

**交付**：v0.2.0 — 体验优化版

---

### Phase 2: 功能补全（第 7-14 周）

**目标**：补齐竞品核心功能，建立差异化

| 优先级 | 任务 | 预计工时 |
|--------|------|---------|
| P0 | 多模型支持（OpenAI / Gemini / Ollama / Azure） | 60h |
| P0 | Agent 模板市场（共享 + 版本化） | 40h |
| P0 | 用量仪表盘增强（图表库集成） | 30h |
| P1 | MCP Server 目录 + 一键安装 | 30h |
| P1 | 文件 Diff 视图（Agent 修改文件对比） | 24h |
| P1 | Hooks 可视化编辑器 | 20h |
| P2 | 工作流自动化（多步骤 Agent 链） | 40h |
| P2 | 全局搜索（跨项目/会话/CLAUDE.md） | 20h |

**交付**：v0.3.0 — 功能完整版

---

### Phase 3: 企业级扩展（第 15-24 周）

**目标**：企业级差异化功能

| 任务 | 预计工时 |
|------|---------|
| 团队工作区 + 多用户管理 | 80h |
| API Key Vault（加密存储） | 30h |
| 审计日志 | 40h |
| 政策引擎（文件/网络访问控制） | 60h |
| PostgreSQL 后端（可选，企业自托管） | 40h |
| SSO 集成（SAML/OIDC） | 30h |
| Docker/K8s 部署包 | 20h |

**交付**：v1.0.0 — 企业版

---

## 四、三模型协作验证记录

| 模型 | 调用次数 | Token 消耗 | 任务 | 状态 |
|------|---------|-----------|------|------|
| Claude Sonnet | 3 Agent | ~150k+ | 源码分析 + 竞品调研 + UI 分析 | ✅ |
| GPT-5.4 | 3 次 | ~6k | 架构评审 + UI 评审 + 接手建议 | ✅ |
| Gemini 3.1-pro | 3 次 | ~8k | 竞品评审 + UI 分析(5条建议) + 接手建议 | ✅ |

### GPT-5.4 关键贡献
- 三条接手建议：模块依赖图 → 统一契约 → 补可观测性
- 三大风险：契约漂移、状态分散、组件维护成本

### Gemini 3.1-pro 关键贡献
- 5 个最高优先级 UI 改进（每个含问题描述+改法+涉及文件）
- 差异化方向：极简主义 + 可视化工作流 + MCP 枢纽

### Claude Sonnet 关键贡献
- 12 个 UI 问题诊断（按严重程度分级）
- 15 个竞品横向对比
- 三阶段优化时间表

---

## 五、立即行动项（本周）

1. ✅ Fork Claudia 仓库，推送到你的 GitHub
2. ✅ 搭建开发环境（`bun install` + `cargo build`）
3. 🔲 修复 Phase 0 的 P0 问题（focus 样式 + 颜色变量）
4. 🔲 发布 v0.1.66（技术债务清理版）
