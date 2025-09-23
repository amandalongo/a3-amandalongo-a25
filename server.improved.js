// backend code
require("dotenv").config();
const express = require("express");
const path = require("path");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();
const dir = "public";
const port = process.env.PORT || 3000;

app.use(express.json());

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const dbName = process.env.MONGODB_DB || "todosdb";
const collName = process.env.MONGODB_COLLECTION || "todos";

let db, todos;

// helpers
function computeDaysUntilDue(due_date) {
  if (!due_date) return null;
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

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

function toApiRow(doc) {
  return {
    id: doc._id.toString(),
    task: doc.task,
    creation_date: doc.creation_date,
    due_date: doc.due_date ?? null,
    completed: !!doc.completed,
    days_until_due: computeDaysUntilDue(doc.due_date ?? null),
  };
}

function normalizeDueDate(input) {
  if (input == null || input === "") return null;
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y, m, d] = input.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  const d = new Date(input);
  return isNaN(d.getTime()) ? null : d;
}

function normalizeCreationDate(input) {
  if (input == null || input === "") return new Date();
  const d = new Date(input);
  return isNaN(d.getTime()) ? new Date() : d;
}

async function fetchAllWithDerived() {
  const docs = await todos.find({}).sort({ creation_date: 1 }).toArray();
  return docs.map(toApiRow);
}

const router = express.Router();

// GET 
router.get("/", async (_req, res) => {
  try {
    res.json(await fetchAllWithDerived());
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch todos" });
  }
});

// POST 
router.post("/", async (req, res) => {
  try {
    const body = req.body || {};
    const task = (body.task ?? "").toString().trim();
    const creation_date = normalizeCreationDate(body.creation_date);
    const due_date = normalizeDueDate(body.due_date);
    if (!task) return res.status(400).json({ error: "Task is required" });

    await todos.insertOne({ task, creation_date, due_date, completed: false });
    res.json(await fetchAllWithDerived());
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to add todo" });
  }
});

const isValidObjectId = (s) => typeof s === "string" && /^[a-fA-F0-9]{24}$/.test(s);

// PUT 
router.put("/:id", async (req, res) => {
  try {
    const rawId = req.params.id;
    if (!isValidObjectId(rawId)) return res.status(400).json({ error: "Invalid ID format" });

    const updates = {};
    const body = req.body || {};
    if ("task" in body) updates.task = String(body.task ?? "").trim();
    if ("creation_date" in body) updates.creation_date = normalizeCreationDate(body.creation_date);
    if ("due_date" in body) updates.due_date = normalizeDueDate(body.due_date);
    if ("completed" in body) updates.completed = !!body.completed;

    const r = await todos.updateOne({ _id: new ObjectId(rawId) }, { $set: updates });
    if (r.matchedCount === 0) return res.status(404).json({ error: `No todo with ID ${rawId}` });

    res.json(await fetchAllWithDerived());
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to update todo" });
  }
});

// DELETE 
router.delete("/:id", async (req, res) => {
  try {
    const rawId = req.params.id;
    if (!isValidObjectId(rawId)) return res.status(400).json({ error: "Invalid ID format" });

    const r = await todos.deleteOne({ _id: new ObjectId(rawId) });
    if (r.deletedCount === 0) return res.status(404).json({ error: `No todo with ID ${rawId}` });

    res.json(await fetchAllWithDerived());
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to delete todo" });
  }
});

app.use("/todos", router);

// static and 404 stay after this line
app.use(express.static(path.join(__dirname, dir)));
app.use((_req, res) => res.status(404).send("404 Not Found"));


// start server after db init
(async function initDBAndStart() {
  try {
    const client = new MongoClient(uri, { ignoreUndefined: true });
    await client.connect();
    db = client.db(dbName);
    todos = db.collection(collName);
    console.log("Connected to MongoDB");

    // seed once if empty
    const count = await todos.countDocuments();
    if (count === 0) {
      await todos.insertOne({
        task: "Assignment 3",
        creation_date: new Date(),
        due_date: new Date("2025-09-15"), // ISO-safe
        completed: false,
      });
      console.log("Seeded initial todo");
    }

    app.listen(port, () => {
      console.log(`Server listening on http://localhost:${port}`);
    });
  } catch (e) {
    console.error("Failed to connect to MongoDB", e);
    process.exit(1);
  }
})();
