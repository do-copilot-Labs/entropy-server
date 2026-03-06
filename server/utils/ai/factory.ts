import { GeminiProvider } from "./providers/gemini";
import type { AIProvider } from "./types";

/**
 * 默认模型配置
 * 定义每个模型的别名和对应提供商
 */
const DEFAULT_MODEL_CONFIG = {
  // Gemini Models
  "gemini-flash": { provider: "gemini", model: "gemini-1.5-flash" },
  "gemini-pro": { provider: "gemini", model: "gemini-1.5-pro" },
  "gemini-embedding": { provider: "gemini", model: "text-embedding-004" },

  // OpenAI Models (Placeholder for future)
  "gpt-4": { provider: "openai", model: "gpt-4" },

  // Default Fallbacks
  "default": { provider: "gemini", model: "gemini-1.5-flash" },
  "embedding-default": { provider: "gemini", model: "text-embedding-004" },
};

export type ModelAlias = keyof typeof DEFAULT_MODEL_CONFIG;

// 单例 Provider 缓存
const providers: Record<string, AIProvider> = {};

/**
 * 工厂函数：获取或创建 Provider 实例
 */
export function getAIProvider(providerName: string): AIProvider {
  if (providers[providerName]) return providers[providerName];

  switch (providerName) {
    case "gemini":
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY environment variable is not set");
      providers[providerName] = new GeminiProvider(apiKey);
      break;
    
    case "openai":
      throw new Error("OpenAI provider not implemented yet");
    
    default:
      throw new Error(`Provider ${providerName} not supported`);
  }

  return providers[providerName];
}

/**
 * 解析模型别名或直接使用模型 ID
 */
export function resolveModel(aliasOrId: string) {
  const config = DEFAULT_MODEL_CONFIG[aliasOrId as ModelAlias];
  if (config) {
    return config;
  }
  
  // 如果不是预设别名，尝试根据前缀推断提供商 (简单的默认逻辑)
  if (aliasOrId.startsWith("gemini")) return { provider: "gemini", model: aliasOrId };
  if (aliasOrId.startsWith("gpt")) return { provider: "openai", model: aliasOrId };
  
  // 默认 fallback
  return DEFAULT_MODEL_CONFIG.default;
}