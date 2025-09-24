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
    const { id, ...patch } = payload;
    const res = await fetch(`/todos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error("Failed to update todo");
    return res.json();
  },
  remove: async (id) => {
    const res = await fetch(`/todos/${id}`, { method: "DELETE" });
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
  logoutBtn: document.getElementById("logout-btn"),
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

// compute days until due date (null if no due date)
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

  // sort by date: incomplete first, then earliest due date, then creation time
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
    li.className =
      "flex items-center justify-between bg-white/30 mb-2 p-3 rounded-2xl text-white";

    // checkbox
    const cbId = `cb-${t.id}`;
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = cbId;
    checkbox.className =
      "checkbox h-5 w-5 rounded-full border-2 border-white/30 bg-transparent appearance-none cursor-pointer transition-all";
    checkbox.checked = !!t.completed;
    checkbox.setAttribute("aria-checked", String(!!t.completed));

    const label = document.createElement("label");
    label.setAttribute("for", cbId);
    label.className = "flex-1 text-center mx-3 cursor-pointer";

    const dueStr = t.due_date ? formatDateISO(t.due_date) : "";
    const derived = labelForDays(t.days_until_due);

    label.innerHTML = `
      <span class="task-text" ${
        t.completed ? 'style="text-decoration: line-through; opacity:0.7;"' : ""
      }>
        ${escapeHTML(t.task)}
      </span>
      <small class="block text-[11px] opacity-95 mt-1 font-roboto">
        ${dueStr ? `Due: ${dueStr}` : ""}
        ${dueStr && derived ? ` • ${escapeHTML(derived)}` : `${derived}`}
      </small>
    `;

    // buttons
    const btnWrap = document.createElement("div");
    btnWrap.className = "task-buttons flex gap-2";

    const editBtn = document.createElement("button");
    editBtn.className = "edit";
    editBtn.title = "Edit";
    editBtn.setAttribute("aria-label", `Edit "${t.task}"`);
    editBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 hover:cursor-pointer" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
        <path d="M373.1 27.5 484.5 138.9c14.7 14.7 14.7 38.6 0 53.3L212.6 464.1l-118 13.1c-19.7 2.2-36.2-14.3-34-34l13.1-118L319.8 27.5c14.7-14.7 38.6-14.7 53.3 0zM338.5 116.3 95.7 359.1l-8.3 74.5 74.5-8.3 242.8-242.8-66.2-66.2z"/>
      </svg>`;

    const delBtn = document.createElement("button");
    delBtn.className = "delete";
    delBtn.title = "Delete";
    delBtn.setAttribute("aria-label", `Delete "${t.task}"`);
    delBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 hover:cursor-pointer" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true">
        <path d="M135.2 17.7C140.5 7.3 151.1 0 162.9 0h122.3c11.8 0 22.4 7.3 27.7 17.7L328 32H432a16 16 0 0 1 0 32h-24l-21.2 372.5A80 80 0 0 1 306.9 512H141.1a80 80 0 0 1-79.9-75.5L40 64H16A16 16 0 0 1 16 32h104l15.2-14.3zM96.3 96l19.6 344.5A48 48 0 0 0 141.1 480h165.8a48 48 0 0 0 45.2-39.5L371.7 96H96.3z"/>
      </svg>`;

    btnWrap.append(editBtn, delBtn);
    li.append(checkbox, label, btnWrap);
    el.list.appendChild(li);
  }

  updateStats();
  clampListHeightTo3();
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

function clampListHeightTo3() {
  const ul = el.list;
  const items = ul.querySelectorAll('li');
  if (items.length > 3) {
    const third = items[2];
    const height = (third.offsetTop + third.offsetHeight) - ul.offsetTop;
    ul.style.maxHeight = height + 'px';
    ul.style.overflowY = 'auto';
    ul.style.paddingRight = '8px'; 
  } else {
    ul.style.maxHeight = '';
    ul.style.overflowY = '';
    ul.style.paddingRight = '';
  }
}

// ---- celebration confetti ----
function celebrate() {
  if (
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
    return;

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

//list handlers

el.list.addEventListener("change", async (evt) => {
  if (!evt.target.matches("input.checkbox")) return;
  const li = evt.target.closest("li");
  if (!li) return;

  const id = li.dataset.id;
  const checked = evt.target.checked;
  try {
    todos = await API.update({ id, completed: checked });
    renderTodos(); // re-renders with filled checkbox and line-through text
  } catch (e) {
    console.error(e);
    evt.target.checked = !checked; // revert on failure
  }
});

// click for edit/delete buttons
el.list.addEventListener("click", async (evt) => {
  const li = evt.target.closest("li");
  if (!li) return;
  const id = li.dataset.id;

  // edit
  if (evt.target.closest("button")?.classList.contains("edit")) {
    startInlineEdit(li, id);
    return;
  }
  // delete
  if (evt.target.closest("button")?.classList.contains("delete")) {
    try {
      todos = await API.remove(id);
      renderTodos();
    } catch (e) {
      console.error(e);
    }
  }
});

// edit task, due date
function startInlineEdit(li, id) {
  const item = todos.find((t) => String(t.id) === String(id));
  if (!item) return;

  const textSpan = li.querySelector(".task-text");
  const metaSmall = li.querySelector("small");
  const btnWrap = li.querySelector(".task-buttons");
  const checkbox = li.querySelector(".checkbox");
  if (!textSpan || !metaSmall || !btnWrap || !checkbox) return;

  // editors
  const editInput = document.createElement("input");
  editInput.type = "text";
  editInput.value = item.task;
  editInput.className =
    "w-full rounded-xl px-3 py-2 text-white text-sm font-roboto outline-none";
  editInput.style.background = "rgba(255, 126, 183, 0.3)";
  editInput.style.marginBottom = "4px";

  const editDue = document.createElement("input");
  editDue.type = "date";
  editDue.value = formatDateISO(item.due_date);
  editDue.className =
    "w-3/4 rounded-xl px-3 py-2 text-white text-xs font-roboto outline-none";
  editDue.style.background = "rgba(255, 126, 183, 0.3)";

  // save and cancel buttons
  const saveBtn = document.createElement("button");
  saveBtn.className = "edit";
  saveBtn.title = "Save";
  saveBtn.setAttribute("aria-label", "Save");
  saveBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 hover:cursor-pointer" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M173.9 439.4 7 272.5c-9.4-9.4-9.4-24.6 0-33.9l22.6-22.6c9.4-9.4 24.6-9.4 33.9 0L192 312.7 448.6 56c9.4-9.4 24.6-9.4 33.9 0L505 78.6c9.4 9.4 9.4 24.6 0 33.9L226.5 439.4c-9.4 9.4-24.6 9.4-33.9 0z"/>
    </svg>`;

  const cancelBtn = document.createElement("button");
  cancelBtn.className = "cancel";
  cancelBtn.title = "Cancel";
  cancelBtn.setAttribute("aria-label", "Cancel");
  cancelBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 hover:cursor-pointer" viewBox="0 0 384 512" fill="currentColor" aria-hidden="true">
      <path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"/>
    </svg>`;

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
      todos = await API.update({ id, task: newTask, due_date: newDue });
      renderTodos();
    } catch (e) {
      console.error(e);
    }
  };

  const revert = () => renderTodos();

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

async function handleLogout(e) {
  e.preventDefault();
  const btn = e.currentTarget;
  btn.disabled = true;
  btn.classList.add("opacity-60", "pointer-events-none");

  try {
    await fetch("/logout", { method: "POST", credentials: "same-origin" });
  } catch (err) {
    console.error("Logout failed:", err);
  } finally {
    window.location.href = "/login.html?loggedout=1";
  }
}

// initial load
window.addEventListener("DOMContentLoaded", () => {
  startClock();
  loadAndRender();
  const btn = el.logoutBtn || document.getElementById("logout-btn");
  if (btn) btn.addEventListener("click", handleLogout);
});
