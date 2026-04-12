/**
 * Claude 模型定价配置 — 开放式 Provider 结构
 *
 * 支持内置 Provider（Anthropic、OpenRouter）和用户自定义 Provider。
 * 用户自定义数据从 ~/.claude/settings.json 读取。
 *
 * 价格单位：美元/百万tokens
 *
 * 更新日期：2026-04-12
 */

import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ModelPricing {
  inputPrice: number; // 输入token价格 ($/MTok)
  outputPrice: number; // 输出token价格 ($/MTok)
  cacheWritePrice: number; // 5分钟缓存写入价格
  cacheWrite1hPrice?: number; // 1小时缓存写入价格
  cacheReadPrice: number; // 缓存读取价格
}

export interface PricingProvider {
  id: string; // "anthropic", "openrouter", 用户自定义UUID
  name: string; // 显示名称
  isCustom: boolean; // true = 用户自定义
  models: Record<string, ModelPricing>; // modelId → price
}

// ---------------------------------------------------------------------------
// Built-in Provider: Anthropic (Claude)
// ---------------------------------------------------------------------------

const ANTHROPIC_MODELS: Record<string, ModelPricing> = {
  // Claude 4.6 系列（最新）
  "claude-sonnet-4-6-20250620": {
    inputPrice: 3.0,
    outputPrice: 15.0,
    cacheWritePrice: 3.75,
    cacheWrite1hPrice: 6.0,
    cacheReadPrice: 0.3,
  },
  "claude-opus-4-6-20250620": {
    inputPrice: 15.0,
    outputPrice: 75.0,
    cacheWritePrice: 18.75,
    cacheWrite1hPrice: 30.0,
    cacheReadPrice: 1.5,
  },
  // Claude 4.5 Haiku（最新，最快最便宜）
  "claude-haiku-4-20251119": {
    inputPrice: 0.8,
    outputPrice: 4.0,
    cacheWritePrice: 1.0,
    cacheWrite1hPrice: 1.6,
    cacheReadPrice: 0.08,
  },
  // Claude 4.5 Sonnet
  "claude-sonnet-4-5-20252012": {
    inputPrice: 3.0,
    outputPrice: 15.0,
    cacheWritePrice: 3.75,
    cacheWrite1hPrice: 6.0,
    cacheReadPrice: 0.3,
  },
  // Claude 4 系列
  "claude-sonnet-4-20250514": {
    inputPrice: 3.0,
    outputPrice: 15.0,
    cacheWritePrice: 3.75,
    cacheWrite1hPrice: 6.0,
    cacheReadPrice: 0.3,
  },
  "claude-opus-4-20250514": {
    inputPrice: 15.0,
    outputPrice: 75.0,
    cacheWritePrice: 18.75,
    cacheWrite1hPrice: 30.0,
    cacheReadPrice: 1.5,
  },
  // Claude 3.7 系列
  "claude-3-7-sonnet-20250219": {
    inputPrice: 3.0,
    outputPrice: 15.0,
    cacheWritePrice: 3.75,
    cacheWrite1hPrice: 6.0,
    cacheReadPrice: 0.3,
  },
  // Claude 3.5 系列（legacy）
  "claude-3-5-sonnet-20241022": {
    inputPrice: 3.0,
    outputPrice: 15.0,
    cacheWritePrice: 3.75,
    cacheWrite1hPrice: 6.0,
    cacheReadPrice: 0.3,
  },
  "claude-3-5-haiku-20241022": {
    inputPrice: 0.8,
    outputPrice: 4.0,
    cacheWritePrice: 1.0,
    cacheWrite1hPrice: 1.6,
    cacheReadPrice: 0.08,
  },
};

// Aliases — assigned after declaration to avoid TDZ errors
const _claude37 = ANTHROPIC_MODELS["claude-3-7-sonnet-20250219"];
const _claude4s = ANTHROPIC_MODELS["claude-sonnet-4-20250514"];
const _claude4o = ANTHROPIC_MODELS["claude-opus-4-20250514"];
const _claude4h = ANTHROPIC_MODELS["claude-haiku-4-20251119"];

// Assign aliases
Object.assign(ANTHROPIC_MODELS, {
  "sonnet-3-7": _claude37,
  "sonnet-4": _claude4s,
  sonnet: _claude4s,
  opus: _claude4o,
  haiku: _claude4h,
  "claude-3-7-sonnet-20250219-thinking": _claude37,
  "claude-sonnet-4-20250514-thinking": _claude4s,
  "claude-opus-4-20250514-thinking": _claude4o,
});

// ---------------------------------------------------------------------------
// Built-in Provider: OpenRouter
// ---------------------------------------------------------------------------

const OPENROUTER_MODELS: Record<string, ModelPricing> = {
  // OpenAI
  "openai/gpt-4o": {
    inputPrice: 5.0,
    outputPrice: 15.0,
    cacheWritePrice: 0.0,
    cacheReadPrice: 0.0,
  },
  "openai/gpt-4o-mini": {
    inputPrice: 0.15,
    outputPrice: 0.6,
    cacheWritePrice: 0.0,
    cacheReadPrice: 0.0,
  },
  // Google
  "google/gemini-2.0-flash": {
    inputPrice: 0.0,
    outputPrice: 0.0,
    cacheWritePrice: 0.0,
    cacheReadPrice: 0.0,
  },
  "google/gemini-pro-1.5": {
    inputPrice: 0.125,
    outputPrice: 0.5,
    cacheWritePrice: 0.0,
    cacheReadPrice: 0.0,
  },
  // DeepSeek
  "deepseek/deepseek-chat-v3-0324": {
    inputPrice: 0.27,
    outputPrice: 1.1,
    cacheWritePrice: 0.0,
    cacheReadPrice: 0.0,
  },
  // Mistral
  "mistral/mistral-nemo": {
    inputPrice: 0.15,
    outputPrice: 0.15,
    cacheWritePrice: 0.0,
    cacheReadPrice: 0.0,
  },
};

// ---------------------------------------------------------------------------
// Built-in Providers Registry
// ---------------------------------------------------------------------------

export const BUILT_IN_PROVIDERS: PricingProvider[] = [
  {
    id: "anthropic",
    name: "Anthropic (Claude)",
    isCustom: false,
    models: ANTHROPIC_MODELS,
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    isCustom: false,
    models: OPENROUTER_MODELS,
  },
];

// ---------------------------------------------------------------------------
// Model Use Cases (for UI display)
// ---------------------------------------------------------------------------

export const MODEL_USE_CASES: Record<string, string[]> = {
  "claude-haiku-4-20251119": ["大量文本处理", "内容总结", "简单问答", "代码注释", "翻译任务"],
  "claude-3-5-haiku-20241022": ["大量文本处理", "内容总结", "简单问答", "代码注释", "翻译任务"],
  "claude-sonnet-4-5-20252012": ["代码生成", "复杂分析", "创意写作", "技术文档", "数据处理"],
  "claude-3-5-sonnet-20241022": ["代码生成", "复杂分析", "创意写作", "技术文档", "数据处理"],
  "claude-3-7-sonnet-20250219": ["高级推理", "复杂编程", "深度分析", "专业咨询", "创新解决方案"],
  "claude-sonnet-4-20250514": ["平衡性能", "通用任务", "代码生成", "技术分析", "日常工作"],
  "claude-sonnet-4-6-20250620": ["平衡性能", "通用任务", "代码生成", "技术分析", "日常工作"],
  "claude-opus-4-20250514": ["最复杂推理", "高级研究", "专业写作", "复杂决策", "创意项目"],
  "claude-opus-4-6-20250620": ["顶级推理能力", "高端研究分析", "专业级写作", "复杂决策支持", "创新项目开发"],
  "openai/gpt-4o": ["通用对话", "代码生成", "图像理解", "函数调用"],
  "openai/gpt-4o-mini": ["快速响应", "轻量任务", "成本敏感场景"],
  "google/gemini-2.0-flash": ["免费快速", "日常任务", "多模态"],
};

// ---------------------------------------------------------------------------
// Public API — Provider Management
// ---------------------------------------------------------------------------

/**
 * 合并内置 Provider 和用户自定义 Provider。
 * 用户自定义优先级高于内置同名模型。
 *
 * @param customProviders 用户自定义的 Provider 列表（从设置文件读取）
 */
export function getAllProviders(customProviders: PricingProvider[] = []): PricingProvider[] {
  const result: PricingProvider[] = BUILT_IN_PROVIDERS.map((p) => ({ ...p, models: { ...p.models } }));

  // 合并用户自定义 Provider：同名则覆盖，无名则追加
  for (const custom of customProviders) {
    const existing = result.find((p) => p.id === custom.id);
    if (existing) {
      // 合并模型：用户自定义覆盖内置
      Object.assign(existing.models, custom.models);
    } else {
      result.push({ ...custom, models: { ...custom.models } });
    }
  }

  return result;
}

/**
 * 根据 modelId 查找对应的 Provider。
 */
export function findProviderForModel(
  model: string,
  customProviders: PricingProvider[] = []
): PricingProvider | undefined {
  const all = getAllProviders(customProviders);
  return all.find((p) => model in p.models);
}

// ---------------------------------------------------------------------------
// Legacy API — backward compatible with existing callers
// ---------------------------------------------------------------------------

/**
 * 获取指定模型的定价信息（兼容旧签名）。
 * 优先查用户自定义，再查内置。
 *
 * @param model 模型名称
 * @param customProviders 可选，用户自定义 Provider 列表
 */
export function getModelPricing(model: string, customProviders: PricingProvider[] = []): ModelPricing | null {
  const all = getAllProviders(customProviders);
  for (const provider of all) {
    if (provider.models[model]) return provider.models[model];
  }
  return null;
}

/**
 * 获取模型性价比评级。
 *
 * - high:   平均价格 ≤ $3/M tokens
 * - medium: 平均价格 ≤ $15/M tokens
 * - low:    平均价格 > $15/M tokens
 */
export function getModelCostEfficiency(model: string): "high" | "medium" | "low" {
  const pricing = getModelPricing(model);
  if (!pricing) return "medium";

  const avgPrice = (pricing.inputPrice + pricing.outputPrice) / 2;
  if (avgPrice <= 3) return "high";
  if (avgPrice <= 15) return "medium";
  return "low";
}

/**
 * 计算模型使用的总成本（美元）。
 *
 * @param model 模型名称
 * @param inputTokens 输入token数量
 * @param outputTokens 输出token数量
 * @param cacheCreationTokens 缓存创建token数量（可选）
 * @param cacheReadTokens 缓存读取token数量（可选）
 * @param customProviders 可选，用户自定义 Provider 列表
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheCreationTokens: number = 0,
  cacheReadTokens: number = 0,
  customProviders: PricingProvider[] = []
): number {
  const pricing = getModelPricing(model, customProviders);
  if (!pricing) {
    logger.warn(`[pricing] Unknown model: ${model}, cost set to 0`);
    return 0;
  }

  return (
    (inputTokens * pricing.inputPrice) / 1_000_000 +
    (outputTokens * pricing.outputPrice) / 1_000_000 +
    (cacheCreationTokens * pricing.cacheWritePrice) / 1_000_000 +
    (cacheReadTokens * pricing.cacheReadPrice) / 1_000_000
  );
}

/**
 * 格式化价格为美元显示格式。
 */
export function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}
