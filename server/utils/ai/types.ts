/**
 * AI 模型响应的标准格式
 */
export interface AICompletionResponse {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  raw?: any; // 保留原始响应以备不时之需
}

/**
 * AI Provider 接口 (Abstract Strategy)
 * 所有 AI 服务商适配器都必须实现此接口
 */
export interface AIProvider {
  /**
   * 厂商唯一标识，如 'gemini', 'openai'
   */
  providerId: string;

  /**
   * 生成文本
   * @param prompt 提示词
   * @param model 具体模型版本，如 'gemini-1.5-flash'
   * @param options 额外参数
   */
  generateText(prompt: string, model: string, options?: Record<string, any>): Promise<AICompletionResponse>;

  /**
   * 生成向量
   * @param text 输入文本
   * @param model 具体模型版本，如 'text-embedding-004'
   */
  generateEmbedding(text: string, model: string): Promise<number[]>;
}