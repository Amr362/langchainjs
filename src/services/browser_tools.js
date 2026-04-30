import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { chromium } from "playwright";

let browser;
let page;

const ensureBrowser = async () => {
  if (!browser) {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
    });
    page = await context.newPage();
  }
  return page;
};

// 1. أداة الانتقال إلى رابط
export const navigateTool = tool(
  async ({ url }) => {
    try {
      const page = await ensureBrowser();
      await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
      const title = await page.title();
      return `تم الانتقال بنجاح إلى ${url}. عنوان الصفحة: ${title}`;
    } catch (error) {
      return `خطأ في الانتقال إلى الرابط: ${error.message}`;
    }
  },
  {
    name: "browser_navigate",
    description: "تستخدم للانتقال إلى رابط URL معين في المتصفح.",
    schema: z.object({
      url: z.string().describe("الرابط المراد زيارته"),
    }),
  }
);

// 2. أداة استخراج النص من الصفحة
export const getTextTool = tool(
  async () => {
    try {
      const page = await ensureBrowser();
      const text = await page.evaluate(() => document.body.innerText);
      return text.length > 10000 ? text.substring(0, 10000) + "..." : text;
    } catch (error) {
      return `خطأ في استخراج النص: ${error.message}`;
    }
  },
  {
    name: "browser_get_text",
    description: "تستخدم لاستخراج كافة النصوص المرئية من الصفحة الحالية.",
    schema: z.object({}),
  }
);

// 3. أداة النقر على عنصر
export const clickTool = tool(
  async ({ selector }) => {
    try {
      const page = await ensureBrowser();
      await page.click(selector, { timeout: 30000 });
      return `تم النقر بنجاح على العنصر: ${selector}`;
    } catch (error) {
      return `خطأ في النقر على العنصر: ${error.message}`;
    }
  },
  {
    name: "browser_click",
    description: "تستخدم للنقر على عنصر معين في الصفحة باستخدام CSS selector.",
    schema: z.object({
      selector: z.string().describe("CSS selector للعنصر المراد النقر عليه"),
    }),
  }
);

// 4. أداة الكتابة في حقل إدخال
export const typeTool = tool(
  async ({ selector, text }) => {
    try {
      const page = await ensureBrowser();
      await page.fill(selector, text, { timeout: 30000 });
      return `تمت الكتابة بنجاح في الحقل: ${selector}`;
    } catch (error) {
      return `خطأ في الكتابة: ${error.message}`;
    }
  },
  {
    name: "browser_type",
    description: "تستخدم للكتابة في حقول الإدخال (input fields).",
    schema: z.object({
      selector: z.string().describe("CSS selector لحقل الإدخال"),
      text: z.string().describe("النص المراد كتابته"),
    }),
  }
);

// 5. أداة أخذ لقطة شاشة (للمساعدة في التصحيح)
export const screenshotTool = tool(
  async ({ name }) => {
    try {
      const page = await ensureBrowser();
      const fileName = name || `screenshot_${Date.now()}.png`;
      const path = `./public/screenshots/${fileName}`;
      await page.screenshot({ path });
      return `تم أخذ لقطة شاشة وحفظها في: ${path}`;
    } catch (error) {
      return `خطأ في أخذ لقطة الشاشة: ${error.message}`;
    }
  },
  {
    name: "browser_screenshot",
    description: "تستخدم لأخذ لقطة شاشة للصفحة الحالية.",
    schema: z.object({
      name: z.string().optional().describe("اسم ملف الصورة الاختياري"),
    }),
  }
);

export const browserTools = [navigateTool, getTextTool, clickTool, typeTool, screenshotTool];
