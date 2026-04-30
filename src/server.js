import express from "express";
import dotenv from "dotenv";
import path from "path";
import cors from "cors";
import { fileURLToPath } from "url";
import { agent } from "./agent.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

const PORT = process.env.PORT || 8080;

// نقطة النهاية الرئيسية لتشغيل المهام
app.post("/task/run", async (req, res) => {
  const { task } = req.body;

  if (!task) {
    return res.status(400).json({ success: false, error: "المهمة مطلوبة" });
  }

  try {
    console.log(`>>> جاري تنفيذ المهمة: "${task}"`);
    
    const initialState = {
      task: task,
      messages: [],
      logs: []
    };

    // تنفيذ الوكيل (سيعمل بشكل تكراري حتى ينتهي)
    const finalState = await agent.invoke(initialState);

    // استخراج النتيجة النهائية (آخر رسالة من النموذج)
    const lastMessage = finalState.messages[finalState.messages.length - 1];
    
    res.json({
      success: true,
      output: lastMessage.content,
      logs: finalState.logs,
      steps: finalState.messages.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(">>> خطأ في تنفيذ الوكيل:", error);
    res.status(500).json({ 
      success: false, 
      error: "فشل الوكيل في معالجة المهمة",
      details: error.message 
    });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`الخادم يعمل على http://0.0.0.0:${PORT}`);
});
