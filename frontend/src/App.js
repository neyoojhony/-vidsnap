import React, { useState, useEffect, useRef } from "react";
import "./App.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";
const HISTORY_KEY = "vidsnap_history";
const MAX_HISTORY = 10;

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

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function App() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [videoInfo, setVideoInfo] = useState(null);
  const [selectedFormat, setSelectedFormat] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const progressInterval = useRef(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      if (saved) setHistory(JSON.parse(saved));
    } catch (e) {}
  }, []);

  function saveToHistory(urlVal, info) {
    const entry = {
      url: urlVal,
      title: info.title,
      thumbnail: info.thumbnail,
      platform: info.platform,
      ts: Date.now(),
    };
    setHistory((prev) => {
      const filtered = prev.filter((h) => h.url !== urlVal);
      const updated = [entry, ...filtered].slice(0, MAX_HISTORY);
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(updated)); } catch (e) {}
      return updated;
    });
  }

  function clearHistory() {
    setHistory([]);
    try { localStorage.removeItem(HISTORY_KEY); } catch (e) {}
  }

  function startProgress() {
    setProgress(0);
    setProgressLabel("Connecting to server...");
    let current = 0;
    const stages = [
      { target: 15, speed: 80, label: "Connecting to server..." },
      { target: 35, speed: 60, label: "Fetching video..." },
      { target: 60, speed: 40, label: "Processing video..." },
      { target: 80, speed: 30, label: "Preparing download..." },
      { target: 90, speed: 50, label: "Almost done..." },
    ];
    let stageIdx = 0;

    clearInterval(progressInterval.current);
    progressInterval.current = setInterval(() => {
      const stage = stages[stageIdx];
      if (!stage) return;
      if (current < stage.target) {
        current += 0.5;
        setProgress(Math.min(current, stage.target));
        setProgressLabel(stage.label);
      } else {
        stageIdx++;
      }
    }, 50);
  }

  function finishProgress() {
    clearInterval(progressInterval.current);
    setProgress(100);
    setProgressLabel("Download complete! ✓");
    setTimeout(() => {
      setProgress(0);
      setProgressLabel("");
    }, 2000);
  }

  function resetProgress() {
    clearInterval(progressInterval.current);
    setProgress(0);
    setProgressLabel("");
  }

  async function handleFetch(fetchUrl) {
    const target = (fetchUrl || url).trim();
    if (!target) return;
    setUrl(target);
    setLoading(true);
    setError("");
    setVideoInfo(null);
    setSelectedFormat(null);
    setShowHistory(false);

    try {
      const res = await fetch(`${API_URL}/api/info`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Could not fetch video info");
      }
      const data = await res.json();
      setVideoInfo(data);
      setSelectedFormat(data.formats[0]?.format_id || null);
      saveToHistory(target, data);
    } catch (e) {
      setError(e.message || "Something went wrong. Check the URL and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload() {
    if (!videoInfo || !selectedFormat) return;
    setDownloading(true);
    setError("");
    startProgress();

    try {
      const params = new URLSearchParams({ url: url.trim(), format_id: selectedFormat });
      const res = await fetch(`${API_URL}/api/download?${params}`);
      if (!res.ok) throw new Error("Download failed");

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="(.+?)"/);
      const filename = match ? match[1] : "vidsnap_download.mp4";

      finishProgress();

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (e) {
      resetProgress();
      setError("Download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div className="logo">Vid<span>Snap</span></div>
        <p className="tagline">Download videos from anywhere — free, fast, no login needed</p>
      </header>

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
              onChange={(e) => { setUrl(e.target.value); setShowHistory(e.target.value === "" && history.length > 0); }}
              onFocus={() => { if (!url && history.length > 0) setShowHistory(true); }}
              onBlur={() => setTimeout(() => setShowHistory(false), 150)}
              onKeyDown={(e) => e.key === "Enter" && handleFetch()}
            />
            <button className="btn-fetch" onClick={() => handleFetch()} disabled={loading || !url.trim()}>
              {loading ? <span className="spinner" /> : "Get Video"}
            </button>
          </div>

          {showHistory && history.length > 0 && (
            <div className="history-dropdown">
              <div className="history-header">
                <span>Recent</span>
                <button className="history-clear" onClick={clearHistory}>Clear all</button>
              </div>
              {history.map((h) => (
                <div key={h.url} className="history-item" onMouseDown={() => handleFetch(h.url)}>
                  {h.thumbnail && <img src={h.thumbnail} alt="" className="history-thumb" />}
                  <div className="history-info">
                    <div className="history-title">{h.title}</div>
                    <div className="history-meta">{h.platform} · {timeAgo(h.ts)}</div>
                  </div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" className="history-arrow">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              ))}
            </div>
          )}

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
                {videoInfo.duration && <span className="duration">{formatDuration(videoInfo.duration)}</span>}
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
                    {f.filesize_mb && <span className="fmt-size">~{f.filesize_mb} MB</span>}
                  </button>
                ))}
              </div>

              {/* Progress Bar */}
              {downloading && (
                <div className="progress-wrap">
                  <div className="progress-info">
                    <span className="progress-label">{progressLabel}</span>
                    <span className="progress-pct">{Math.round(progress)}%</span>
                  </div>
                  <div className="progress-track">
                    <div
                      className={`progress-fill ${progress === 100 ? "complete" : ""}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              <button className="btn-download" onClick={handleDownload} disabled={downloading}>
                {downloading ? (
                  <><span className="spinner white" />Downloading…</>
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

        {!videoInfo && !loading && history.length > 0 && (
          <section className="history-section">
            <div className="history-section-header">
              <h3>Recent downloads</h3>
              <button className="history-clear" onClick={clearHistory}>Clear all</button>
            </div>
            <div className="history-list">
              {history.map((h) => (
                <div key={h.url} className="history-card" onClick={() => handleFetch(h.url)}>
                  {h.thumbnail && <img src={h.thumbnail} alt="" className="history-card-thumb" />}
                  <div className="history-card-info">
                    <div className="history-card-title">{h.title}</div>
                    <div className="history-card-meta">{h.platform} · {timeAgo(h.ts)}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {!videoInfo && !loading && history.length === 0 && (
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

      <footer className="footer">VidSnap — for personal use only. Respect copyright laws.</footer>
    </div>
  );
}
