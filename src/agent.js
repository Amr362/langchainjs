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

// تهيئة نموذج اللغة Gemini 2.5 Flash
const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
  temperature: 0,
}).bindTools(tools);

// عقدة نموذج اللغة (LLM Node)
const callModel = async (state) => {
  const { messages, task, file_url } = state;
  
  let inputMessages = [...messages];
  
  // إذا كانت هذه هي البداية، نضيف رسالة النظام
  if (inputMessages.length === 0) {
    inputMessages.push(
      new SystemMessage(`أنت وكيل ذكي متطور (Agentic AI) مشابه لـ "مانوس". 
      مهمتك هي تنفيذ طلبات المستخدم بدقة واستقلالية.
      يمكنك استخدام الأدوات المتاحة لك للبحث، الحساب، قراءة الملفات، تحليل الفيديوهات، أو تصفح المواقع الإلكترونية وتنفيذ المهام عليها (مثل النقر، الكتابة، واستخراج البيانات).
      لديك قدرات رؤية وتحليل وسائط فائقة (Multimodal)، بما في ذلك الصور والفيديوهات.
      فكر خطوة بخطوة، وأجب دائماً باللغة العربية بشكل احترافي.`)
    );
  }

  // إذا كان هناك مهمة جديدة، نضيفها
  if (task) {
    let content = [{ type: "text", text: task }];
    
    if (file_url) {
      const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(file_url);
      const isVideo = /\.(mp4|mov|avi|wmv|webm|flv)$/i.test(file_url);
      
      if (isImage) {
        content.push({
          type: "image_url",
          image_url: file_url,
        });
      } else if (isVideo) {
        content.push({
          type: "media",
          file_uri: file_url,
          mime_type: "video/mp4"
        });
        content[0].text += `\n(يرجى تحليل الفيديو في الرابط: ${file_url})`;
      } else {
        content[0].text += `\n(ملاحظة: يوجد ملف مرتبط بهذا الطلب في الرابط: ${file_url})`;
      }
    }
    
    inputMessages.push(new HumanMessage({ content }));
  }

  const response = await model.invoke(inputMessages);
  
  return { 
    messages: [response],
    logs: [`الوكيل يفكر: ${response.content || "استدعاء أداة..."}`]
  };
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
