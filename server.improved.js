// backend code
// GitHub OAuth setup
const session = require("express-session");
const passport = require("passport");
const GitHubStrategy = require("passport-github2").Strategy;
const MongoStore = require("connect-mongo");

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

let db, todos, users;

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(session({
  name: "sid",
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    dbName: process.env.MONGODB_DB,
    ttl: 60 * 60 * 24 * 7,
  }),
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, { githubId: user.githubId, username: user.username || "" });
});

passport.deserializeUser(async (sessionUser, done) => {
  try {
    const u = await users.findOne({ githubId: sessionUser.githubId });
    done(null, u || sessionUser);
  } catch (e) {
    done(e);
  }
});

const baseUrl = process.env.BASE_URL || `http://localhost:${port}`;
const callbackURL =
  process.env.GITHUB_CALLBACK_URL || `${baseUrl}/auth/github/callback`;

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
      callbackURL,
      scope: ["read:user"],
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const githubId = String(profile.id);
        let user = await users.findOne({ githubId });
        if (!user) {
          // create on first login
          user = {
            githubId,
            username: profile.username || "",
            displayName: profile.displayName || "",
            avatar: profile.photos?.[0]?.value || "",
            createdAt: new Date(),
          };
          await users.insertOne(user);
        } else {
          await users.updateOne(
            { _id: user._id },
            {
              $set: {
                username: profile.username || user.username,
                displayName: profile.displayName || user.displayName,
                avatar: profile.photos?.[0]?.value || user.avatar,
              },
            }
          );
        }
        done(null, { githubId, username: user.username });
      } catch (err) {
        done(err);
      }
    }
  )
);

// require login for API routes
function ensureAuthed(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  return res.status(401).json({ error: "Unauthorized" });
}

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

async function fetchAllWithDerived(ownerId) {
  const docs = await todos
    .find({ ownerId })
    .sort({ creation_date: 1 })
    .toArray();
  return docs.map(toApiRow);
}

const isValidObjectId = (s) => typeof s === "string" && /^[a-fA-F0-9]{24}$/.test(s);

//routes
app.get("/auth/github", passport.authenticate("github"));

app.get(
  "/auth/github/callback",
  passport.authenticate("github", {
    failureRedirect: "/login.html?error=oauth",
  }),
  (_req, res) => {
    res.redirect("/");
  }
);

app.post("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => res.redirect("/login.html?loggedout=1"));
  });
});


app.get("/", (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return res.sendFile(path.join(__dirname, dir, "index.html"));
    }
  return res.sendFile(path.join(__dirname, dir, "login.html"));
});


const router = express.Router();
router.use(ensureAuthed);

// GET
router.get("/", async (req, res) => {
  try {
    res.json(await fetchAllWithDerived(req.user.githubId));
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

    await todos.insertOne({
      ownerId: req.user.githubId,
      task,
      creation_date,
      due_date,
      completed: false,
    });

    res.json(await fetchAllWithDerived(req.user.githubId));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to add todo" });
  }
});

// PUT
router.put("/:id", async (req, res) => {
  try {
    const rawId = req.params.id;
    if (!isValidObjectId(rawId)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    const updates = {};
    const body = req.body || {};
    if ("task" in body) updates.task = String(body.task ?? "").trim();
    if ("creation_date" in body) updates.creation_date = normalizeCreationDate(body.creation_date);
    if ("due_date" in body) updates.due_date = normalizeDueDate(body.due_date);
    if ("completed" in body) updates.completed = !!body.completed;

    const r = await todos.updateOne(
      { _id: new ObjectId(rawId), ownerId: req.user.githubId },
      { $set: updates }
    );
    if (r.matchedCount === 0) {
      return res.status(404).json({ error: `No todo with ID ${rawId}` });
    }

    res.json(await fetchAllWithDerived(req.user.githubId));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to update todo" });
  }
});

// DELETE /todos/:id
router.delete("/:id", async (req, res) => {
  try {
    const rawId = req.params.id;
    if (!isValidObjectId(rawId)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    const r = await todos.deleteOne({
      _id: new ObjectId(rawId),
      ownerId: req.user.githubId,
    });
    if (r.deletedCount === 0) {
      return res.status(404).json({ error: `No todo with ID ${rawId}` });
    }

    res.json(await fetchAllWithDerived(req.user.githubId));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to delete todo" });
  }
});

app.use("/todos", router);

app.use(express.static(path.join(__dirname, dir)));
app.use((_req, res) => res.status(404).send("404 Not Found"));

(async function initDBAndStart() {
  try {
    const client = new MongoClient(uri, { ignoreUndefined: true });
    await client.connect();
    db = client.db(dbName);
    todos = db.collection(collName);
    users = db.collection("users");

    await todos.createIndex({ ownerId: 1, creation_date: 1 });

    app.listen(port, () => {
      console.log(`Server listening on ${baseUrl}`);
      console.log(`GitHub callback: ${callbackURL}`);
    });
  } catch (e) {
    console.error("Failed to connect to MongoDB", e);
    process.exit(1);
  }
})();