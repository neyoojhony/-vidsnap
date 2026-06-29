from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import yt_dlp
import re
import os

app = FastAPI(title="VidSnap API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

COOKIES_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cookies.txt")

def get_cookies(url: str):
    if os.path.exists(COOKIES_PATH):
        return COOKIES_PATH
    return None

class InfoRequest(BaseModel):
    url: str

def detect_platform(url: str) -> str:
    patterns = {
        "Instagram": r"instagram\.com",
        "YouTube": r"(youtube\.com|youtu\.be)",
        "Twitter/X": r"(twitter\.com|x\.com)",
        "TikTok": r"tiktok\.com",
        "Facebook": r"facebook\.com",
        "Reddit": r"reddit\.com",
    }
    for name, pattern in patterns.items():
        if re.search(pattern, url):
            return name
    return "Video"

@app.get("/")
def root():
    return {"status": "VidSnap API running"}

@app.head("/")
def root_head():
    return {}

@app.post("/api/info")
def get_video_info(req: InfoRequest):
    ck = get_cookies(req.url)
    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        **({"cookiefile": ck} if ck else {}),
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(req.url, download=False)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not fetch video: {str(e)}")

    title = info.get("title", "Video")
    thumbnail = info.get("thumbnail", "")
    duration = info.get("duration")
    platform = detect_platform(req.url)

    formats_raw = info.get("formats", [])
    seen_heights = set()
    formats = []

    available_heights = set()
    for f in formats_raw:
        h = f.get("height")
        if h:
            available_heights.add(h)

    for q_label, height in [("1080p", 1080), ("720p", 720), ("480p", 480), ("360p", 360), ("240p", 240)]:
        if height in available_heights and height not in seen_heights:
            seen_heights.add(height)
            formats.append({
                "format_id": f"bestvideo[height<={height}]+bestaudio/best[height<={height}]",
                "label": f"MP4 — {q_label}",
                "ext": "mp4",
                "filesize_mb": None,
            })

    if not formats:
        for q_label, fmt in [("Best quality", "bestvideo+bestaudio/best"), ("Medium quality", "bestvideo[height<=720]+bestaudio/best[height<=720]"), ("Low quality", "bestvideo[height<=480]+bestaudio/best[height<=480]")]:
            formats.append({
                "format_id": fmt,
                "label": f"MP4 — {q_label}",
                "ext": "mp4",
                "filesize_mb": None,
            })

    formats.append({
        "format_id": "bestaudio/best",
        "label": "MP3 — Audio only",
        "ext": "mp3",
        "filesize_mb": None,
    })

    return {
        "title": title,
        "thumbnail": thumbnail,
        "duration": duration,
        "platform": platform,
        "formats": formats[:5],
    }


@app.get("/api/download")
def download_video(url: str = Query(...), format_id: str = Query("best")):
    import tempfile, pathlib

    tmp_dir = tempfile.mkdtemp()
    out_template = os.path.join(tmp_dir, "%(title)s.%(ext)s")

    ck = get_cookies(url)
    is_audio_only = (format_id == "bestaudio/best")

    if is_audio_only:
        actual_format = "bestaudio/best"
        postprocessors = [{"key": "FFmpegExtractAudio", "preferredcodec": "mp3"}]
    else:
        actual_format = "bestvideo+bestaudio/best"
        postprocessors = []

    ydl_opts = {
        "format": actual_format,
        "outtmpl": out_template,
        "quiet": True,
        "no_warnings": True,
        "merge_output_format": "mp4",
        "postprocessors": postprocessors,
        **({"cookiefile": ck} if ck else {}),
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    files = list(pathlib.Path(tmp_dir).iterdir())
    if not files:
        raise HTTPException(status_code=500, detail="Download failed")

    filepath = files[0]
    ext = filepath.suffix.lstrip(".")
    safe_title = re.sub(r'[^\w\s-]', '', info.get("title", "video"))[:60].strip()
    download_name = f"{safe_title}.{ext}"

    def file_stream():
        with open(filepath, "rb") as f:
            while chunk := f.read(1024 * 64):
                yield chunk
        try:
            filepath.unlink()
            pathlib.Path(tmp_dir).rmdir()
        except Exception:
            pass

    media_type = "video/mp4" if ext == "mp4" else "audio/mpeg" if ext == "mp3" else "application/octet-stream"

    return StreamingResponse(
        file_stream(),
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{download_name}"'},
    )
