import { getTools } from "./src/services/tools.js";

async function test() {
  console.log(">>> بدء اختبار تحميل الموصلات...");
  
  try {
    const tools = await getTools();
    console.log("الأدوات المحملة:");
    tools.forEach(t => console.log(`- ${t.name}`));
    
    const githubTool = tools.find(t => t.name === "github_repo_info");
    const googleTool = tools.find(t => t.name === "google_search_api");
    
    if (githubTool) {
      console.log(">>> تم العثور على موصل GitHub بنجاح.");
    } else {
      console.error(">>> خطأ: لم يتم العثور على موصل GitHub.");
    }

    if (googleTool) {
      console.log(">>> تم العثور على موصل Google بنجاح.");
    } else {
      console.error(">>> خطأ: لم يتم العثور على موصل Google.");
    }
    
    process.exit(0);
  } catch (error) {
    console.error(">>> فشل الاختبار:", error);
    process.exit(1);
  }
}

test();
