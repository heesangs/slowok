// Gemini AI 클라이언트 설정 (서버 전용)
import { GoogleGenerativeAI } from "@google/generative-ai";

// 서버 환경에서만 사용 — 클라이언트에 노출 금지
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash";

export const geminiModel = genAI.getGenerativeModel({
  model: modelName,
});
