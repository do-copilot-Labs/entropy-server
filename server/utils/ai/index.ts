import { getAIProvider, resolveModel } from "./factory";
import type { AICompletionResponse } from "./types";

/**
 * 统一的 AI 调用入口 (Facade Pattern)
 * 
 * 使用方式：
 * const ai = useAI('gemini-1.5-flash');
 * const summary = await ai.generateSummary(text);
 * 
 * @param modelAlias 模型别名或具体模型 ID，默认使用 'gemini-1.5-flash'
 */
export const useAI = (modelAlias: string = 'default') => {
  const { provider: providerName, model: modelId } = resolveModel(modelAlias);
  const provider = getAIProvider(providerName);

  return {
    /**
     * 生成文本
     */
    generateText: async (prompt: string, options?: Record<string, any>): Promise<AICompletionResponse> => {
      return provider.generateText(prompt, modelId, options);
    },

    /**
     * 生成向量 (Embeddings)
     * 自动使用当前模型对应的 embedding 变体（如果有映射）或直接使用当前模型
     */
    generateEmbedding: async (text: string): Promise<number[]> => {
      // 这里的逻辑可以优化：如果是对话模型，通常不能用来生成 embedding
      // 这里为了简单，我们假设如果调用者指定了 modelAlias，他知道自己在做什么
      // 或者我们可以硬编码一些默认的 embedding 模型映射
      let targetModel = modelId;
      if (modelAlias === 'default' || modelAlias.includes('flash') || modelAlias.includes('pro')) {
         // 自动切换到 embedding 模型
         targetModel = 'text-embedding-004';
      }
      return provider.generateEmbedding(text, targetModel);
    },

    /**
     * 生成摘要 (辅助函数)
     */
    generateSummary: async (content: string): Promise<string> => {
      const prompt = `Please provide a concise summary (around 100-200 words) of the following content. Focus on the main points and key takeaways.
      
      Content:
      ${content.substring(0, 20000)}`;

      const result = await provider.generateText(prompt, modelId);
      return result.text;
    }
  };
};