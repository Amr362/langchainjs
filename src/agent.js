import { StateGraph, Annotation } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import dotenv from "dotenv";

dotenv.config();

// Define the state of our graph with proper reducers
const AgentState = Annotation.Root({
  task: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  analysis: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  assignedTo: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  result: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  qa: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  logs: Annotation({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
});

// Initialize Gemini model with correct model name and property
// Added maxRetries: 0 to fail fast on Quota errors
const model = new ChatGoogleGenerativeAI({
  model: "gemini-1.5-flash", 
  maxOutputTokens: 2048,
  apiKey: process.env.GEMINI_API_KEY,
  maxRetries: 0, // Disable long retries to avoid timeouts on Railway
});

// 1. Unified Agent Node (Simplified to 1 call instead of 3-4)
const unifiedAgent = async (state) => {
  console.log("--- PROCESSING TASK (UNIFIED) ---");
  try {
    console.log(">>> INVOKING GEMINI...");
    const response = await model.invoke([
      new SystemMessage(`You are an all-in-one AI agent. 
      Your job is to:
      1. Analyze the task.
      2. Execute it immediately.
      3. Self-review the output.
      
      Return your response in a clear format.`),
      new HumanMessage(state.task),
    ]);
    
    console.log(">>> GEMINI RESPONSE RECEIVED");
    return { 
      analysis: "Analyzed and executed in one step",
      result: response.content,
      assignedTo: "unified_agent",
      qa: "Self-reviewed",
      logs: ["Task processed successfully in unified mode"]
    };
  } catch (error) {
    console.error("Error in unifiedAgent:", error.message);
    if (error.message.includes("429") || error.message.includes("quota")) {
      throw new Error(`GEMINI_QUOTA_ERROR: ${error.message}`);
    }
    if (error.message.includes("401") || error.message.includes("API_KEY_INVALID") || error.message.includes("auth")) {
      throw new Error(`GEMINI_AUTH_ERROR: ${error.message}`);
    }
    throw error;
  }
};

// Build the simplified graph
const workflow = new StateGraph(AgentState)
  .addNode("agent", unifiedAgent)
  .addEdge("__start__", "agent")
  .addEdge("agent", "__end__");

export const agent = workflow.compile();
