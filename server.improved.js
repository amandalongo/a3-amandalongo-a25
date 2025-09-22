// backend code 
const express = require("express");
const fs = require("fs");
const mime = require("mime");
const path = require("path");

const app = express();
const dir = "public";
const port = process.env.PORT || 3000;

app.use(express.json());

let nextId = 1;
let appdata = [
  seed({
    task: "HW2",
    creation_date: Date.now(),
    due_date: "2025-09-15",
    completed: false,
  }),
];

// Compute days until due date (null if no due date) account for 11:59 date due 
function computeDaysUntilDue(due_date) {
  if (!due_date) return null;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let startOfDueDay;
  if (typeof due_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(due_date)) {
    const [y, m, d] = due_date.split("-").map(Number);
    startOfDueDay = new Date(y, m - 1, d);
  } else {
    const due = new Date(due_date);
    startOfDueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  }
  const DAY_MS = 24 * 60 * 60 * 1000;
  return Math.round((startOfDueDay - startOfToday) / DAY_MS);
}

function withDerived(row) {
  return {
    ...row,
    days_until_due: computeDaysUntilDue(row.due_date),
  };
}

function seed(row) {
  const id = String(nextId++);
  const {
    task = "",
    creation_date = Date.now(),
    due_date = null,
    completed = false,
  } = row || {};

  return {
    id,
    task,
    creation_date,
    due_date,
    completed,
  };
}

// api routing 

//get todos
app.get("/todos", (req, res) => {
  const out = appdata.map(withDerived);
  res.json(out);
});

//post todos
app.post("/todos", (req, res) => {
  const body = req.body;
  const task = (body.task ?? "").toString().trim();
  const creation_date = body.creation_date ?? Date.now();
  const due_date = body.due_date ?? null;
  
  if (!task) {
    return res.status(400).json({ error: "Task is required" });
  }

  const row = seed({
    task,
    creation_date,
    due_date,
    completed: false,
  });
  
  appdata.push(row);
  res.json(appdata.map(withDerived));

});

// put update todos
app.put("/todos", (req, res) => {
  const body = req.body;
  const id = body.id != null ? String(body.id) : null;
  if (!id) {
    return res.status(400).json({ error: "ID is required" });
  }

  const index = appdata.findIndex((r) => r.id === id);
  if (index === -1) {
    return res.status(404).json({ error: `No todo with ID ${id}` });
  }

  const current = appdata[index];

  const updates = {};
  if ("task" in body) updates.task = String(body.task ?? "").trim();
  if ("creation_date" in body) updates.creation_date = body.creation_date;
  if ("due_date" in body) updates.due_date = body.due_date ?? null; 
  if ("completed" in body) updates.completed = !!body.completed;

  const updated = { ...current, ...updates };
  appdata[index] = updated;

  res.json(appdata.map(withDerived));
});

//delete todos
app.delete("/todos", (req, res) => {
  const body = req.body;
  const id = body.id != null ? String(body.id) : null;
  if (!id) {
    return res.status(400).json({ error: "ID is required" });
  }

  const before = appdata.length;
  appdata = appdata.filter((r) => r.id !== id);
  if (appdata.length === before) {
    return res.status(404).json({ error: `No todo with ID ${id}` });
  }

  res.json(appdata.map(withDerived));
});

//static file serving
app.use(express.static(path.join(__dirname, dir)));

app.use((req, res) => {
  res.status(404).send("404 Not Found");
});

//makes it easier to click location of the port when running server.
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});