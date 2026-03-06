import { useState, useCallback, useRef } from 'react';

// ─── Constants ───────────────────────────────────────────────
const WALKABLE = 0;
const OBSTACLE = 1;
const TARGET = 2;

// App flows through 3 explicit stages:
//  'setup'  → user picks rows/cols
//  'paint'  → user paints cells, then clicks Calculate
//  'done'   → results are frozen on screen until Run Again
const STAGE = { SETUP: 'setup', PAINT: 'paint', DONE: 'done' };

// ─── Utilities ───────────────────────────────────────────────
const blankGrid = (r, c) =>
  Array.from({ length: r }, () => Array(c).fill(WALKABLE));

const getTargets = (grid) => {
  const t = [];
  grid.forEach((row, r) => row.forEach((v, c) => v === TARGET && t.push([r, c])));
  return t;
};

const gridToJSON = (grid) =>
  JSON.stringify({ grid, start: [0, 0], targets: getTargets(grid) }, null, 2);

// ─── Paint toolbar config ────────────────────────────────────
const MODES = [
  { id: 'obstacle', label: '🟫  Obstacle', cls: 'bg-slate-700 text-white' },
  { id: 'target', label: '🎯  Target', cls: 'bg-amber-400 text-slate-900' },
  { id: 'erase', label: '🗑  Erase', cls: 'bg-slate-100 text-slate-700 border border-slate-300' },
];

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  // Stage
  const [stage, setStage] = useState(STAGE.SETUP);

  // Config
  const [rows, setRows] = useState(5);
  const [cols, setCols] = useState(5);

  // Grid
  const [grid, setGrid] = useState([]);
  const [mode, setMode] = useState('obstacle');
  const dragging = useRef(false);

  // Calculation
  const [path, setPath] = useState([]);
  const [stats, setStats] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // ── Stage transitions ──────────────────────────────────────
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
        if (!data.grid || !Array.isArray(data.grid)) throw new Error('Invalid JSON: Missing grid array');

        setGrid(data.grid);
        setRows(data.grid.length);
        setCols(data.grid[0].length);
        setPath([]);
        setStats(null);
        setError(null);
        setStage(STAGE.PAINT);
      } catch (err) {
        setError('Failed to load JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  // ── Cell painting ─────────────────────────────────────────
  const paintCell = useCallback((r, c) => {
    if (r === 0 && c === 0) return; // Start is immutable
    setGrid(prev => {
      const next = prev.map(row => [...row]);
      if (mode === 'obstacle') {
        next[r][c] = next[r][c] === OBSTACLE ? WALKABLE : OBSTACLE;
      } else if (mode === 'target') {
        // Remove existing target first (only 1 allowed)
        for (let i = 0; i < next.length; i++)
          for (let j = 0; j < next[i].length; j++)
            if (next[i][j] === TARGET) next[i][j] = WALKABLE;
        next[r][c] = TARGET;
      } else {
        next[r][c] = WALKABLE;
      }
      return next;
    });
  }, [mode]);

  const onMouseDown = (r, c) => { dragging.current = true; paintCell(r, c); };
  const onMouseEnter = (r, c) => { if (dragging.current) paintCell(r, c); };
  const onMouseUp = () => { dragging.current = false; };

  // ── Calculate ─────────────────────────────────────────────
  const calculate = async () => {
    const targets = getTargets(grid);
    if (targets.length === 0) {
      setError('Place exactly 1 target (🎯) on the grid first.');
      return;
    }
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Backend error');
      runAnimation(data.path, data.total_steps, data.targets_collected);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  // ── Animation → then lock to DONE stage ───────────────────
  const runAnimation = (fullPath, totalSteps, targetsCollected) => {
    let i = 0;
    const built = []; // accumulate path locally to avoid stale closure

    const tick = setInterval(() => {
      built.push(fullPath[i]);
      // Use functional update so React sees the latest state
      setPath([...built]);
      i++;
      if (i >= fullPath.length) {
        clearInterval(tick);
        // Batch these together – no stage change until both are set
        setStats({ totalSteps, targetsCollected });
        setBusy(false);
        // Defer stage change one micro-tick so stats renders first
        setTimeout(() => setStage(STAGE.DONE), 0);
      }
    }, 180);
  };

  // ── Cell color ────────────────────────────────────────────
  const cellCls = (r, c) => {
    const isStart = r === 0 && c === 0;
    const onPath = path.some(p => p[0] === r && p[1] === c);
    const isTarget = grid[r]?.[c] === TARGET;
    const isObs = grid[r]?.[c] === OBSTACLE;

    if (isStart) return 'bg-blue-600 text-white';
    if (onPath && isTarget) return 'bg-green-500';
    if (onPath) return 'bg-green-400';
    if (isTarget) return 'bg-amber-400';
    if (isObs) return 'bg-slate-800';
    return 'bg-white border border-slate-200 hover:bg-slate-100';
  };

  // ══════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════
  return (
    <div
      className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 flex flex-col items-center select-none"
      onMouseUp={onMouseUp}
    >
      <div className="max-w-6xl w-full flex flex-col items-center gap-6">

        {/* ── Header ──────────────────────────────────────── */}
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-1">
            <span className="text-blue-600">Route</span>Master
          </h1>
          <p className="text-slate-500 text-sm">Build your warehouse grid and find the shortest picking route.</p>
        </div>

        {/* ══════════ STAGE: SETUP ══════════════════════════ */}
        {stage === STAGE.SETUP && (
          <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-8 flex flex-col gap-5 w-full max-w-xs">
            <h2 className="font-bold text-slate-700 text-lg">Step 1 – Grid Size</h2>

            <div className="flex gap-4">
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Rows</label>
                <input
                  type="number" min="2" max="12" value={rows}
                  onChange={e => setRows(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cols</label>
                <input
                  type="number" min="2" max="12" value={cols}
                  onChange={e => setCols(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>

            <p className="text-xs text-slate-400">Min 2×2, Max 12×12. Start is always <span className="font-bold text-blue-600">[0, 0]</span>.</p>

            <button
              onClick={createGrid}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-md shadow-blue-500/20 transition-all active:scale-95"
            >
              Create Grid →
            </button>

            <div className="relative mt-2">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-400 font-medium">Or</span>
              </div>
            </div>

            <label className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-slate-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-all">
              <span className="text-2xl">📁</span>
              <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Upload JSON File</span>
              <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        )}

        {/* ══════════ STAGE: PAINT or DONE ══════════════════ */}
        {(stage === STAGE.PAINT || stage === STAGE.DONE) && (
          <div className="flex flex-col xl:flex-row gap-6 w-full items-start justify-center">

            {/* ── Grid ────────────────────────────────────── */}
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 bg-slate-100 rounded-2xl shadow-lg border border-slate-200 overflow-auto">
                <div
                  className="grid gap-1"
                  style={{ gridTemplateColumns: `repeat(${grid[0]?.length ?? 1}, minmax(0,1fr))` }}
                >
                  {grid.map((row, r) =>
                    row.map((_, c) => (
                      <div
                        key={`${r}-${c}`}
                        className={`
                          w-11 h-11 sm:w-14 sm:h-14 rounded-lg transition-colors duration-150
                          flex items-center justify-center text-[10px] font-bold
                          ${cellCls(r, c)}
                          ${stage === STAGE.PAINT && !(r === 0 && c === 0) ? 'cursor-pointer' : 'cursor-default'}
                        `}
                        onMouseDown={() => stage === STAGE.PAINT && onMouseDown(r, c)}
                        onMouseEnter={() => stage === STAGE.PAINT && onMouseEnter(r, c)}
                      >
                        {r === 0 && c === 0 && <span>START</span>}
                        {grid[r][c] === TARGET && !(r === 0 && c === 0) && <span>🎯</span>}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap justify-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><span className="w-3.5 h-3.5 rounded bg-blue-600 inline-block" /> Start</span>
                <span className="flex items-center gap-1"><span className="w-3.5 h-3.5 rounded bg-amber-400 inline-block" /> Target</span>
                <span className="flex items-center gap-1"><span className="w-3.5 h-3.5 rounded bg-slate-800 inline-block" /> Obstacle</span>
                <span className="flex items-center gap-1"><span className="w-3.5 h-3.5 rounded bg-green-400 inline-block" /> Route</span>
              </div>
            </div>

            {/* ── Sidebar ─────────────────────────────────── */}
            <div className="flex flex-col gap-4 w-full xl:w-80 shrink-0">

              {/* Paint toolbar – PAINT stage only */}
              {stage === STAGE.PAINT && (
                <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-5 flex flex-col gap-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Step 2 – Paint Cells</h3>
                  <p className="text-xs text-slate-500">Pick a mode, then click or drag cells.</p>
                  <div className="flex flex-col gap-2">
                    {MODES.map(m => (
                      <button
                        key={m.id}
                        onClick={() => setMode(m.id)}
                        className={`py-2 px-3 rounded-xl font-semibold text-sm text-left transition-all ${m.cls}
                          ${mode === m.id ? 'ring-2 ring-blue-500 scale-[1.02]' : 'opacity-60 hover:opacity-90'}`}
                      >
                        {m.label}{mode === m.id && <span className="ml-2 text-xs font-normal">(active)</span>}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-400">Only 1 target allowed — placing a new one moves the existing one.</p>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">{error}</div>
              )}

              {/* Calculate button – PAINT stage only */}
              {stage === STAGE.PAINT && (
                <button
                  onClick={calculate}
                  disabled={busy}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed
                             text-white font-bold py-3 rounded-xl shadow-md shadow-blue-500/20
                             transition-all active:scale-95 flex justify-center items-center gap-2"
                >
                  {busy
                    ? (<><svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>Calculating...</>)
                    : 'Calculate Optimal Route'}
                </button>
              )}

              {/* ── RESULTS – DONE stage only ───────────────── */}
              {stage === STAGE.DONE && stats && (
                <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-5 flex flex-col gap-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">✅ Results</h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                      <div className="text-4xl font-extrabold text-slate-800">{stats.totalSteps}</div>
                      <div className="text-xs text-slate-500 mt-1">Total Steps</div>
                    </div>
                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-center">
                      <div className="text-4xl font-extrabold text-amber-600">{stats.targetsCollected}</div>
                      <div className="text-xs text-amber-600 mt-1">Target Picked</div>
                    </div>
                  </div>

                  <div className="bg-green-50 rounded-xl p-3 border border-green-100 text-sm text-green-700 font-medium text-center">
                    🟢 Optimal route shown in green on the grid
                  </div>

                  <button
                    onClick={goSetup}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl
                               shadow-md shadow-blue-500/20 transition-all active:scale-95"
                  >
                    🔄 Run Again — New Grid
                  </button>
                </div>
              )}

              {/* Live JSON Preview – PAINT stage only */}
              {stage === STAGE.PAINT && (
                <div className="bg-slate-900 rounded-2xl p-4 font-mono text-xs text-green-300 overflow-auto max-h-64 shadow-inner">
                  <div className="text-slate-500 mb-2 uppercase tracking-wider text-[10px]">Live JSON Preview</div>
                  <pre>{gridToJSON(grid)}</pre>
                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
