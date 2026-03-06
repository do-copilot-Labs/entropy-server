import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AIProvider, AICompletionResponse } from "../types";

/**
 * Gemini Provider 适配器 (Concrete Strategy)
 * 适配 GoogleGenerativeAI SDK 到 AIProvider 接口
 */
export class GeminiProvider implements AIProvider {
  providerId = "gemini";
  private client: GoogleGenerativeAI;

  constructor(apiKey: string) {
    if (!apiKey) throw new Error("Missing GEMINI_API_KEY");
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async generateText(prompt: string, modelId: string, options?: Record<string, any>): Promise<AICompletionResponse> {
    const model = this.client.getGenerativeModel({ model: modelId });
    
    // 支持透传参数，如 temperature
    const generationConfig = options ? { ...options } : undefined;
    
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig,
    });
    
    const response = await result.response;
    const text = response.text();

    return {
      text,
      // Gemini SDK 目前不一定直接返回 usage，这里预留结构
      raw: result,
    };
  }

  async generateEmbedding(text: string, modelId: string): Promise<number[]> {
    const model = this.client.getGenerativeModel({ model: modelId });
    
    // 清理文本以避免过长或非法字符
    const cleanText = text.replace(/\n/g, " ").trim().substring(0, 8000);

    const result = await model.embedContent(cleanText);
    return result.embedding.values;
  }
}