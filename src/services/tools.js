import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { DuckDuckGoSearch } from "@langchain/community/tools/duckduckgo_search";
import dotenv from "dotenv";

dotenv.config();

// 1. أداة البحث عبر الإنترنت باستخدام DuckDuckGo (أكثر استقراراً في الاستيراد)
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

export const tools = [searchTool, calculatorTool, timeTool];
