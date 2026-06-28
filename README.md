# VidSnap — Multi-Platform Video Downloader

Download videos from Instagram, YouTube, TikTok, Twitter/X, Facebook, Reddit, and 1000+ platforms.

## Project Structure

```
vidsnap/
├── backend/          ← FastAPI + yt-dlp (deploy to Render)
│   ├── main.py
│   ├── requirements.txt
│   └── render.yaml
└── frontend/         ← React app (deploy to Vercel)
    ├── src/
    │   ├── App.js
    │   ├── App.css
    │   └── index.js
    ├── public/
    │   └── index.html
    ├── package.json
    └── vercel.json
```

---

## Step 1 — Deploy Backend to Render

1. Create a new GitHub repo called `vidsnap-backend`
2. Upload all files from the `backend/` folder to this repo
3. Go to [render.com](https://render.com) → New → Web Service
4. Connect your `vidsnap-backend` GitHub repo
5. Settings:
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Click **Deploy**
7. Wait for deploy to finish → Copy your Render URL (e.g. `https://vidsnap-backend.onrender.com`)

---

## Step 2 — Deploy Frontend to Vercel

1. Create a new GitHub repo called `vidsnap-frontend`
2. Upload all files from the `frontend/` folder to this repo
3. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
4. Before deploying, add this **Environment Variable:**
   - Key: `REACT_APP_API_URL`
   - Value: your Render backend URL (e.g. `https://vidsnap-backend.onrender.com`)
5. Click **Deploy**
6. Your site is live! Share the Vercel URL with anyone.

---

## Features

- Download Reels, Stories, Posts from Instagram
- YouTube videos and Shorts (multiple quality options)
- TikTok, Twitter/X videos
- Facebook, Reddit videos
- 1000+ sites via yt-dlp
- MP4 (1080p, 720p, 480p) + MP3 audio
- Mobile-friendly UI
- No login required

---

## Local Development

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
# Runs on http://localhost:8000
```

### Frontend
```bash
cd frontend
# Create .env file:
echo "REACT_APP_API_URL=http://localhost:8000" > .env
npm install
npm start
# Runs on http://localhost:3000
```

---

## Note
This tool is for personal use only. Always respect copyright laws and the terms of service of the platforms you download from.
