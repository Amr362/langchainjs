import { StateGraph, Annotation, END, START, MemorySaver } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { tools } from "./services/tools.js";
import dotenv from "dotenv";

dotenv.config();

// تعريف حالة الوكيل (Agent State)
const AgentState = Annotation.Root({
  messages: Annotation({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  task: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  file_url: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),
  logs: Annotation({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
});

// التحقق من وجود مفاتيح API
const GOOGLE_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

if (!GOOGLE_API_KEY) {
  console.error("خطأ: لم يتم العثور على مفتاح API لـ Google/Gemini. يرجى ضبط GEMINI_API_KEY أو GOOGLE_API_KEY في ملف .env");
}

// تهيئة نموذج اللغة Gemini
const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.0-flash-exp", // استخدام نسخة أحدث وأسرع
  apiKey: GOOGLE_API_KEY,
  temperature: 0.2,
}).bindTools(tools);

// عقدة نموذج اللغة (LLM Node)
const callModel = async (state) => {
  const { messages, task, file_url } = state;
  
  let inputMessages = [...messages];
  
  // إذا كانت هذه هي البداية، نضيف رسالة النظام
  if (inputMessages.length === 0) {
    inputMessages.push(
      new SystemMessage(`أنت وكيل ذكي متطور (Agentic AI) يسمى "Manus Clone". 
      مهمتك هي تنفيذ طلبات المستخدم بدقة واستقلالية.
      
      قدراتك تشمل:
      1. تصفح المواقع: استخدم أدوات browser_* للتفاعل مع الويب. ستقوم الأدوات تلقائياً بأخذ لقطات شاشة عند الضرورة.
      2. تعديل الكود: يمكنك قراءة وكتابة الملفات وتنفيذ أوامر الشل داخل المجلد الحالي.
      3. الموصلات: يمكنك إدارة وربط التطبيقات الخارجية.
      
      تعليمات هامة:
      - فكر خطوة بخطوة قبل اتخاذ أي إجراء.
      - أجب دائماً باللغة العربية بشكل احترافي وودود.
      - إذا قمت باستخدام أداة متصفح وظهر لك رابط لقطة شاشة [SCREENSHOT_PATH:...], قم بتضمينه في ردك النهائي ليتمكن المستخدم من رؤيته.
      - كن مبادراً في حل المشكلات ولا تتوقف عند أول خطأ يواجهك.`)
    );
  }

  // إذا كان هناك مهمة جديدة، نضيفها كرسالة من المستخدم
  if (task) {
    let content = [{ type: "text", text: task }];
    
    if (file_url) {
      const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(file_url);
      if (isImage) {
        content.push({
          type: "image_url",
          image_url: { url: file_url },
        });
      } else {
        content[0].text += `\n(ملاحظة: يوجد ملف مرتبط بهذا الطلب في الرابط: ${file_url})`;
      }
    }
    
    inputMessages.push(new HumanMessage({ content }));
  }

  try {
    const response = await model.invoke(inputMessages);
    
    // تسجيل التفكير في السجلات
    let logMessage = "الوكيل يفكر...";
    if (response.tool_calls && response.tool_calls.length > 0) {
      logMessage = `جاري استخدام الأدوات: ${response.tool_calls.map(tc => tc.name).join(', ')}`;
    } else if (response.content) {
      logMessage = `تم توليد الرد النهائي.`;
    }

    return { 
      messages: [response],
      logs: [logMessage],
      task: "" // مسح المهمة بعد إضافتها للمراسلات
    };
  } catch (error) {
    console.error("خطأ في استدعاء النموذج:", error);
    const errorResponse = new AIMessage({ content: `عذراً، واجهت خطأ أثناء معالجة طلبك: ${error.message}` });
    return {
      messages: [errorResponse],
      logs: ["فشل استدعاء النموذج"],
      task: ""
    };
  }
};

// عقدة الأدوات (Tool Node)
const toolNode = new ToolNode(tools);

// وظيفة اتخاذ القرار (Router)
const shouldContinue = (state) => {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1];
  
  if (lastMessage.tool_calls?.length > 0) {
    return "tools";
  }
  
  return END;
};

// تهيئة الذاكرة (Checkpointer)
const checkpointer = new MemorySaver();

// بناء الرسم البياني (Graph)
const workflow = new StateGraph(AgentState)
  .addNode("agent", callModel)
  .addNode("tools", toolNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldContinue)
  .addEdge("tools", "agent");

// تصدير الوكيل المجمع مع الذاكرة
export const agent = workflow.compile({ checkpointer });
