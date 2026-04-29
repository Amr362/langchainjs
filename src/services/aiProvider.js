import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

class AIProvider {
  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not set in environment variables.");
    }
    this.genAI = new GoogleGenerativeAI(apiKey || "dummy_key");
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  async generateResponse(task) {
    try {
      const result = await this.model.generateContent(task);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error("Gemini generateResponse Error:", error.message);
      return `Error: ${error.message}`;
    }
  }

  async handlePrompt(prompt) {
    return this.generateResponse(prompt);
  }
}

export const aiProvider = new AIProvider();
