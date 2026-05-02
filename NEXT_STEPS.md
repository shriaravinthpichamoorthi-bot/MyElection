# 🚀 Production Deployment Guide — Idiot-Proof Edition

> Follow this exactly. Do not skip steps. If something breaks, check the **"If This Doesn't Work"** section after each step.

---

## ✅ Pre-Flight Checklist (Do This First)

Before you start deployment, confirm ALL of these:

- [ ] You have a **GitHub account** and the `myelection` repo is pushed (not just local)
- [ ] You know your **Vercel website URL** (looks like `https://myelection.vercel.app`)
- [ ] You have a **credit/debit card** for Railway ($5–10/month)
- [ ] Your `server/.env` file has valid `SUPABASE_URL` and `SUPABASE_KEY` (if using Supabase persistence)
- [ ] You are on a computer where you can open **GitHub Desktop** or run `git` commands

**If any box is unchecked, stop here and fix it first.**

---

## 📋 The Big Picture

```
Your Laptop ──push──► GitHub ──deploy──► Railway (backend + scraper)
                                              │
                                              ▼ HTTPS
                                        Vercel (frontend website)
                                              │
                                              ▼
                                        Visitors see live results
```

**You will do this exactly once.** After that, everything runs automatically.

---

## Step 1: Push to GitHub

### What to Do
1. Open **GitHub Desktop**
2. You should see modified files in the left panel
3. Write this exact commit message:
   ```
   Add live election results backend and Bihar multi-state support
   ```
4. Click **Commit to new-ui**
5. Click **Push origin**

### If This Doesn't Work
| Problem | Fix |
|---------|-----|
| "Authentication failed" | Sign out and sign back into GitHub Desktop |
| "Merge conflict" | In GitHub Desktop, click **Repository → Open in Command Prompt**, then type: `git pull origin new-ui` then `git push origin new-ui` |
| Files not showing | Make sure you're in the `myelection` folder, not a subfolder |

### ✅ Verify
Open `https://github.com/your-username/myelection` in your browser. You should see the `server/` folder and `Dockerfile` in the file list.

---

## Step 2: Create Railway Account

### What to Do
1. Go to **[railway.app](https://railway.app)**
2. Click **"Start a New Project"** or **"Deploy New Project"**
3. Click **"Deploy from GitHub repo"**
4. Sign in with your **GitHub account**
5. When GitHub asks for permissions, click **"Authorize Railway"**
6. Find and select your **`myelection`** repository

### If This Doesn't Work
| Problem | Fix |
|---------|-----|
| Railway can't see your repo | Go to GitHub → Settings → Applications → Railway → "Repository access" → add `myelection` |
| "No Dockerfile found" error | Make sure `Dockerfile` (no extension) is in the **root** of your repo, not inside `server/` |

### ✅ Verify
Railway shows a green "Building..." message. Wait 3–5 minutes.

---

## Step 3: Add Railway Environment Variables

This is **the most important step**. Get every variable exactly right.

### What to Do
1. In Railway, click your project
2. Click the **"Variables"** tab
3. Click **"New Variable"** — add each one below:

```
Name:  CORS_ORIGIN
Value: https://your-vercel-app.vercel.app
```
(Replace `your-vercel-app` with your actual Vercel URL. Keep the `https://` part.)

```
Name:  STATE_CODE
Value: S22
```

```
Name:  STATE_NAME
Value: tamil nadu
```

```
Name:  TOTAL_CONSTITUENCIES
Value: 234
```

```
Name:  HEADLESS
Value: false
```

```
Name:  ADMIN_SECRET
Value: (make up a long random password, like "my-secret-2026-tn-election")
```

```
Name:  SUPABASE_URL
Value: https://your-project.supabase.co
```
(Only if using Supabase. Get this from Supabase → Project Settings → API.)

```
Name:  SUPABASE_KEY
Value: eyJ... (your service_role key)
```
(Only if using Supabase. Get this from Supabase → Project Settings → API. **Use the service_role key, NOT the anon key.**)

### If This Doesn't Work
| Problem | Fix |
|---------|-----|
| "Invalid variable name" | Don't use spaces. Use underscores. |
| Not sure what your Vercel URL is | Go to vercel.com → your project. The URL is at the top. |
| Supabase variables not working | Make sure you created the tables using the SQL in `SETUP_AND_TEST.md` |

### ✅ Verify
Click the **"Deployments"** tab. Railway should auto-redeploy with the new variables. Wait for the green checkmark.

---

## Step 4: Get Your Railway URL

### What to Do
1. In Railway, look at the top of your project page
2. You see a URL like: `https://myelection-api.up.railway.app`
3. **Copy this URL exactly** (include the `https://`)
4. Open it in a new browser tab and add `/health` to the end:
   ```
   https://myelection-api.up.railway.app/health
   ```

### ✅ Verify
You should see JSON like:
```json
{"status": "ok", "cache_count": 0, "declared": 0}
```

### If This Doesn't Work
| Problem | Fix |
|---------|-----|
| "Application failed to start" | Click **"Deployments"** tab → click the failed deployment → read the red error logs. Most likely: missing env var or Supabase table doesn't exist. |
| "404 Not Found" | Wait 2 more minutes. Railway might still be starting. |
| "Connection timed out" | Railway free tier puts services to sleep. This is normal. It will wake up on the next request. |
| Blank page | Try adding `/results/summary` instead. If that works too, your API is healthy. |

---

## Step 5: Connect Vercel to Railway

### What to Do
1. Go to **[vercel.com](https://vercel.com)**
2. Click your project
3. Click **"Settings"** (tab at the top)
4. Click **"Environment Variables"** in the left sidebar
5. Click **"New"**
6. Fill in:
   ```
   Name:  VITE_API_URL
   Value: https://your-railway-url.up.railway.app
   ```
   (Paste the Railway URL from Step 4.)
7. Click **Save**

### ✅ Verify
The variable appears in the list.

---

## Step 6: Redeploy Vercel

### What to Do
1. In Vercel, click the **"Deployments"** tab
2. Click the top (latest) deployment
3. Click the **"Redeploy"** button (looks like a circular arrow)
4. Click **"Use existing Build Cache" = YES**
5. Wait ~1 minute

### ✅ Verify
1. Visit your Vercel website
2. Go to `/live` (or `/bihar/live` for Bihar testing)
3. Open browser **Developer Tools** (press F12)
4. Click the **Network** tab
5. You should see requests to your Railway URL every 30–60 seconds
6. The response shows `{"status": "ok"}`

### If This Doesn't Work
| Problem | Fix |
|---------|-----|
| "Failed to compile" | Click the failed deployment → read the build log. Usually a missing import or syntax error. |
| No network requests to Railway | Check that `VITE_API_URL` was saved correctly in Vercel settings. It must include `https://`. |
| CORS errors in browser console | Your `CORS_ORIGIN` in Railway doesn't match your Vercel URL. Fix it in Railway Variables and redeploy Railway. |
| "cache_count": 0 | This is normal before election day. It means the scraper found no live data yet. |

---

## Step 7: Keep Railway Awake (Free Tier Only)

Railway's free tier sleeps after 15 minutes of no traffic. This kills your scraper.

### What to Do
1. Go to **[cron-job.org](https://cron-job.org)**
2. Create a free account
3. Click **"Create cronjob"**
4. Fill in:
   - **Title:** `TN Election API Keep Alive`
   - **Address:** `https://your-railway-url.up.railway.app/health`
   - **Schedule:** Every 10 minutes
5. Click **Create**

### ✅ Verify
After 15 minutes, visit your Railway `/health` URL. It should still respond instantly (not take 5+ seconds to wake up).

---

## 🎯 Pre-Election Day Test

Do this **at least 3 days before** the election.

1. Visit your website → `/live`
2. Confirm the "Results will appear here on election day" banner shows
3. Confirm the nomination data loads (alliance bars, candidate counts)
4. Open DevTools → Network → confirm polling requests to Railway every ~60s
5. Click a few constituencies → confirm they show candidate lists
6. Visit `/live/constituencies` → confirm table loads with all 234 rows

If any of these fail, fix them **now**. Do not wait until election morning.

---

## 🗳️ Election Day (May 4, 2026)

### What Happens Automatically
- Railway fetches ECI data every 5 minutes
- Vercel polls Railway every 30–60 seconds
- Visitors see live updates instantly

### What You Do
**Nothing.** Just monitor.

### How to Monitor
1. Open Railway dashboard → **"Logs"** tab
2. Look for lines like: `Refresh complete: 234 constituencies, 120 declared, 114 counting`
3. Green = good. Red = problem.

### If Something Goes Wrong

| Problem | What You See | Fix |
|---------|-------------|-----|
| ECI blocks Railway | Red `403` errors in Railway logs | Wait 30 minutes. ECI often removes blocks after traffic spike. Do NOT panic-redeploy. |
| CAPTCHA appears | Logs say "Access Denied" or show CAPTCHA HTML | Click **"Redeploy"** in Railway to restart browser. Or run scraper locally (see Emergency Fallback below). |
| Data is stale (>10 min old) | `last_updated` is old | Visit `https://your-railway-url.up.railway.app/admin/refresh` in browser. Enter your `ADMIN_SECRET` if prompted. |
| Service crashed | Logs stop completely | Railway auto-restarts within 1 minute. Check Logs tab. |
| Railway is completely dead | Can't open `/health` at all | Use Emergency Fallback below. |

### Emergency Fallback (If Railway Is Completely Blocked)

1. On your laptop, open a terminal
2. Run:
   ```bash
   cd server
   pip install -r requirements.txt
   playwright install chromium
   ```
3. Run the scraper manually:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
4. A Chrome window opens. Solve any CAPTCHA manually.
5. The scraper will fetch data. Your local backend is now running on `http://localhost:8000`.
6. Temporarily change your Vercel `VITE_API_URL` to point to your laptop (use ngrok or similar if needed).
7. **Remember to change it back after the election.**

---

## 🔒 Post-Election (After May 4, 2026)

### Stop Paying Railway
1. Go to Railway dashboard
2. Click your project → **"Settings"**
3. Scroll down → click **"Delete Project"**
4. Billing stops immediately

### Remove Live API Connection (Optional)
1. Go to Vercel → your project → **Settings → Environment Variables**
2. Delete `VITE_API_URL`
3. Go to **Deployments** → **Redeploy**
4. Website reverts to showing nomination data only

### Keep for Future Elections
- Leave Railway running
- Next election, the scraper auto-discovers the new election folder
- Zero code changes needed

---

## 🚨 Common Mistakes (Read This!)

| Mistake | Why It Breaks | How to Fix |
|---------|--------------|-----------|
| Forgot `https://` in `CORS_ORIGIN` | Browser blocks all API requests | Add `https://` and redeploy Railway |
| Used `anon` key instead of `service_role` key for Supabase | Backend can't write data | Get the `service_role` key from Supabase |
| `STATE_CODE` is wrong | Scraper hits wrong ECI pages | TN = `S22`, Bihar = `S04` |
| `HEADLESS=true` | ECI blocks invisible browsers | Set `HEADLESS=false` |
| Didn't set `CORS_ORIGIN` at all | API works but browser shows CORS errors | Set it to your exact Vercel URL |
| Forgot cron-job.org | Railway sleeps, data goes stale | Set up the cronjob! |
| Changed env var but didn't redeploy | Changes don't take effect | Redeploy after EVERY variable change |

---

## 📇 One-Page Cheat Sheet

| Step | Where | What |
|------|-------|------|
| Push code | GitHub Desktop | Commit + Push |
| Deploy backend | railway.app | New Project → GitHub repo |
| Add env vars | railway.app → Variables | CORS_ORIGIN, STATE_CODE, HEADLESS, ADMIN_SECRET |
| Get backend URL | railway.app (top of page) | Copy `https://...up.railway.app` |
| Add frontend env | vercel.com → Settings → Environment Variables | `VITE_API_URL` = Railway URL |
| Redeploy frontend | vercel.com → Deployments → Redeploy | Wait 1 min |
| Keep awake | cron-job.org | Ping `/health` every 10 min |

| URL | Purpose |
|-----|---------|
| `https://your-railway-url.up.railway.app/health` | Is backend alive? |
| `https://your-railway-url.up.railway.app/results/summary` | Seat tally |
| `https://your-railway-url.up.railway.app/results/constituencies` | All 234 constituencies |
| `https://your-railway-url.up.railway.app/config` | Current backend settings |
| `https://your-railway-url.up.railway.app/admin/refresh` | Force refresh (needs ADMIN_SECRET) |

| Cost | |
|------|---|
| Railway (1 month) | ~$5–10 |
| Vercel | $0 |
| cron-job.org | $0 |
| **Total** | **~$5–10** |

---

## 🆘 Still Stuck?

1. Read `ARCHITECTURE.md` for technical details
2. Read `CONFIG.md` for environment variable reference
3. Read `SETUP_AND_TEST.md` for local testing instructions
4. Take a screenshot of Railway **Logs** tab and ask for help
