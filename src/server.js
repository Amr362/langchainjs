import express from "express";
import dotenv from "dotenv";
import path from "path";
import cors from "cors";
import { fileURLToPath } from "url";
import { initializeAgent } from "./agent.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

const PORT = process.env.PORT || 8080;

let agentInstance; // لتخزين نسخة الوكيل المهيأة

// تهيئة الوكيل قبل بدء الخادم
const startServer = async () => {
  console.log(">>> جاري تهيئة الوكيل...");
  agentInstance = await initializeAgent();
  console.log(">>> تم تهيئة الوكيل بنجاح.");

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`الخادم يعمل على http://0.0.0.0:${PORT}`);
  });
};

// نقطة النهاية الرئيسية لتشغيل المهام
app.post("/task/run", async (req, res) => {
  const { task, thread_id, file_url } = req.body;

  if (!task) {
    return res.status(400).json({ success: false, error: "المهمة مطلوبة" });
  }

  const threadId = thread_id || "default-session";

  try {
    console.log(`>>> جاري تنفيذ المهمة: "${task}" في الجلسة: ${threadId}`);
    if (file_url) console.log(`>>> ملف مرتبط: ${file_url}`);

    const config = {
      configurable: { thread_id: threadId }
    };

    const inputs = {
      task: task,
      file_url: file_url || null
    };

    // تنفيذ الوكيل
    const finalState = await agentInstance.invoke(inputs, config);

    // استخراج النتيجة النهائية
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

// بدء تشغيل الخادم بعد تهيئة الوكيل
startServer();
