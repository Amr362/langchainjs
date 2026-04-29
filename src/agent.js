import { StateGraph, Annotation } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

// Define the state of our graph
const AgentState = Annotation.Root({
  task: Annotation(),
  analysis: Annotation(),
  assignedTo: Annotation(),
  result: Annotation(),
  qa: Annotation(),
  logs: Annotation({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
});

const model = new ChatOpenAI({
  modelName: "gpt-4o-mini",
  temperature: 0,
});

const taskers = ["tasker_1", "tasker_2"];

// 1. Analyze Task Node
const analyzeTask = async (state) => {
  console.log("--- ANALYZING TASK ---");
  const response = await model.invoke([
    new SystemMessage("You are a task analyzer. Categorize the task and identify key requirements."),
    new HumanMessage(state.task),
  ]);
  return { 
    analysis: response.content,
    logs: ["Task analyzed successfully"]
  };
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
  // In a real scenario, this might call an external API or another agent
  const response = await model.invoke([
    new SystemMessage(`You are ${state.assignedTo}. Execute the following task based on the analysis.`),
    new HumanMessage(`Task: ${state.task}\nAnalysis: ${state.analysis}`),
  ]);
  return { 
    result: response.content,
    logs: ["Task executed by tasker"]
  };
};

// 4. Review Task Node (QA)
const reviewTask = async (state) => {
  console.log("--- REVIEWING TASK (QA) ---");
  const response = await model.invoke([
    new SystemMessage("You are a QA specialist. Review the execution result against the original task and analysis. Provide a score out of 10 and feedback."),
    new HumanMessage(`Original Task: ${state.task}\nExecution Result: ${state.result}`),
  ]);
  return { 
    qa: response.content,
    logs: ["QA review completed"]
  };
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
