import Connector from "../connectors/index.js";
import { z } from "zod";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

class GoogleConnector extends Connector {
  constructor() {
    super({
      name: "google_search_api",
      description: "موصل للبحث عبر Google باستخدام Custom Search API.",
      schema: z.object({
        query: z.string().describe("نص البحث المراد الاستعلام عنه"),
      }),
      invoke: async ({ query }) => {
        try {
          const apiKey = process.env.GOOGLE_API_KEY;
          const cx = process.env.GOOGLE_CX;
          
          if (!apiKey || !cx) {
            return "تنبيه: مفاتيح Google API (GOOGLE_API_KEY, GOOGLE_CX) غير مهيأة. يرجى إضافتها في ملف .env لاستخدام هذا الموصل.";
          }

          const response = await fetch(`https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}`);
          
          if (!response.ok) {
            throw new Error(`فشل البحث: ${response.statusText}`);
          }

          const data = await response.json();
          const results = data.items?.slice(0, 3).map(item => `- ${item.title}: ${item.link}`).join("\n") || "لا توجد نتائج.";
          return `نتائج البحث عن "${query}":\n${results}`;
        } catch (error) {
          return `خطأ في موصل Google: ${error.message}`;
        }
      },
    });
  }
}

export default GoogleConnector;
