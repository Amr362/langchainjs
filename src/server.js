import express from "express";
import dotenv from "dotenv";
import path from "path";
import cors from "cors";
import { fileURLToPath } from "url";
import { agent } from "./agent.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 1) CORS configuration - Allow all origins for Railway deployment
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// 2) Body parsing middleware
app.use(express.json());

const PORT = process.env.PORT || 8080;
const tasks = [];

// 3) Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, "../public")));

// GET / - Serve the Chat UI
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// 4) Healthcheck endpoint for Railway
app.get("/setup/healthz", (req, res) => {
  res.status(200).send("ok");
});

// 5) Main API Endpoint: POST /task/run
app.post("/task/run", async (req, res) => {
  const { task } = req.body;

  // 6) Error protection: Check if task exists
  if (!task || typeof task !== 'string' || task.trim() === '') {
    console.error(">>> Error: Task description is required");
    return res.status(400).json({ 
      success: false,
      error: "task is required" 
    });
  }

  // 7) Check for OpenAI API Key
  if (!process.env.OPENAI_API_KEY) {
    console.error(">>> Error: OPENAI_API_KEY is missing");
    return res.status(500).json({
      success: false,
      error: "OpenAI API Key is not configured on the server"
    });
  }

  console.log(`>>> Received new task: "${task}"`);

  try {
    const initialState = {
      task: task,
      logs: [`Received task at ${new Date().toISOString()}`]
    };

    // Invoke LangGraph agent
    const finalState = await agent.invoke(initialState);

    // 8) Unified API contract response
    const result = {
      success: true,
      output: finalState.result || "No output generated",
      // Including extra details for UI compatibility if needed
      analysis: finalState.analysis,
      assignedTo: finalState.assignedTo,
      qa: finalState.qa,
      logs: finalState.logs,
      timestamp: new Date().toISOString()
    };

    tasks.push({
      id: tasks.length + 1,
      ...result
    });
    
    console.log(">>> Task completed successfully");
    res.json(result);
  } catch (error) {
    console.error(">>> Error running agent:", error);
    res.status(500).json({ 
      success: false, 
      error: "Internal Server Error", 
      details: error.message 
    });
  }
});

// GET /tasks - List all tasks
app.get("/tasks", (req, res) => {
  res.json(tasks);
});

// 9) Binding to 0.0.0.0 and process.env.PORT for Railway
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
  console.log(`Healthcheck available at http://0.0.0.0:${PORT}/setup/healthz`);
});
