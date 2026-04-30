import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { chromium } from "playwright";

let browser;
let context;
let page;

const ensureBrowser = async () => {
  if (!browser) {
    browser = await chromium.launch({ 
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });
    context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1,
    });
    
    // إضافة script لإخفاء خاصية webdriver
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
    });

    page = await context.newPage();
  }
  return page;
};

// 1. أداة الانتقال إلى رابط مع انتظار ذكي
export const navigateTool = tool(
  async ({ url }) => {
    try {
      const page = await ensureBrowser();
      console.log(`>>> جاري الانتقال إلى: ${url}`);
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      
      // انتظار إضافي عشوائي لمحاكاة السلوك البشري
      await page.waitForTimeout(2000); 
      
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

// 2. أداة استخراج النص مع تنظيف
export const getTextTool = tool(
  async () => {
    try {
      const page = await ensureBrowser();
      const text = await page.evaluate(() => {
        // إزالة العناصر غير الضرورية مثل scripts و styles
        const scripts = document.querySelectorAll('script, style, nav, footer');
        scripts.forEach(s => s.remove());
        return document.body.innerText;
      });
      return text.length > 8000 ? text.substring(0, 8000) + "..." : text;
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

// الأدوات الأخرى تبقى كما هي مع استخدام ensureBrowser المحسن
export const clickTool = tool(
  async ({ selector }) => {
    try {
      const page = await ensureBrowser();
      await page.click(selector, { timeout: 15000 });
      await page.waitForTimeout(1000);
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

export const typeTool = tool(
  async ({ selector, text }) => {
    try {
      const page = await ensureBrowser();
      await page.fill(selector, text, { timeout: 15000 });
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
