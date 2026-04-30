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

// Initialize Gemini model with correct model name and settings
const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.0-flash", // Correct property name is 'model'
  maxOutputTokens: 2048,
  apiKey: process.env.GEMINI_API_KEY,
});

const taskers = ["tasker_1", "tasker_2"];

// 1. Analyze Task Node
const analyzeTask = async (state) => {
  console.log("--- ANALYZING TASK ---");
  try {
    console.log(">>> INVOKING GEMINI FOR ANALYSIS...");
    const response = await model.invoke([
      new SystemMessage("You are a task analyzer. Categorize the task and identify key requirements."),
      new HumanMessage(state.task),
    ]);
    console.log(">>> GEMINI RESPONSE RECEIVED");
    return { 
      analysis: response.content,
      logs: ["Task analyzed successfully"]
    };
  } catch (error) {
    console.error("Error in analyzeTask:", error.message);
    if (error.message.includes("401") || error.message.includes("API_KEY_INVALID") || error.message.includes("auth")) {
      throw new Error(`GEMINI_AUTH_ERROR: ${error.message}`);
    }
    throw error;
  }
};

// 2. Assign Task Node
const assignTask = async (state) => {
  console.log("--- ASSIGNING TASK ---");
  const tasker = taskers[Math.floor(Math.random() * taskers.length)];
  return { 
    assignedTo: tasker,
    logs: [`Task assigned to ${tasker}`]
  };
};

// 3. Execute Task Node
const executeTask = async (state) => {
  console.log("--- EXECUTING TASK ---");
  try {
    const response = await model.invoke([
      new SystemMessage(`You are ${state.assignedTo}. Execute the following task based on the analysis.`),
      new HumanMessage(`Task: ${state.task}\nAnalysis: ${state.analysis}`),
    ]);
    return { 
      result: response.content,
      logs: ["Task executed by tasker"]
    };
  } catch (error) {
    console.error("Error in executeTask:", error.message);
    throw error;
  }
};

// 4. Review Task Node (QA)
const reviewTask = async (state) => {
  console.log("--- REVIEWING TASK (QA) ---");
  try {
    const response = await model.invoke([
      new SystemMessage("You are a QA specialist. Review the execution result against the original task and analysis. Provide a score out of 10 and feedback."),
      new HumanMessage(`Original Task: ${state.task}\nExecution Result: ${state.result}`),
    ]);
    return { 
      qa: response.content,
      logs: ["QA review completed"]
    };
  } catch (error) {
    console.error("Error in reviewTask:", error.message);
    throw error;
  }
};

// Build the graph
const workflow = new StateGraph(AgentState)
  .addNode("analyze", analyzeTask)
  .addNode("assign", assignTask)
  .addNode("execute", executeTask)
  .addNode("review", reviewTask)
  .addEdge("__start__", "analyze")
  .addEdge("analyze", "assign")
  .addEdge("assign", "execute")
  .addEdge("execute", "review")
  .addEdge("review", "__end__");

export const agent = workflow.compile();
