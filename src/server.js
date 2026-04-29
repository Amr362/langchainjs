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

// 1) CORS configuration
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

const PORT = process.env.PORT || 8080;
const tasks = [];

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use(express.static(path.join(__dirname, "../public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// Healthcheck endpoint
app.get("/setup/healthz", (req, res) => {
  res.status(200).send("ok");
});

// Main API Endpoint
app.post("/task/run", async (req, res) => {
  const { task } = req.body;

  if (!task || typeof task !== 'string' || task.trim() === '') {
    return res.status(400).json({ 
      success: false,
      error: "task is required" 
    });
  }

  // Check for OpenAI API Key
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_api_key_here' || process.env.OPENAI_API_KEY === 'dummy_key') {
    console.error(">>> Error: OPENAI_API_KEY is missing or placeholder");
    return res.status(401).json({
      success: false,
      error: "OpenAI API Key is missing. Please set a valid OPENAI_API_KEY in Railway environment variables."
    });
  }

  console.log(`>>> Processing task: "${task}"`);

  try {
    const initialState = {
      task: task,
      logs: []
    };

    const finalState = await agent.invoke(initialState);

    const result = {
      success: true,
      output: finalState.result || "No output generated",
      analysis: finalState.analysis,
      assignedTo: finalState.assignedTo,
      qa: finalState.qa,
      logs: finalState.logs,
      timestamp: new Date().toISOString()
    };

    tasks.push({ id: tasks.length + 1, ...result });
    
    console.log(">>> Task completed successfully");
    res.json(result);
  } catch (error) {
    console.error(">>> Agent Execution Error:", error.message);
    
    let statusCode = 500;
    let errorMessage = "AI Agent failed to process the task";
    
    if (error.message.includes("OPENAI_AUTH_ERROR") || error.message.includes("401")) {
      statusCode = 401;
      errorMessage = "Authentication failed with OpenAI. Please check your API Key in Railway.";
    }

    res.status(statusCode).json({ 
      success: false, 
      error: errorMessage, 
      details: error.message 
    });
  }
});

app.get("/tasks", (req, res) => {
  res.json(tasks);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});
