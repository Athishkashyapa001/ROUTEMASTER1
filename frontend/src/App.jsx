import React, { useState, useCallback, useRef, useEffect } from 'react';

const STAGE = { SETUP: 'SETUP', PAINT: 'PAINT', DONE: 'DONE' };
const WALKABLE = 0;
const OBSTACLE = 1;
const TARGET = 2;

const blankGrid = (r, c) => Array.from({ length: r }, () => Array(c).fill(WALKABLE));

const getTargets = (grid) => {
  const ts = [];
  for (let r = 0; r < grid.length; r++)
    for (let c = 0; c < grid[r].length; c++)
      if (grid[r][c] === TARGET) ts.push([r, c]);
  return ts;
};

export default function App() {
  const [stage, setStage] = useState(STAGE.SETUP);
  const [rows, setRows] = useState(5);
  const [cols, setCols] = useState(5);
  const [grid, setGrid] = useState([]);
  const [mode, setMode] = useState('obstacle');
  const [path, setPath] = useState([]);
  const [stats, setStats] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const dragging = useRef(false);

  const goSetup = () => {
    setStage(STAGE.SETUP);
    setGrid([]);
    setPath([]);
    setStats(null);
    setError(null);
    setBusy(false);
  };

  const createGrid = () => {
    const r = Math.max(2, Math.min(12, Number(rows)));
    const c = Math.max(2, Math.min(12, Number(cols)));
    setGrid(blankGrid(r, c));
    setPath([]);
    setStats(null);
    setError(null);
    setStage(STAGE.PAINT);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (!data.grid || !Array.isArray(data.grid)) throw new Error('Missing grid array');
        setGrid(data.grid);
        setRows(data.grid.length);
        setCols(data.grid[0].length);
        setPath([]);
        setStats(null);
        setError(null);
        setStage(STAGE.PAINT);
      } catch (err) { setError('Invalid JSON format'); }
    };
    reader.readAsText(file);
  };

  const paintCell = useCallback((r, c) => {
    if (r === 0 && c === 0 || stage === STAGE.DONE) return;
    setGrid(prev => {
      const next = prev.map(row => [...row]);
      if (mode === 'obstacle') next[r][c] = next[r][c] === OBSTACLE ? WALKABLE : OBSTACLE;
      else if (mode === 'target') {
        for (let i = 0; i < next.length; i++)
          for (let j = 0; j < next[i].length; j++)
            if (next[i][j] === TARGET) next[i][j] = WALKABLE;
        next[r][c] = TARGET;
      } else next[r][c] = WALKABLE;
      return next;
    });
  }, [mode, stage]);

  const calculate = async () => {
    const targets = getTargets(grid);
    if (targets.length === 0) { setError("Place at least one target (🎯)"); return; }
    setBusy(true);
    setError(null);
    setPath([]);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiUrl}/optimize-route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grid, start: [0, 0], targets }),
      });
      if (!res.ok) throw new Error("Backend Error");
      const data = await res.json();
      runAnimation(data.path, data.total_steps, data.targets_collected);
    } catch (err) {
      setError("Calculation failed. Ensure backend is live.");
      setBusy(false);
    }
  };

  const runAnimation = (fullPath, totalSteps, targetsCollected) => {
    let i = 0;
    const built = [];
    const tick = setInterval(() => {
      built.push(fullPath[i]);
      setPath([...built]);
      i++;
      if (i >= fullPath.length) {
        clearInterval(tick);
        setStats({ totalSteps, targetsCollected });
        setBusy(false);
        setTimeout(() => setStage(STAGE.DONE), 0);
      }
    }, 150);
  };

  const onMouseDown = useCallback((r, c) => { dragging.current = true; paintCell(r, c); }, [paintCell]);
  const onMouseEnter = useCallback((r, c) => { if (dragging.current) paintCell(r, c); }, [paintCell]);
  const onMouseUp = useCallback(() => { dragging.current = false; }, []);

  const isPath = (r, c) => path.some(p => p[0] === r && p[1] === c);

  return (
    <div className="min-h-screen p-4 md:p-12 flex flex-col items-center">
      <header className="mb-16 text-center animate-in fade-in slide-in-from-top duration-1000">
        <h1 className="text-6xl md:text-8xl font-bold text-gradient mb-4 tracking-tight drop-shadow-2xl">RouteMaster</h1>
        <p className="text-slate-400 text-xl font-light tracking-wide">Next-Gen Warehouse Intelligence</p>
      </header>

      <div className="w-full max-w-6xl flex flex-col lg:grid lg:grid-cols-12 gap-12">
        {/* Sidebar Controls */}
        <div className="col-span-12 lg:col-span-4 space-y-8 order-2 lg:order-1">
          {stage === STAGE.SETUP && (
            <div className="glass-panel p-8 rounded-3xl animate-in fade-in zoom-in duration-500">
              <h2 className="text-2xl font-semibold mb-6 flex items-center">
                <span className="bg-brand-primary/20 p-2 rounded-lg mr-3 text-brand-primary">⚙️</span>
                Initialization
              </h2>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-2 block">Rows</label>
                    <input type="number" value={rows} onChange={e => setRows(e.target.value)} className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-center text-xl font-semibold outline-none focus:border-brand-primary" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-2 block">Cols</label>
                    <input type="number" value={cols} onChange={e => setCols(e.target.value)} className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-center text-xl font-semibold outline-none focus:border-brand-primary" />
                  </div>
                </div>
                <button onClick={createGrid} className="btn-primary w-full py-4 rounded-2xl text-lg font-bold">Generate Grid →</button>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-slate-900 px-3 text-slate-500 font-bold">Or Upload</span></div>
                </div>
                <label className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-slate-800 rounded-2xl hover:border-brand-secondary/50 hover:bg-brand-secondary/5 cursor-pointer transition-all">
                  <span className="text-3xl">📂</span>
                  <span className="text-xs font-bold text-slate-400">IMPORT JSON LAYOUT</span>
                  <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            </div>
          )}

          {stage === STAGE.PAINT && (
            <div className="glass-panel p-8 rounded-3xl animate-in fade-in slide-in-from-left duration-500">
              <h2 className="text-2xl font-semibold mb-6 flex items-center">
                <span className="bg-brand-primary/20 p-2 rounded-lg mr-3 text-brand-primary">🎨</span>
                Designer Tools
              </h2>
              <div className="grid grid-cols-3 gap-3 mb-8">
                {[
                  { id: 'obstacle', icon: '🟫', label: 'Wall' },
                  { id: 'target', icon: '🎯', label: 'Pick' },
                  { id: 'erase', icon: '🧹', label: 'Clear' }
                ].map(t => (
                  <button key={t.id} onClick={() => setMode(t.id)} className={`flex flex-col items-center p-4 rounded-2xl border-2 transition-all ${mode === t.id ? 'bg-brand-primary/20 border-brand-primary scale-105 shadow-lg shadow-brand-primary/20' : 'bg-slate-800/30 border-transparent hover:border-slate-700'}`}>
                    <span className="text-2xl mb-1">{t.icon}</span>
                    <span className="text-[10px] uppercase font-black">{t.label}</span>
                  </button>
                ))}
              </div>
              <button disabled={busy} onClick={calculate} className={`btn-primary w-full py-4 rounded-2xl text-lg font-bold flex items-center justify-center gap-2 ${busy ? 'opacity-50' : ''}`}>
                {busy ? <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin"></div> : '⚡ Optimize Path'}
              </button>
              {error && <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium animate-pulse">{error}</div>}
            </div>
          )}

          {stage === STAGE.DONE && stats && (
            <div className="glass-panel p-8 rounded-3xl animate-in fade-in bounce-in duration-700">
              <h2 className="text-2xl font-semibold mb-6 text-brand-accent">Success! 🚀</h2>
              <div className="space-y-4 mb-8">
                <div className="glass-card p-4 rounded-2xl flex justify-between items-center">
                  <span className="text-slate-400 font-medium">TOTAL STEPS</span>
                  <span className="text-3xl font-bold text-white">{stats.totalSteps}</span>
                </div>
                <div className="glass-card p-4 rounded-2xl flex justify-between items-center">
                  <span className="text-slate-400 font-medium">ITEMS PICKED</span>
                  <span className="text-3xl font-bold text-white">{stats.targetsCollected}</span>
                </div>
              </div>
              <button onClick={goSetup} className="w-full py-4 rounded-2xl bg-white text-slate-900 font-bold hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
                <span>🔄</span> CALCULATE NEW GRID
              </button>
            </div>
          )}

          {/* Code Preview */}
          {grid.length > 0 && (
            <div className="glass-panel p-6 rounded-3xl opacity-50 hover:opacity-100 transition-opacity">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Live JSON Source</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-500 px-2 py-0.5 rounded font-bold uppercase">Valid Payload</span>
              </div>
              <pre className="text-[10px] text-slate-400 font-mono hide-scrollbar overflow-auto max-h-[120px]">
                {JSON.stringify({ grid, start: [0, 0], targets: getTargets(grid) }, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Grid Canvas */}
        <div className="col-span-12 lg:col-span-8 order-1 lg:order-2">
          {grid.length > 0 ? (
            <div className="glass-panel p-2 md:p-6 rounded-[2.5rem] relative group shadow-2xl">
              <div className="absolute -inset-1 bg-gradient-to-r from-brand-primary to-brand-secondary rounded-[2.6rem] blur opacity-10 group-hover:opacity-20 transition duration-1000 pointer-events-none"></div>
              <div className="relative bg-slate-950/80 rounded-[2rem] overflow-hidden p-2">
                <div
                  className="grid gap-1.5 transition-all duration-500"
                  style={{
                    gridTemplateColumns: `repeat(${grid[0]?.length}, minmax(0, 1fr))`,
                    userSelect: 'none'
                  }}
                  onMouseUp={onMouseUp}
                  onMouseLeave={onMouseUp}
                >
                  {grid.map((row, r) => row.map((cell, c) => {
                    const isS = r === 0 && c === 0;
                    const isT = cell === TARGET;
                    const isO = cell === OBSTACLE;
                    const isP = isPath(r, c);
                    return (
                      <div
                        key={`${r}-${c}`}
                        onMouseDown={() => onMouseDown(r, c)}
                        onMouseEnter={() => onMouseEnter(r, c)}
                        className={`aspect-square rounded-lg flex items-center justify-center text-xl transition-all duration-300 transform
                          ${isS ? 'bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/30' :
                            isT ? 'bg-gradient-to-br from-amber-400 to-orange-600 animate-collect' :
                              isO ? 'bg-slate-800 scale-90' :
                                isP ? 'bg-gradient-to-br from-emerald-400 to-green-600 scale-95 shadow-lg shadow-emerald-500/40' :
                                  'bg-slate-900 hover:bg-slate-800'}`}
                      >
                        {isS && <span className="drop-shadow-sm">🏠</span>}
                        {isT && <span className="drop-shadow-md">🎯</span>}
                      </div>
                    );
                  }))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] border-4 border-dashed border-slate-800 rounded-[3rem] flex flex-col items-center justify-center text-slate-600 space-y-4">
              <span className="text-6xl grayscale opacity-30">🚚</span>
              <p className="font-medium">Waiting for warehouse dimensions...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
