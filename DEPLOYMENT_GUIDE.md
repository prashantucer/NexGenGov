# 🚀 NexGenGov Deployment Guide (Render + Vercel)

Complete step-by-step guide to deploy your **FastAPI Backend on Render** and **React/Vite Frontend on Vercel**.

---

## 🟢 Part 1: Deploy Backend to Render (First)

### Step 1: Push Project to GitHub
Push your project repository to GitHub if you haven't already.

### Step 2: Create Web Service on Render
1. Go to **[dashboard.render.com](https://dashboard.render.com)** and log in.
2. Click **New +** → **Web Service**.
3. Connect your GitHub repository.
4. Fill in the following settings:

| Setting | Value |
|---|---|
| **Name** | `nexgengov-backend` (or your choice) |
| **Region** | Singapore / Frankfurt / Oregon (closest to you) |
| **Branch** | `main` (or `master`) |
| **Root Directory** | `NexGenGov-main/backend` *(or `backend` if repo root is the inner folder)* |
| **Runtime** | `Python 3` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| **Instance Type** | Free |

### Step 3: Add Environment Variables (Optional)
Under **Environment Variables**, add:
- `PYTHON_VERSION` = `3.11.0`
- `GEMINI_API_KEY` = `your_gemini_api_key` *(Optional, for AI multi-modal vision)*

### Step 4: Deploy & Copy URL
Click **Deploy Web Service**. Once deployed, copy your Render URL:
> Example: `https://nexgengov-backend.onrender.com`

Test it by visiting the URL in your browser — you should see:
```json
{
  "status": "healthy",
  "service": "NexGenGov Autonomous Governance Intelligence API",
  "version": "1.0.0"
}
```

---

## 🔵 Part 2: Deploy Frontend to Vercel

### Step 1: Import Project to Vercel
1. Go to **[vercel.com](https://vercel.com)** and log in.
2. Click **Add New...** → **Project**.
3. Select your GitHub repository.

### Step 2: Configure Project Settings
In the configuration screen, set:

| Setting | Value |
|---|---|
| **Framework Preset** | `Vite` |
| **Root Directory** | Click *Edit* and choose `NexGenGov-main/frontend` *(or `frontend`)* |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |

### Step 3: Add Environment Variable
Expand the **Environment Variables** section and add:

- **Key:** `VITE_API_BASE_URL`
- **Value:** `https://nexgengov-backend.onrender.com` *(Paste your actual Render backend URL from Part 1 without trailing slash)*

### Step 4: Deploy!
Click **Deploy**. In ~30 seconds, your site will be live on Vercel with full backend connectivity! 🎉

---

## 💡 Important Note on Render Free Tier
> Render free tier web services spin down after 15 minutes of inactivity. When you open the frontend after a period of inactivity, the first request might take ~30-50 seconds while Render wakes up the backend. Subsequent requests will be instant!
