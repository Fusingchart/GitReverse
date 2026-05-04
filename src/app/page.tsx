'use client';

import { useState } from 'react';

interface CommitSchedule {
  file: string;
  date: string;
  message: string;
}

export default function Home() {
  const [sourcePath, setSourcePath] = useState('');
  const [targetPath, setTargetPath] = useState('');
  const [remoteUrl, setRemoteUrl] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [schedule, setSchedule] = useState<CommitSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handlePreview = async () => {
    if (!sourcePath || !startDate) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourcePath, targetPath, startDate }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSchedule(data.schedule);
      if (data.fileCount === 0 && data.totalFiles > 0) {
        setSuccess('All files are already present in target.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!sourcePath || !targetPath || !startDate) return;
    setGenerating(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourcePath, targetPath, startDate, remoteUrl, authorName, authorEmail }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSuccess(data.message);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerating(false);
    }
  };

  const uniqueDays = new Set(schedule.map(c => new Date(c.date).toDateString())).size;

  return (
    <div className="app-wrapper">
      <div className="app-container">
        {/* ── Header ── */}
        <header className="app-header">
          <div className="logo-container">
            <div className="logo-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 3v6M12 15v6" />
                <path d="M5.636 5.636l4.243 4.243M14.121 14.121l4.243 4.243" />
                <path d="M3 12h6M15 12h6" />
              </svg>
            </div>
            <h1 className="logo-text">GitGhost</h1>
          </div>
          <p className="app-subtitle">
            Reconstruct synthetic development timelines with dependency-aware ordering and Poisson-distributed commit schedules.
          </p>
          <div className="header-divider" />
        </header>

        {/* ── Main Layout ── */}
        <div className="main-grid">
          {/* ── Config Panel ── */}
          <aside>
            <div className="panel">
              <div className="panel-header">
                <div className="panel-icon config">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </div>
                <span className="panel-title">Configuration</span>
              </div>

              {/* Source Path */}
              <div className="field">
                <label className="field-label" htmlFor="source-path">Source Codebase</label>
                <input
                  id="source-path"
                  type="text"
                  className="field-input"
                  placeholder="/path/to/finished/project"
                  value={sourcePath}
                  onChange={(e) => setSourcePath(e.target.value)}
                />
              </div>

              {/* Author Fields */}
              <div className="field-row">
                <div className="field">
                  <label className="field-label" htmlFor="author-name">Author Name</label>
                  <input
                    id="author-name"
                    type="text"
                    className="field-input"
                    placeholder="Jane Doe"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="author-email">Author Email</label>
                  <input
                    id="author-email"
                    type="text"
                    className="field-input"
                    placeholder="jane@dev.io"
                    value={authorEmail}
                    onChange={(e) => setAuthorEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Target Path */}
              <div className="field">
                <label className="field-label" htmlFor="target-path">Target Repository</label>
                <input
                  id="target-path"
                  type="text"
                  className="field-input"
                  placeholder="/path/to/new/repo"
                  value={targetPath}
                  onChange={(e) => setTargetPath(e.target.value)}
                />
              </div>

              {/* Remote URL */}
              <div className="field">
                <label className="field-label" htmlFor="remote-url">
                  Remote URL
                  <span style={{ opacity: 0.5, fontWeight: 400, marginLeft: 6 }}>optional</span>
                </label>
                <input
                  id="remote-url"
                  type="text"
                  className="field-input"
                  placeholder="https://github.com/user/repo.git"
                  value={remoteUrl}
                  onChange={(e) => setRemoteUrl(e.target.value)}
                />
              </div>

              {/* Date */}
              <div className="field">
                <label className="field-label" htmlFor="start-date">Start Date</label>
                <input
                  id="start-date"
                  type="date"
                  className="field-input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              {/* Buttons */}
              <div className="btn-group">
                <button
                  className="btn btn-secondary"
                  onClick={handlePreview}
                  disabled={loading || generating || !sourcePath}
                  id="preview-btn"
                >
                  {loading ? (
                    <>
                      <span className="btn-spinner" />
                      Analyzing…
                    </>
                  ) : (
                    <>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <path d="M21 21l-4.35-4.35" />
                      </svg>
                      Preview
                    </>
                  )}
                </button>

                <button
                  className="btn btn-primary"
                  onClick={handleGenerate}
                  disabled={loading || generating || !targetPath || schedule.length === 0}
                  id="execute-btn"
                >
                  {generating ? (
                    <>
                      <span className="btn-spinner" />
                      Ghosting…
                    </>
                  ) : (
                    <>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                      Execute
                    </>
                  )}
                </button>
              </div>

              {/* Progress bar when generating */}
              {generating && (
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: '60%', animation: 'indeterminate 1.5s ease-in-out infinite' }} />
                </div>
              )}

              {/* Alerts */}
              {error && (
                <div className="alert alert-error">
                  <svg className="alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="alert alert-success">
                  <svg className="alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <span>{success}</span>
                </div>
              )}
            </div>
          </aside>

          {/* ── Timeline Panel ── */}
          <div className="panel timeline-panel">
            <div className="panel-header">
              <div className="panel-icon timeline">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <span className="panel-title">Synthetic Timeline</span>
              {schedule.length > 0 && (
                <span className="panel-badge">{schedule.length} commits</span>
              )}
            </div>

            {/* Stats */}
            {schedule.length > 0 && (
              <div className="stats-bar">
                <div className="stat-chip">
                  <span className="stat-dot" />
                  {schedule.length} files
                </div>
                <div className="stat-chip cyan">
                  <span className="stat-dot" />
                  {uniqueDays} days
                </div>
              </div>
            )}

            {schedule.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon-wrapper">
                  <div className="empty-icon-glow" />
                  <svg className="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                </div>
                <div className="empty-title">No schedule yet</div>
                <p className="empty-desc">
                  Configure your source path and click Preview to generate a synthetic commit timeline.
                </p>
              </div>
            ) : (
              <div className="timeline-scroll">
                <div className="timeline-list">
                  {schedule.map((commit, index) => (
                    <div
                      key={index}
                      className="commit-entry"
                      style={{ animationDelay: `${Math.min(index * 25, 800)}ms` }}
                    >
                      <div className="commit-dot" />
                      <div className="commit-card">
                        <div className="commit-message">
                          <span>{commit.message}</span>
                          <span className="commit-status">queued</span>
                        </div>
                        <div className="commit-meta">
                          <span className="commit-meta-item">
                            <svg className="commit-meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                              <line x1="16" y1="2" x2="16" y2="6" />
                              <line x1="8" y1="2" x2="8" y2="6" />
                              <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            {new Date(commit.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                          <span className="commit-meta-item">
                            <svg className="commit-meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12 6 12 12 16 14" />
                            </svg>
                            {new Date(commit.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="commit-meta-item commit-file" title={commit.file}>
                            <svg className="commit-meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" />
                              <polyline points="14 2 14 8 20 8" />
                            </svg>
                            {commit.file}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
