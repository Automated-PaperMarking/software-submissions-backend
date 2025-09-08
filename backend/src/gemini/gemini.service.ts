// gemini.service.ts
import { Injectable } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class GeminiService {
  private model;

  constructor() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");
    this.model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
  }

  async evaluateCode(code: string, language: string) {
    const prompt = `
    You are an AI grader. Grade this ${language} code.
    Award marks (0–10) and provide feedback, even if it doesn't compile.

    Code:
    ${code}

    Respond in JSON:
    { "marks": number, "feedback": string }
    `;

    const result = await this.model.generateContent(prompt);
    return JSON.parse(result.response.text()); // convert response to JSON
  }
}
