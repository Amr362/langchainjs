import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});

async function test() {
  try {
    console.log("Testing Gemini via OpenAI adapter...");
    const response = await openai.chat.completions.create({
      model: "gemini-1.5-flash",
      messages: [{ role: "user", content: "Say hello" }],
    });
    console.log("✅ Success:", response.choices[0].message.content);
  } catch (error) {
    console.error("❌ Failed:", error.message);
    if (error.response) {
        console.error("Response data:", error.response.data);
    }
  }
}

test();
