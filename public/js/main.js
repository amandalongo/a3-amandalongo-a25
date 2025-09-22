// FRONT-END (CLIENT) JAVASCRIPT

// API helper functions for the backend
const API = {
  list: async () => {
    const res = await fetch("/todos");
    if (!res.ok) throw new Error("Failed to fetch todos");
    return res.json();
  },
  add: async (payload) => {
    const res = await fetch("/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to add todo");
    return res.json();
  },
  update: async (payload) => {
    const res = await fetch("/todos", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to update todo");
    return res.json();
  },
  remove: async (id) => {
    const res = await fetch("/todos", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) throw new Error("Failed to delete todo");
    return res.json();
  },
};

let todos = [];

const el = {
  today: document.getElementById("today"),
  form: document.querySelector(".add-task-form"),
  taskInput: document.getElementById("task-input"),
  dueDateInput: document.getElementById("due-date-input"),
  list: document.getElementById("task-list"),
  emptyImage: document.querySelector(".empty-image"),
  count: document.getElementById("count"),
  progress: document.getElementById("progress"),
};

//clock at the top of the ui
function startClock() {
  const fmt = () => {
    const now = new Date();
    el.today.textContent = `today is: ${now.toLocaleString()}`;
  };
  fmt();
  setInterval(fmt, 1000);
}

function formatDateISO(d) {
  if (!d) return "";
  try {
    const dt = new Date(d);
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    return dt.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

// Compute days until due date (null if no due date) account for 11:59 date due
function labelForDays(n) {
  if (n == null) return "";
  if (n > 1) return `Due in ${n} days`;
  if (n === 1) return `Due in 1 day`;
  if (n === 0) return `Due today`;
  if (n === -1) return `Overdue by 1 day`;
  return `Overdue by ${Math.abs(n)} days`;
}

function renderTodos() {
  el.list.innerHTML = "";

  if (!todos || todos.length === 0) {
    el.emptyImage.style.display = "block";
  } else {
    el.emptyImage.style.display = "none";
  }

  // Sort by date: incomplete first, then earliest due date, then creation time
  const sorted = [...todos].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed - b.completed; // incomplete first
    const ad = a.due_date ? new Date(a.due_date).getTime() : Infinity;
    const bd = b.due_date ? new Date(b.due_date).getTime() : Infinity;
    if (ad !== bd) return ad - bd;
    return (a.creation_date || 0) - (b.creation_date || 0);
  });

  for (const t of sorted) {
    const li = document.createElement("li");
    li.dataset.id = t.id;

    //checkbox
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "checkbox";
    checkbox.checked = !!t.completed;

   
    const textWrap = document.createElement("span");
    const dueStr = t.due_date ? formatDateISO(t.due_date) : "";
    const derived = labelForDays(t.days_until_due);

    textWrap.innerHTML = `
      <span class="task-text" ${
        t.completed ? 'style="text-decoration: line-through; opacity:0.7;"' : ""
      }>
        ${escapeHTML(t.task)}
      </span>
      <small style="display:block; font-size:11px; opacity:0.95; margin-top:2px; font-family: 'Roboto', sans-serif;">
        ${dueStr ? `Due: ${dueStr}` : ""}
        ${dueStr && derived ? ` • ${escapeHTML(derived)}` : `${derived}`}
      </small>
    `;

    // Buttons
    const btnWrap = document.createElement("div");
    btnWrap.className = "task-buttons";
    const editBtn = document.createElement("button");
    editBtn.className = "edit";
    editBtn.title = "Edit";
    editBtn.innerHTML = `<i class="fa-solid fa-pen"></i>`;

    const delBtn = document.createElement("button");
    delBtn.className = "delete";
    delBtn.title = "Delete";
    delBtn.innerHTML = `<i class="fa-solid fa-trash"></i>`;

    btnWrap.append(editBtn, delBtn);

    li.append(checkbox, textWrap, btnWrap);
    el.list.appendChild(li);
  }

  updateStats();
}

function updateStats() {
  const total = todos.length;
  const done = todos.filter((t) => t.completed).length;
  el.count.textContent = `${done}/${total}`;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  el.progress.style.width = `${pct}%`;

  if (total > 0 && done === total) {
    celebrate();
  }
}

// Celebration confetti when all tasks are completed
function celebrate() {
  const COUNT = 120;
  for (let i = 0; i < COUNT; i++) {
    const c = document.createElement("div");
    c.className = "confetti";
    c.style.left = Math.random() * 100 + "vw";
    c.style.background = randomPastel();
    c.style.animationDelay = Math.random() * 0.5 + "s";
    c.style.transform = `translateY(-10px) rotate(${Math.random() * 360}deg)`;
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 3500);
  }
}

function randomPastel() {
  const colors = [
    "#ff7eb7",
    "#8E68E6",
    "#FFD166",
    "#06D6A0",
    "#EF476F",
    "#A8DADC",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

function escapeHTML(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function loadAndRender() {
  try {
    todos = await API.list();
    renderTodos();
  } catch (e) {
    console.error(e);
  }
}

el.form.addEventListener("submit", async (evt) => {
  evt.preventDefault();
  const task = el.taskInput.value.trim();
  const dueDate = el.dueDateInput.value || null;

  if (!task) return;

  const payload = {
    task,
    due_date: dueDate,
    creation_date: Date.now(),
  };

  try {
    todos = await API.add(payload);
    el.taskInput.value = "";
    renderTodos();
  } catch (e) {
    console.error(e);
  }
});

// Toggle / Edit / Delete handlers
el.list.addEventListener("click", async (evt) => {
  const li = evt.target.closest("li");
  if (!li) return;
  const id = li.dataset.id;

  // Toggle complete
  if (evt.target.classList.contains("checkbox")) {
    const checked = evt.target.checked;
    try {
      todos = await API.update({ id, completed: checked });
      renderTodos();
    } catch (e) {
      console.error(e);
    }
    return;
  }

  // Edit
  if (evt.target.closest("button")?.classList.contains("edit")) {
    startInlineEdit(li, id);
    return;
  }

  // Delete
  if (evt.target.closest("button")?.classList.contains("delete")) {
    try {
      todos = await API.remove(id);
      renderTodos();
    } catch (e) {
      console.error(e);
    }
    return;
  }
});

// Edit task, due date
function startInlineEdit(li, id) {
  const item = todos.find((t) => String(t.id) === String(id));
  if (!item) return;

  const textSpan = li.querySelector(".task-text");
  const metaSmall = li.querySelector("small");
  const btnWrap = li.querySelector(".task-buttons");
  const checkbox = li.querySelector(".checkbox");

  // editors
  const editInput = document.createElement("input");
  editInput.type = "text";
  editInput.value = item.task;
  editInput.style.width = "100%";
  editInput.style.borderRadius = "12px";
  editInput.style.padding = "8px";
  editInput.style.border = "none";
  editInput.style.outline = "none";
  editInput.style.fontSize = "12px";
  editInput.style.background = "rgba(255, 126, 183, 0.3)";
  editInput.style.color = "#fff";
  editInput.style.marginBottom = "4px";

  const editDue = document.createElement("input");
  editDue.type = "date";
  editDue.value = formatDateISO(item.due_date);
  editDue.style.width = "75%";
  editDue.style.borderRadius = "12px";
  editDue.style.padding = "8px";
  editDue.style.border = "none";
  editDue.style.outline = "none";
  editDue.style.fontSize = "10px";
  editDue.style.background = "rgba(255, 126, 183, 0.3)";
  editDue.style.color = "#fff";

  // Save and cancel buttons
  const saveBtn = document.createElement("button");
  saveBtn.className = "edit";
  saveBtn.title = "Save";
  saveBtn.innerHTML = `<i class="fa-solid fa-check"></i>`;

  const cancelBtn = document.createElement("button");
  cancelBtn.className = "cancel";
  cancelBtn.title = "Cancel";
  cancelBtn.innerHTML = `<i class="fa-solid fa-xmark"></i>`;

  textSpan.replaceWith(editInput);
  metaSmall.replaceWith(editDue);

  btnWrap.innerHTML = "";
  btnWrap.append(saveBtn, cancelBtn);

  checkbox.disabled = true;

  const commit = async () => {
    const newTask = editInput.value.trim();
    const newDue = editDue.value || null;

    if (!newTask) {
      editInput.focus();
      return;
    }
    try {
      todos = await API.update({
        id,
        task: newTask,
        due_date: newDue,
      });
      renderTodos();
    } catch (e) {
      console.error(e);
    }
  };

  const revert = () => {
    renderTodos();
  };

  saveBtn.addEventListener("click", (e) => {
    e.preventDefault();
    commit();
  });
  cancelBtn.addEventListener("click", (e) => {
    e.preventDefault();
    revert();
  });

  editInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") revert();
  });
}

// Initial load
window.addEventListener("DOMContentLoaded", () => {
  startClock();
  loadAndRender();
});
