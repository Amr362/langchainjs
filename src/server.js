import express from "express";
import dotenv from "dotenv";
import path from "path";
import cors from "cors";
import { fileURLToPath } from "url";
import { agent } from "./agent.js";
import multer from "multer";
import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// إعداد multer لتخزين الملفات المرفوعة
const uploadDir = path.join(__dirname, "../public/uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  }
});

const upload = multer({ storage: storage });

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

const PORT = process.env.PORT || 8080;

// نقطة نهاية لرفع الملفات
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: "لم يتم رفع أي ملف" });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ success: true, file_url: fileUrl, filename: req.file.originalname });
});

// نقطة النهاية الرئيسية لتشغيل المهام
app.post("/task/run", async (req, res) => {
  const { task, thread_id, file_url } = req.body;

  if (!task && !file_url) {
    return res.status(400).json({ success: false, error: "المهمة أو الملف مطلوب" });
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
    const finalState = await agent.invoke(inputs, config);

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

// نقطة نهاية لجلب الموصلات المضافة
app.get("/api/connectors", (req, res) => {
  const connectorsFile = path.join(__dirname, "../data/connectors.json");
  if (fs.existsSync(connectorsFile)) {
    const data = JSON.parse(fs.readFileSync(connectorsFile, "utf-8"));
    res.json(data);
  } else {
    res.json({ connectors: [] });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`الخادم يعمل على http://0.0.0.0:${PORT}`);
});
