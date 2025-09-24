## To-Do List

Railway link https://a3-amandalongo-a25-production.up.railway.app/

A clean to-do app with GitHub login: add tasks with due dates, check them off, edit inline, and track progress—all fast and simple.

<img width="1512" height="740" alt="Screenshot 2025-09-24 at 11 15 04 AM" src="https://github.com/user-attachments/assets/0c6e9164-a600-446e-9f6b-9450f46fee6e" />

<img width="1512" height="740" alt="Screenshot 2025-09-24 at 11 14 21 AM" src="https://github.com/user-attachments/assets/0b6ea126-25eb-4d44-acac-8fe6c0fcf67f" />

- **Goals**:
   - My goal of this application was more for my use or anyone who would use this todo list for basic assignment to do lists or things I need to get done within a certain time frame, usually within the week. I wanted to be able to use this app for my todo! I wanted to be able to add a due date, a title and the ability to edit and cross out my todos and track how much I have gotten done, kind of like the canvas extension-Tasks for Canvas. I ended up having another goal of being able to scroll through my todo list and only show a couple tasks at a time sorted by priority so it wouldn't be as overwhelming. 
- **Challenges**:
  - One of my biggest challenges was definitely deployement for some reason, I had trouble with deploying to Vercel with the Github Oauth and having the callback properly execute. I kept getting a 404 error. I did end up going with Railway at the end of the day. I learned a little bit about Oauth previously in Soft Eng because our lead developer used an Oauth authentication within our application. I think another thing that wasn't necessarily challenging, but took a lot of time, was refactoring to Tailwind. I thought it was going to be a lot easier than I went into it, but it did take awhile and I downloaded the wrong package at first I think
- **Authentication**:
    - I used Github Oauth with passport.js because it seemed the easiest to implement condsidering I wouldn't have to create a mock username and password and it was easier to look up how to implement the Github Oauth. 
- **CSS Framework**:
    - I used TailwindCSS as my CSS framework because I have had experience using it within Soft Eng last year, and also was the main styling framework we used in my internship over the summer. Both times I have used it, I used it with React, so I felt like using Tailwind within raw HTML was different. I had to reconfigure almost my entire CSS file. But overall I didn't have to have as much styling in the tailwind.css file, it is just being watched through a separate file to make sure all styling renders properly. npx tailwindcss -i ./src/tailwind.css -o ./public/tailwind.css --watch

- **Express Middleware**: Here is a list of all of the middleware I used and what their purpose was
    - express.json() — Parses JSON request bodies and assigns the result to req.body.
    - express.static(path.join(__dirname, 'public')) — Serves static files (HTML/CSS/JS/images) from the public/ directory.
    - session(...) (from express-session) — Creates/reads a signed session cookie to persist user logins across requests.
    - passport.initialize() — Hooks Passport into the Express request cycle.
    - passport.session() — Restores the logged-in user from the session using Passport’s serialize/deserialize.
    - passport.authenticate('github') — Route middleware that starts/handles the GitHub OAuth flow and attaches the user on success.
    - router.use(ensureAuthed) — Custom guard that returns 401 if req.isAuthenticated() is false; otherwise lets /todos requests proceed.
    - Final 404 handler (app.use((_req, res) => res.status(404).send('404 Not Found'))) — Terminal middleware that catches unmatched routes and responds with 404.

## Technical Achievements
- **Tech Achievement 1**: I used OAuth authentication via the GitHub strategy because I thought it was the easiest and most simplistic way to implement an Oauth Authentication. I explained more about my experience with it above^^
- **Tech Achievement 2**: I used Railway for my deployment and I honestly had the most trouble with my deployment. I think the biggest thing with railway is that it wasn't as intuitive as render or other deoployment sites. I will say the pros of it is that it lets you know when deployment is successful and if it isnt, it has a easy debug log to manage. The other pro is that it automatically and quickly redeploys when you push a change to you github! Which that I thought was really cool. 
- **Tech Achievement 3**: Here is an image of my four lighthouse 100's
<img width="1512" height="749" alt="Lighthouse Image" src="https://github.com/user-attachments/assets/27cd4065-9185-4623-a81d-d16be1912c13" />

### Design/Evaluation Achievements
- **Design Achievement 1**: I followed the following tips from the W3C Web Accessibility Initiative and here is each tip that I followed

- Use semantic landmarks : Wrapped the app in <main> and used <form> <ul> and <li> for structure.
- Text alternatives for icons : Replaced decorative icons with inline SVGs and added clear names (e.g., aria-label="Log out").
- Label form fields : Added labels for the task and due date (screen-reader–only).
- Label each checkbox : Each checkbox gets a unique id and a matching <label for="..."> using the task text.
- Visible keyboard focus : Added a clear :focus-visible outline so keyboard users can see focus.
- Respect reduced motion : Confetti animation is disabled when prefers-reduced-motion is enabled.
- Announce status updates : Login messages use aria-live="polite" so errors/success are announced.
- Larger hit targets : Made interactive controls roughly 44×44px for easier tapping.
- Improve color contrast : Ensured high-contrast text/badges; can switch to solid backgrounds if needed.
- Sync control state : Keep aria-checked in sync with the checkbox’s checked property.
- Descriptive button names : Edit/Delete buttons include the task name in their aria-label (e.g., “Delete ‘Buy milk’”).
- Helpful page metadata : Added a concise <meta name="description"> to describe the page.
------
- **Design Achievement 2**: CRAP
    - **Contrast** We use strong contrast to make the right things pop. The bold “To-Do List” title stands out first, then the progress bar and the round count badge. White text sits on a darker, blurred card so it’s easy to read over the photo background. Buttons (Add, Logout, Edit, Delete) have clear shapes, borders, and hover states so they look clickable. The progress bar uses a bright pink fill against a muted track, so progress is obvious at a glance.
    - **Repetition** The app repeats the same look and feel so everything feels connected. We use the same two fonts (Pixelify Sans for headings, Roboto for UI text), the same rounded corners, soft shadows, and glassy borders. Buttons share the same padding and hover effects. The brand pink appears in the progress bar, the count badge, and completed checkmarks to signal “done.” Labels and focus styles are applied the same way across inputs.
    - **Alignment** A simple, centered layout keeps things neat. Inside the main card, items line up on one vertical column. The title, date, and progress block stack cleanly; the progress bar sits right under its heading. Each task row lines up its checkbox, text, and action buttons on one horizontal line. The logout button sits in the top-right corner of the card, easy to find without interrupting the main flow.
    - **Proximity** Related pieces are grouped; unrelated ones are spaced apart. The progress heading, bar, and count badge live together as one section. The add-task input, date picker, and add button sit close to show they’re one action. Each task keeps its checkbox, text, and edit/delete buttons tight, so it’s clear which actions belong to which task. Larger gaps separate major sections so the page doesn’t feel crowded.
