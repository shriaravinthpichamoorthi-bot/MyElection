# Setup & Test Guide (For Dummies)

> Everything you need to get the TN Election app running with **Supabase** and verify it actually works.

---

## What You Need Before Starting

- [ ] A **Supabase** account (free at [supabase.com](https://supabase.com))
- [ ] **Node.js** installed (for the frontend)
- [ ] **Python 3.12** installed (for the backend)
- [ ] This project folder open in your terminal

---

## Part 1: Create Your Supabase Database

### Step 1.1 — Make a Project
1. Go to [supabase.com](https://supabase.com) and sign in.
2. Click **New Project**.
3. Give it a name like `tn-election-2026`.
4. Choose a region close to you (e.g., `Singapore` or `Mumbai`).
5. Set a database password (save it somewhere — you won’t need it often).
6. Wait ~2 minutes for it to spin up.

### Step 1.2 — Create the Tables
1. In your Supabase project, click **SQL Editor** on the left sidebar.
2. Click **New Query**.
3. Copy and paste this entire block:

```sql
create table live_meta (
  id int primary key default 1,
  status text default 'awaiting',
  declared int default 0,
  counting int default 0,
  awaiting int default 234,
  last_updated timestamptz,
  party_tally jsonb default '{}',
  alliance_tally jsonb default '{}',
  constraint single_row check (id = 1)
);

create table live_constituencies (
  id text primary key,
  name text not null,
  status text default 'awaiting',
  round int,
  leading_candidate text,
  leading_party text,
  leading_alliance text,
  trailing_candidate text,
  trailing_party text,
  margin int default 0,
  margin_pct float default 0,
  total_votes int,
  total_electors int,
  turnout float,
  candidates jsonb default '[]',
  last_updated timestamptz
);

alter table live_meta enable row level security;
alter table live_constituencies enable row level security;

create policy "Allow anon read" on live_meta for select to anon using (true);
create policy "Allow anon read" on live_constituencies for select to anon using (true);
create policy "Allow anon write" on live_meta for all to anon using (true) with check (true);
create policy "Allow anon write" on live_constituencies for all to anon using (true) with check (true);
```

4. Click **Run**.
5. You should see green checkmarks. If you see red errors, make sure you pasted the whole thing.

**Expected result:** Two tables exist: `live_meta` and `live_constituencies`.

---

## Part 2: Get Your Supabase Keys

1. In Supabase, click **Project Settings** (gear icon at the bottom left).
2. Click **API**.
3. You will see two important values:
   - **URL** — looks like `https://abcdefgh12345678.supabase.co`
   - **service_role key** — starts with `eyJ...` (it says "secret" — this is the one you want)

4. Copy both.

---

## Part 3: Connect the App to Supabase

### Step 3.1 — Create a `.env` file

Inside your `server/` folder, create a file named `.env`:

```bash
SUPABASE_URL=https://your-project-url.supabase.co
SUPABASE_KEY=eyJ-your-service-role-key-here
```

**Replace the values** with your actual URL and key from Step 2.

> ⚠️ **Use the service_role key, NOT the anon key.** The service role key lets the backend write data. The anon key is for browsers and is blocked from writing by default.

---

## Part 4: Install Dependencies

### Backend

Open a terminal in your project folder and run:

```powershell
cd server
pip install -r requirements.txt
```

**Expected result:** A bunch of packages install. No red errors at the end.

### Frontend

Open a **second** terminal (keep the first one open) and run:

```powershell
npm install
```

**Expected result:** `node_modules` folder is created. No red errors.

---

## Part 5: Start Everything

### Start the Backend

In the `server` terminal:

```powershell
uvicorn main:app --reload --port 8000
```

**Expected result:**
```
INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
INFO:     Starting up...
INFO:     Supabase not configured or empty — starting with empty cache
INFO:     Starting browser (headless=False)
INFO:     MOCK DATA INJECTED FOR TESTING
INFO:     Saved live_meta to Supabase
INFO:     Saved 2 constituencies to Supabase
INFO:     Scheduler started: refresh every 5 minutes
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000
```

> If you see `Supabase not configured or empty`, double-check your `.env` file is inside the `server/` folder and has the correct values.

### Start the Frontend

In the second terminal (project root):

```powershell
npm run dev
```

**Expected result:**
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  press h + enter to show help
```

---

## Part 6: Test the Alliance Filter Fix

1. Open your browser to `http://localhost:5173/live`.
2. You should see the **Live Dashboard** with a green "Counting in Progress" banner.
3. Scroll down to the stacked bar chart.
4. Click **DMK Alliance**.

**Expected result:** You are taken to `http://localhost:5173/live/constituencies?alliance=DMK%20Alliance` and you see:
- A table with constituencies listed
- At least **Gummidipoondi** and **Ponneri** (the mock data)
- Plus any other constituency where DMK has a candidate

5. Go back to the dashboard and click **AIADMK**.

**Expected result:** You see constituencies where AIADMK has a candidate (from the static nomination data).

> Before this fix, clicking some alliances (like AMMK, TVK, or IND) showed an empty table. Now it correctly searches **all candidates** in each constituency.

---

## Part 7: Test Supabase Persistence (The Magic Part)

This test proves that if your server restarts, **you don’t lose data**.

### Step 7.1 — Verify data is in Supabase

1. Go back to Supabase in your browser.
2. Click **Table Editor** on the left.
3. Click `live_constituencies`.

**Expected result:** You see 2 rows:
| id | name | status | leading_alliance |
|---|---|---|---|
| 1 | Gummidipoondi | counting | DMK Alliance |
| 2 | Ponneri | declared | DMK Alliance |

4. Click `live_meta`.

**Expected result:** One row with `status = counting`, `declared = 1`, `counting = 1`.

### Step 7.2 — Kill and restart the backend

1. In your backend terminal, press `Ctrl + C` to stop the server.
2. Start it again:

```powershell
uvicorn main:app --reload --port 8000
```

**Expected result:**
```
INFO:     Starting up...
INFO:     Hydrated cache from Supabase: 2 constituencies
INFO:     Starting browser (headless=False)
...
```

Notice it now says **"Hydrated cache from Supabase"** instead of "empty cache".

3. Refresh your frontend browser (`http://localhost:5173/live`).

**Expected result:** The green banner and mock data are still there — **even though you restarted the server**.

---

## Part 8: Test the API Directly

Open these URLs in your browser and check the JSON:

| URL | What to look for |
|---|---|
| `http://localhost:8000/health` | `"status": "ok"` and `"cache_count": 2` |
| `http://localhost:8000/results/summary` | `"party_tally": {"DMK": 2, ...}` |
| `http://localhost:8000/results/constituencies` | Two constituency objects inside `"constituencies"` |

---

## Troubleshooting

### "Supabase not configured or empty"
- Your `.env` file is probably missing or in the wrong folder.
- Make sure `.env` is inside `server/` (next to `main.py`).
- Make sure the variable names are exactly `SUPABASE_URL` and `SUPABASE_KEY`.

### "Failed to save results to Supabase"
- Check that you used the **service_role key** (not the anon key).
- Check that you ran the SQL in Step 1.2 to create the tables.
- Check your internet connection.

### Alliance filter still shows empty table
- Make sure the frontend dev server is running (`npm run dev`).
- Hard-refresh the browser (`Ctrl + F5`).
- Check the browser console (F12 → Console) for red errors.

### Backend crashes on startup
- Make sure you ran `pip install -r requirements.txt` after the Supabase changes.
- Make sure you have the `.env` file with valid keys.

---

## Quick Checklist

- [ ] Created Supabase project
- [ ] Ran SQL to create tables
- [ ] Copied URL and service_role key
- [ ] Created `server/.env` with both values
- [ ] Ran `pip install -r requirements.txt`
- [ ] Ran `npm install`
- [ ] Started backend with `uvicorn main:app --reload --port 8000`
- [ ] Started frontend with `npm run dev`
- [ ] Clicked an alliance on dashboard → saw constituencies
- [ ] Checked Supabase Table Editor → saw 2 rows
- [ ] Restarted backend → saw "Hydrated cache from Supabase"
- [ ] Frontend still showed data after restart

**If all boxes are checked, you’re ready for election day.** 🗳️
