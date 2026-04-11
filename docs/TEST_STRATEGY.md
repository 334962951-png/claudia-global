# Claudia Enterprise 测试策略

> 版本: v0.2.0 | 更新: 2026-04-12

---

## 一、测试层级

| 层级 | 工具 | 覆盖目标 | 运行时机 |
|------|------|---------|---------|
| L1 类型检查 | `tsc --noEmit` | TypeScript 编译零错误 | 每次提交前 |
| L2 代码规范 | `eslint src/` | 规范、未使用 import | 每次提交前 |
| L3 单元测试 | `vitest run` | 组件渲染/交互/状态 | 每次提交前 |
| L4 构建验证 | `vite build` | 打包成功 | 每次提交前 |
| L5 Rust 质量 | `cargo clippy` | Rust 代码质量 | 涉及 Rust 改动时 |
| L6 集成测试 | `vitest + tauri` | 前后端交互 | 每日/PR |
| L7 E2E 测试 | Playwright | 核心用户流程 | 发版前 |

---

## 二、Wave 验证门控（强制）

每个 Wave 完成后，必须由 **Verifier Agent** 执行以下检查：

```bash
# L1: TypeScript 编译
npx tsc --noEmit
# 期望: 0 errors

# L2: ESLint（仅检查 errors，warnings 暂忽略）
npx eslint src/ --format compact 2>&1 | grep " error "
# 期望: 0 errors（pre-existing 的需要标记）

# L3: 单元测试
npx vitest run
# 期望: 所有测试通过

# L4: Vite 构建
npx vite build
# 期望: 构建成功

# L5: Cargo Clippy（仅 Rust 改动时）
cd src-tauri && cargo clippy 2>&1 | grep "warning"
# 期望: 0 新 warnings
```

**门控规则：**
- L1-L4 全部通过 → 允许提交
- 任一失败 → Fix Agent 修复 → 重新验证（最多 3 轮）
- 3 轮后仍失败 → 上报用户决策

---

## 三、现有测试覆盖

### 前端单元测试 (30 个)

| 测试文件 | 用例数 | 覆盖组件 |
|---------|--------|---------|
| `TabManager.test.tsx` | 5 | Tab 创建/切换/关闭/禁用 |
| `SessionList.test.tsx` | 8 | 列表渲染/选择/空状态/返回 |
| `FloatingPromptInput.test.tsx` | 8 | 输入/禁用/发送/清空 |
| `UsageDashboard.test.tsx` | 6 | 加载/摘要/Token 细分/返回 |
| **总计** | **27** | |

### 待补充测试 (Phase 1 新组件)

| 组件 | 优先级 | 需要测试 |
|------|--------|---------|
| AgentStepTree | P0 | 节点展开/折叠/键盘导航 |
| CodeBlock | P0 | 复制/语言检测/hover |
| CommandPalette | P1 | 搜索/键盘/分类切换 |
| ProjectSidebar | P1 | 项目选择/折叠/tooltip |
| SessionSidebar | P1 | 会话选择/分组/右键菜单 |
| MCPStatusIndicator | P1 | 三态显示/展开/重连 |

---

## 四、测试 Mock 策略

### Tauri Invoke Mock
```typescript
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue({}),
}));
```

### Zustand Store Mock
```typescript
vi.mock('../stores/agentStore', () => ({
  useAgentStore: vi.fn().mockReturnValue({
    sessions: [],
    activeSessionId: null,
    // ...
  }),
}));
```

### i18n Mock
```typescript
vi.mock('../lib/i18n', () => ({
  t: (key: string) => key,
  useI18n: () => ({ t: (key: string) => key }),
}));
```

---

## 五、E2E 测试计划（Phase 2）

### 技术选型
- **Playwright** — Tauri 支持 Playwright 集成
- 在 headless 模式下运行
- GitHub Actions CI 集成

### 核心用户流程（冒烟测试）
1. 启动应用 → 显示主界面
2. 创建新会话 → 输入消息 → 收到流式响应
3. 切换 Tab → 恢复会话
4. 打开 Settings → 修改主题 → 界面更新
5. Cmd+K 命令面板 → 搜索 → 执行命令
6. MCP 状态灯显示正确状态

---

## 六、CI/CD 集成（Phase 2）

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npx eslint src/
      - run: npx vitest run
      - run: npx vite build
```

---

## 七、质量指标

| 指标 | 当前值 | 目标值 |
|------|--------|--------|
| TypeScript 编译错误 | 0 | 0 |
| ESLint errors | 35 (pre-existing) | 0 |
| 单元测试通过率 | 100% (27/27) | 100% |
| 测试覆盖率 | ~20% | >60% |
| 构建成功率 | 100% | 100% |
| E2E 覆盖 | 0 条 | 6 条核心流程 |
