import express from "express";
import dotenv from "dotenv";
import { agent } from "./agent.js";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;
const tasks = [];

// GET / - Health check
app.get("/", (req, res) => {
  res.send("Agent running");
});

// POST /task/run - Run a new task
app.post("/task/run", async (req, res) => {
  const { task } = req.body;

  if (!task) {
    return res.status(400).json({ error: "Task description is required" });
  }

  console.log(`\n>>> Received new task: "${task}"`);

  try {
    const initialState = {
      task: task,
      logs: [`Received task at ${new Date().toISOString()}`]
    };

    const finalState = await agent.invoke(initialState);

    const result = {
      id: tasks.length + 1,
      timestamp: new Date().toISOString(),
      task: finalState.task,
      analysis: finalState.analysis,
      assignedTo: finalState.assignedTo,
      result: finalState.result,
      qa: finalState.qa,
      logs: finalState.logs
    };

    tasks.push(result);
    
    console.log(">>> Task completed successfully\n");
    res.json(result);
  } catch (error) {
    console.error("Error running agent:", error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});

// GET /tasks - List all tasks (Bonus)
app.get("/tasks", (req, res) => {
  res.json(tasks);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});
