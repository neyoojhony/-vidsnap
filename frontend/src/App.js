import React, { useState } from "react";
import "./App.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const PLATFORMS = [
  { name: "Instagram", color: "#E1306C" },
  { name: "YouTube", color: "#FF0000" },
  { name: "Twitter / X", color: "#1DA1F2" },
  { name: "TikTok", color: "#010101" },
  { name: "Facebook", color: "#1877F2" },
  { name: "Reddit", color: "#FF4500" },
];

function formatDuration(secs) {
  if (!secs) return null;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function App() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [videoInfo, setVideoInfo] = useState(null);
  const [selectedFormat, setSelectedFormat] = useState(null);
  const [downloading, setDownloading] = useState(false);

  async function handleFetch() {
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    setVideoInfo(null);
    setSelectedFormat(null);

    try {
      const res = await fetch(`${API_URL}/api/info`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Could not fetch video info");
      }
      const data = await res.json();
      setVideoInfo(data);
      setSelectedFormat(data.formats[0]?.format_id || null);
    } catch (e) {
      setError(e.message || "Something went wrong. Check the URL and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload() {
    if (!videoInfo || !selectedFormat) return;
    setDownloading(true);
    try {
      const params = new URLSearchParams({ url: url.trim(), format_id: selectedFormat });
      const res = await fetch(`${API_URL}/api/download?${params}`);
      if (!res.ok) throw new Error("Download failed");

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="(.+?)"/);
      const filename = match ? match[1] : "vidsnap_download.mp4";

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (e) {
      setError("Download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="logo">
          Vid<span>Snap</span>
        </div>
        <p className="tagline">Download videos from anywhere — free, fast, no login needed</p>
      </header>

      {/* Input Section */}
      <main className="main">
        <section className="input-section">
          <div className="input-wrap">
            <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            <input
              className="url-input"
              type="url"
              placeholder="Paste Instagram, YouTube, TikTok or any video link..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleFetch()}
            />
            <button
              className="btn-fetch"
              onClick={handleFetch}
              disabled={loading || !url.trim()}
            >
              {loading ? (
                <span className="spinner" />
              ) : (
                "Get Video"
              )}
            </button>
          </div>

          {/* Platform pills */}
          <div className="platforms">
            {PLATFORMS.map((p) => (
              <div className="pill" key={p.name}>
                <span className="pill-dot" style={{ background: p.color }} />
                {p.name}
              </div>
            ))}
            <div className="pill muted">+ 1000 more</div>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="error-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        {/* Video Info Card */}
        {videoInfo && (
          <section className="result-card">
            <div className="result-thumb">
              {videoInfo.thumbnail ? (
                <img src={videoInfo.thumbnail} alt="thumbnail" />
              ) : (
                <div className="thumb-placeholder">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </div>
              )}
            </div>

            <div className="result-body">
              <div className="result-meta-top">
                <span className="platform-badge">{videoInfo.platform}</span>
                {videoInfo.duration && (
                  <span className="duration">{formatDuration(videoInfo.duration)}</span>
                )}
              </div>
              <h2 className="result-title">{videoInfo.title}</h2>

              <p className="format-label">Choose quality</p>
              <div className="format-grid">
                {videoInfo.formats.map((f) => (
                  <button
                    key={f.format_id}
                    className={`format-btn ${selectedFormat === f.format_id ? "selected" : ""}`}
                    onClick={() => setSelectedFormat(f.format_id)}
                  >
                    <span className="fmt-label">{f.label}</span>
                    {f.filesize_mb && (
                      <span className="fmt-size">~{f.filesize_mb} MB</span>
                    )}
                  </button>
                ))}
              </div>

              <button
                className="btn-download"
                onClick={handleDownload}
                disabled={downloading}
              >
                {downloading ? (
                  <>
                    <span className="spinner white" />
                    Downloading…
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download now
                  </>
                )}
              </button>
            </div>
          </section>
        )}

        {/* Features */}
        {!videoInfo && !loading && (
          <section className="features">
            {[
              { icon: "⚡", title: "Fast & free", desc: "No subscription. No limits. Just paste and download." },
              { icon: "📱", title: "Works on mobile", desc: "Use directly from your phone browser, no app needed." },
              { icon: "🔒", title: "No login needed", desc: "We don't ask for your account or password. Ever." },
              { icon: "🌐", title: "1000+ platforms", desc: "Instagram, YouTube, TikTok, Twitter, Facebook and more." },
            ].map((f) => (
              <div className="feat-card" key={f.title}>
                <div className="feat-icon">{f.icon}</div>
                <div className="feat-title">{f.title}</div>
                <div className="feat-desc">{f.desc}</div>
              </div>
            ))}
          </section>
        )}
      </main>

      <footer className="footer">
        VidSnap — for personal use only. Respect copyright laws.
      </footer>
    </div>
  );
}
