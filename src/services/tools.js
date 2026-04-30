import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { DuckDuckGoSearch } from "@langchain/community/tools/duckduckgo_search";
import fetch from "node-fetch";
import dotenv from "dotenv";
import { browserTools } from "./browser_tools.js";
import { codeTools } from "./code_tools.js";
import { connectorTools } from "./connector_tools.js";

dotenv.config();

// 1. أداة البحث عبر الإنترنت
export const searchTool = new DuckDuckGoSearch({
  maxResults: 3,
});

// 2. أداة بسيطة للحسابات
export const calculatorTool = tool(
  async ({ expression }) => {
    try {
      const result = new Function(`return ${expression}`)();
      return `النتيجة هي: ${result}`;
    } catch (error) {
      return `خطأ في الحساب: ${error.message}`;
    }
  },
  {
    name: "calculator",
    description: "تستخدم لإجراء العمليات الحسابية الرياضية.",
    schema: z.object({
      expression: z.string().describe("العملية الرياضية المراد حسابها، مثل '2 + 2'"),
    }),
  }
);

// 3. أداة للحصول على الوقت الحالي
export const timeTool = tool(
  async () => {
    return `الوقت الحالي هو: ${new Date().toLocaleString('ar-EG')}`;
  },
  {
    name: "get_current_time",
    description: "تستخدم للحصول على الوقت والتاريخ الحالي.",
    schema: z.object({}),
  }
);

// 4. أداة قراءة محتوى الملفات النصية من الروابط
export const readFileTool = tool(
  async ({ url }) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`فشل تحميل الملف: ${response.statusText}`);
      const text = await response.text();
      return text.length > 5000 ? text.substring(0, 5000) + "... (تم قص النص لطوله)" : text;
    } catch (error) {
      return `خطأ في قراءة الملف: ${error.message}`;
    }
  },
  {
    name: "read_file_content",
    description: "تستخدم لقراءة محتوى الملفات النصية من رابط URL مباشر.",
    schema: z.object({
      url: z.string().describe("الرابط المباشر للملف النصي"),
    }),
  }
);

// 5. أداة تحليل فيديوهات يوتيوب (جلب المعلومات الأساسية)
export const youtubeAnalyzerTool = tool(
  async ({ videoUrl }) => {
    try {
      return `تم استلام رابط يوتيوب: ${videoUrl}. سأقوم الآن بتحليل محتوى الفيديو بناءً على المشاهد المرئية والحوارات باستخدام قدرات Gemini المتعددة الوسائط.`;
    } catch (error) {
      return `خطأ في الوصول لرابط يوتيوب: ${error.message}`;
    }
  },
  {
    name: "analyze_youtube_video",
    description: "تستخدم لتحليل محتوى فيديوهات يوتيوب وفهم ما يدور فيها.",
    schema: z.object({
      videoUrl: z.string().describe("رابط فيديو يوتيوب المراد تحليله"),
    }),
  }
);

export const tools = [
  searchTool, 
  calculatorTool, 
  timeTool, 
  readFileTool, 
  youtubeAnalyzerTool,
  ...browserTools,
  ...codeTools,
  ...connectorTools
];
