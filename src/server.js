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
  const { task, thread_id } = req.body;

  if (!task) {
    return res.status(400).json({ success: false, error: "المهمة مطلوبة" });
  }

  // استخدام thread_id افتراضي إذا لم يتم توفيره (للتوافق مع الواجهة الحالية)
  const threadId = thread_id || "default-session";

  try {
    console.log(`>>> جاري تنفيذ المهمة: "${task}" في الجلسة: ${threadId}`);
    
    const config = {
      configurable: { thread_id: threadId }
    };

    // في LangGraph مع Checkpointer، نمرر فقط التغييرات (المدخلات الجديدة)
    // initialState هنا يمثل المدخلات الجديدة لهذه الخطوة
    const inputs = {
      task: task
    };

    // تنفيذ الوكيل (سيعمل بشكل تكراري حتى ينتهي)
    const finalState = await agent.invoke(inputs, config);

    // استخراج النتيجة النهائية (آخر رسالة من النموذج)
    const lastMessage = finalState.messages[finalState.messages.length - 1];
    
    res.json({
      success: true,
      output: lastMessage.content,
      logs: finalState.logs,
      steps: finalState.messages.length,
      thread_id: threadId,
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
