import { navigateTool, getTextTool } from "./src/services/browser_tools.js";

async function test() {
  console.log(">>> بدء اختبار أدوات المتصفح...");
  
  try {
    console.log(">>> جاري الانتقال إلى google.com...");
    const navResult = await navigateTool.invoke({ url: "https://www.google.com" });
    console.log("نتيجة الانتقال:", navResult);
    
    console.log(">>> جاري استخراج النص من الصفحة...");
    const textResult = await getTextTool.invoke({});
    console.log("جزء من النص المستخرج:", textResult.substring(0, 200));
    
    process.exit(0);
  } catch (error) {
    console.error(">>> فشل الاختبار:", error);
    process.exit(1);
  }
}

test();
