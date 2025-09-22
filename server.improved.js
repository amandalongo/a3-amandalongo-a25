// backend code 
const http = require("http");
const fs = require("fs");
const mime = require("mime");
const url = require("url");
const dir = "public/";
const port = 3000;

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

const server = http.createServer((request, response) => {
  const parsed = url.parse(request.url, true);
  const pathname = parsed.pathname;

  if (request.method === "GET") {
    if (pathname === "/todos") return getTodos(response);
    return handleStaticGet(request, response);
  }

  if (request.method === "POST" && pathname === "/todos")
    return readBodyJSON(request, response, addTodo);

  if (request.method === "PUT" && pathname === "/todos")
    return readBodyJSON(request, response, updateTodo);

  if (request.method === "DELETE" && pathname === "/todos")
    return readBodyJSON(request, response, deleteTodo);

  response.writeHead(404, { "Content-Type": "text/plain" });
  response.end("404 Not Found");
});

function getTodos(response) {
  const out = appdata.map(withDerived);
  sendJSON(response, 200, out);
}

function addTodo(body, response) {
  const task = (body.task ?? "").toString().trim();
  const creation_date = body.creation_date ?? Date.now();
  const due_date = body.due_date ?? null;

  if (!task) return badRequest(response, "Task is required");

  const row = seed({
    task,
    creation_date,
    due_date,
    completed: false,
  });

  appdata.push(row);

  const out = appdata.map(withDerived);
  sendJSON(response, 200, out);
}

function updateTodo(body, response) {
  const id = body.id != null ? String(body.id) : null;
  if (!id) return badRequest(response, "id is required");

  const idx = appdata.findIndex((t) => t.id === id);
  if (idx === -1) return notFound(response, "Todo not found");

  const current = appdata[idx];

  const updates = {};
  if ("task" in body) updates.task = String(body.task ?? "").trim();
  if ("creation_date" in body) updates.creation_date = body.creation_date;
  if ("due_date" in body) updates.due_date = body.due_date ?? null;
  if ("completed" in body) updates.completed = !!body.completed;

  const updated = { ...current, ...updates };
  appdata[idx] = updated;

  const out = appdata.map(withDerived);
  sendJSON(response, 200, out);
}

function deleteTodo(body, response) {
  const id = body.id != null ? String(body.id) : null;
  if (!id) return badRequest(response, "id is required");

  const before = appdata.length;
  appdata = appdata.filter((t) => t.id !== id);

  if (appdata.length === before) return notFound(response, "Todo not found");

  const out = appdata.map(withDerived);
  sendJSON(response, 200, out);
}

function handleStaticGet(request, response) {
  const filename = dir + (request.url === "/" ? "index.html" : request.url.slice(1));
  sendFile(response, filename);
}

function sendFile(response, filename) {
  const type = mime.getType(filename) || "application/octet-stream";
  fs.readFile(filename, (err, content) => {
    if (err == null) {
      response.writeHead(200, { "Content-Type": type });
      response.end(content);
    } else {
      response.writeHead(404, { "Content-Type": "text/plain" });
      response.end("404 Error: File Not Found");
    }
  });
}

function readBodyJSON(request, response, handler) {
  let dataString = "";
  request.on("data", (chunk) => (dataString += chunk));
  request.on("end", () => {
    let body = {};
    if (dataString.trim() !== "") {
      try {
        body = JSON.parse(dataString);
      } catch (e) {
        return badRequest(response, "Invalid JSON body");
      }
    }
    handler(body, response);
  });
}

function sendJSON(response, code, obj) {
  response.writeHead(code, { "Content-Type": "application/json" });
  response.end(JSON.stringify(obj));
}

function badRequest(response, msg) {
  response.writeHead(400, { "Content-Type": "application/json" });
  response.end(JSON.stringify({ error: msg }));
}

function notFound(response, msg) {
  response.writeHead(404, { "Content-Type": "application/json" });
  response.end(JSON.stringify({ error: msg }));
}

//makes it easier to click location of the port when running server.
server.listen(process.env.PORT || port, () => {
  console.log(`Server running on http://localhost:${process.env.PORT || port}`);
});
