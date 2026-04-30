import { StateGraph, Annotation, END, START } from "@langchain/langgraph";
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
  logs: Annotation({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
});

// تهيئة نموذج اللغة مع ربط الأدوات
const model = new ChatGoogleGenerativeAI({
  model: "gemini-1.5-flash",
  apiKey: process.env.GEMINI_API_KEY || "dummy_key",
  temperature: 0,
}).bindTools(tools);

// عقدة نموذج اللغة (LLM Node)
const callModel = async (state) => {
  const { messages, task } = state;
  
  // إذا كانت الرسائل فارغة، نبدأ برسالة النظام والمهمة
  let inputMessages = messages;
  if (inputMessages.length === 0) {
    inputMessages = [
      new SystemMessage(`أنت وكيل ذكي متطور (Agentic AI) مشابه لـ "مانوس". 
      مهمتك هي تنفيذ طلبات المستخدم بدقة واستقلالية.
      يمكنك استخدام الأدوات المتاحة لك للبحث عن المعلومات أو إجراء الحسابات.
      فكر خطوة بخطوة، وإذا احتجت لمعلومات إضافية استخدم أداة البحث.
      أجب دائماً باللغة العربية بشكل احترافي.`),
      new HumanMessage(task)
    ];
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
  
  // إذا كان النموذج يطلب استدعاء أداة، ننتقل لعقدة الأدوات
  if (lastMessage.tool_calls?.length > 0) {
    return "tools";
  }
  
  // خلاف ذلك، ننهي العمل
  return END;
};

// بناء الرسم البياني (Graph)
const workflow = new StateGraph(AgentState)
  .addNode("agent", callModel)
  .addNode("tools", toolNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldContinue)
  .addEdge("tools", "agent");

// تصدير الوكيل المجمع
export const agent = workflow.compile();
