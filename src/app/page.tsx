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

  return (
    <div className="container p-8 max-w-6xl mx-auto">
      <header className="mb-12 animate-fade-in relative">
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-primary/20 rounded-full blur-[100px] -z-10" />
        <h1 className="text-5xl font-extrabold tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-white via-primary to-accent mb-3">
          GitGhost
        </h1>
        <p className="text-slate-400 max-w-2xl text-lg font-light leading-relaxed">
          Synthetic history synthesizer for legacy codebase reconstruction. 
          Analyze dependencies, simulate Poisson-distributed commit entropy, and reconstruct a logical development timeline.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Configuration Panel */}
        <div className="lg:col-span-4 space-y-6">
          <div className="card glass-container border-primary/20">
            <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-primary mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Reconstruction Parameters
            </h2>
            
            <div className="input-group">
              <label>Source Codebase Path</label>
              <input 
                type="text" 
                placeholder="/absolute/path/to/finished/app" 
                value={sourcePath}
                onChange={(e) => setSourcePath(e.target.value)}
                className="font-mono text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="input-group">
                <label>Author Name</label>
                <input 
                  type="text" 
                  placeholder="John Doe" 
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
              <div className="input-group">
                <label>Author Email</label>
                <input 
                  type="text" 
                  placeholder="john@example.com" 
                  value={authorEmail}
                  onChange={(e) => setAuthorEmail(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div className="input-group">
              <label>Target Repository Path</label>
              <input 
                type="text" 
                placeholder="/absolute/path/to/new/repo" 
                value={targetPath}
                onChange={(e) => setTargetPath(e.target.value)}
                className="font-mono text-xs"
              />
            </div>

            <div className="input-group">
              <label>Remote Repository URL (Optional)</label>
              <input 
                type="text" 
                placeholder="https://github.com/user/repo.git" 
                value={remoteUrl}
                onChange={(e) => setRemoteUrl(e.target.value)}
                className="font-mono text-xs"
              />
            </div>

            <div className="input-group">
              <label>Simulated Start Date</label>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="font-mono"
              />
            </div>

            <div className="space-y-4 pt-4">
              <button 
                className="btn btn-secondary w-full justify-center group"
                onClick={handlePreview}
                disabled={loading || generating || !sourcePath}
              >
                {loading ? 'Analyzing Graph...' : 'Preview Synthesis'}
                <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>

              <button 
                className="btn btn-primary w-full justify-center shadow-lg shadow-primary/20"
                onClick={handleGenerate}
                disabled={loading || generating || !targetPath || schedule.length === 0}
              >
                {generating ? 'Reconstructing...' : 'Execute Ghosting'}
              </button>
            </div>
          </div>

          {error && (
            <div className="card border-error/50 text-error text-xs bg-error/10 animate-fade-in border-l-4">
              <div className="font-bold mb-1">SYSTEM_ERROR</div>
              {error}
            </div>
          )}

          {success && (
            <div className="card border-success/50 text-success text-xs bg-success/10 animate-fade-in border-l-4">
              <div className="font-bold mb-1">SYNTHESIS_COMPLETE</div>
              {success}
            </div>
          )}
        </div>

        {/* Timeline Visualization */}
        <div className="lg:col-span-8">
          <div className="card glass-container min-h-[600px] border-white/5">
            <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
              <div>
                <h2 className="text-xl font-semibold">Synthetic Timeline</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Dependency-sorted commit sequence with Poisson jitter
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono bg-white/5 border border-white/10 px-3 py-1 rounded-full text-slate-400">
                  {schedule.length} ATOMIC_CHUNKS
                </span>
              </div>
            </div>

            {schedule.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-600 py-32 grayscale opacity-50">
                <div className="relative mb-8">
                   <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
                </div>
                <p className="font-mono text-sm tracking-widest uppercase">Awaiting parameter input</p>
              </div>
            ) : (
              <div className="timeline-container max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
                <div className="timeline">
                  {schedule.map((commit, index) => (
                    <div key={index} className="timeline-item animate-fade-in group" style={{ animationDelay: `${index * 20}ms` }}>
                      <div className="timeline-dot pending group-hover:scale-125 transition-transform" />
                      <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-mono text-xs text-foreground font-bold tracking-tight">{commit.message}</h4>
                          <span className="text-[9px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20 uppercase tracking-widest">
                            Ready
                          </span>
                        </div>
                        <div className="flex gap-4 text-[10px] text-slate-500 font-mono">
                          <span className="flex items-center gap-1.5">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" /></svg>
                            {new Date(commit.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                          </span>
                          <span className="flex items-center gap-1.5 truncate max-w-[200px]">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" strokeWidth="2" /></svg>
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

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: var(--primary);
        }
      `}</style>
    </div>
  );
}
