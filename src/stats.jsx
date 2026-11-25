// stats.jsx — Stats dashboard: per-muscle-group trends. Read-only view of the
// store; all numbers come from buildStats() in index.html.
const { useState: useStateS, useMemo: useMemoS } = React;

const RANGES = [
  { id: 4, label: '4W' }, { id: 8, label: '8W' }, { id: 12, label: '12W' }, { id: null, label: 'All' },
];
const RANGE_KEY = 'pol_stats_range';

const TREND_UI = {
  up:   { icon: '↑', label: 'Progressing', fg: 'var(--st-stable)',  bg: 'var(--st-stable-bg)' },
  flat: { icon: '→', label: 'Flat',        fg: 'var(--st-dev)',     bg: 'var(--st-dev-bg)' },
  down: { icon: '↓', label: 'Dropping',    fg: 'var(--st-plateau)', bg: 'var(--st-plateau-bg)' },
  none: { icon: '·', label: 'Need 2+ sessions', fg: 'var(--muted)', bg: 'var(--paper-2)' },
};

const pctStr = (p) => (p == null ? '—' : `${p > 0 ? '+' : ''}${(p * 100).toFixed(1)}%`);
const weekShort = (k) => isoWeekStart(k).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const mono = { fontFamily: 'var(--font-mono)', letterSpacing: '0.10em', textTransform: 'uppercase' };

function TrendPill({ trend, pct, compact }) {
  const t = TREND_UI[trend] || TREND_UI.none;
  const text = trend === 'none' ? (compact ? '· new' : t.label) : compact ? `${t.icon} ${pctStr(pct)}` : `${t.icon} ${t.label} ${pctStr(pct)}`;
  return (
    <span style={{
      ...mono, fontSize: 9.5, fontWeight: 700, color: t.fg, background: t.bg,
      padding: '4px 8px', borderRadius: 4, whiteSpace: 'nowrap', flexShrink: 0,
    }} title={t.label}>{text}</span>
  );
}

function StatTile({ label, value, sub }) {
  return (
    <div style={{ flex: 1, minWidth: 0, padding: '12px 12px', background: 'var(--paper-2)', borderRadius: 8 }}>
      <div style={{ ...mono, fontSize: 9, color: 'var(--muted)', fontWeight: 700 }}>{label}</div>
      <div className="num" style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink)', marginTop: 4, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// Tiny strength line for a group row. Breaks across weeks with no data.
function Sparkline({ values, w = 84, h = 26 }) {
  // Only weeks with data, evenly spaced, so breaks don't squash the shape.
  const pts = values.filter(v => v != null).map((v, i) => [i, v]);
  if (pts.length < 2) return <svg width={w} height={h} aria-hidden="true" />;
  const ys = pts.map(p => p[1]);
  const lo = Math.min(0, ...ys), hi = Math.max(0, ...ys);
  const x = (i) => 3 + (i / Math.max(1, pts.length - 1)) * (w - 6);
  const y = (v) => hi === lo ? h / 2 : 3 + (1 - (v - lo) / (hi - lo)) * (h - 6);
  const d = pts.map((p, j) => `${j ? 'L' : 'M'}${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join(' ');
  const lastP = pts[pts.length - 1];
  return (
    <svg width={w} height={h} aria-hidden="true" style={{ flexShrink: 0, overflow: 'visible' }}>
      <line x1={0} x2={w} y1={y(0)} y2={y(0)} stroke="var(--hair)" strokeWidth="1" strokeDasharray="2 3" />
      <path d={d} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(lastP[0])} cy={y(lastP[1])} r="3.5" fill="var(--accent)" stroke="var(--paper)" strokeWidth="2" />
    </svg>
  );
}

// Weekly chart with tap readout. kind: 'line' (strength %) | 'bar' (sets).
function WeekChart({ weekKeys, values, kind, title, fmtVal }) {
  const [sel, setSel] = useStateS(null);
  const W = 320, H = 120, padL = 34, padR = 8, padT = 8, padB = 20;
  const n = weekKeys.length;
  const nums = values.filter(v => v != null);
  if (!nums.length) return null;
  let lo = kind === 'bar' ? 0 : Math.min(0, ...nums), hi = Math.max(kind === 'bar' ? 1 : 0, ...nums);
  if (hi === lo) hi = lo + 1;
  const band = (W - padL - padR) / n;
  const cx = (i) => padL + band * (i + 0.5);
  const y = (v) => padT + (1 - (v - lo) / (hi - lo)) * (H - padT - padB);
  const shown = sel != null ? sel : (() => { for (let i = n - 1; i >= 0; i--) if (values[i] != null && (kind === 'line' || values[i] > 0)) return i; return n - 1; })();
  const pts = values.map((v, i) => [i, v]).filter(p => p[1] != null);
  // Line segments only join consecutive weeks (gaps stay open).
  let d = '';
  pts.forEach((p, j) => { const prev = pts[j - 1]; d += `${prev && prev[0] === p[0] - 1 ? 'L' : 'M'}${cx(p[0]).toFixed(1)},${y(p[1]).toFixed(1)} `; });
  const barW = Math.max(3, Math.min(18, band - 4));

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
        <span style={{ ...mono, fontSize: 9.5, color: 'var(--muted)', fontWeight: 700 }}>{title}</span>
        <span style={{ flex: 1 }} />
        <span className="num" style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 600 }}>
          {weekShort(weekKeys[shown])} · {values[shown] == null ? 'no data' : fmtVal(values[shown])}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={title} style={{ display: 'block', touchAction: 'pan-y' }}>
        {/* recessive axis */}
        <line x1={padL} x2={W - padR} y1={y(kind === 'bar' ? 0 : 0)} y2={y(0)} stroke="var(--hair)" strokeWidth="1" strokeDasharray={kind === 'line' ? '2 3' : null} />
        <text x={padL - 6} y={y(hi) + 4} textAnchor="end" fontSize="9" fill="var(--muted)" fontFamily="var(--font-mono)">{fmtVal(hi)}</text>
        {lo !== 0 && <text x={padL - 6} y={y(lo) + 4} textAnchor="end" fontSize="9" fill="var(--muted)" fontFamily="var(--font-mono)">{fmtVal(lo)}</text>}
        <text x={padL - 6} y={y(0) + 4} textAnchor="end" fontSize="9" fill="var(--muted)" fontFamily="var(--font-mono)">{fmtVal(0)}</text>
        <text x={cx(0)} y={H - 4} textAnchor="start" fontSize="9" fill="var(--muted)" fontFamily="var(--font-mono)">{weekShort(weekKeys[0])}</text>
        <text x={cx(n - 1)} y={H - 4} textAnchor="end" fontSize="9" fill="var(--muted)" fontFamily="var(--font-mono)">{weekShort(weekKeys[n - 1])}</text>
        {/* selected-week guide */}
        <line x1={cx(shown)} x2={cx(shown)} y1={padT} y2={H - padB} stroke="var(--ink-2)" strokeOpacity="0.25" strokeWidth="1" />
        {kind === 'bar' ? values.map((v, i) => v > 0 && (
          <path key={i} d={roundedBar(cx(i) - barW / 2, y(v), barW, y(0) - y(v))}
            fill="var(--accent)" fillOpacity={i === shown ? 1 : 0.55} />
        )) : (
          <>
            <path d={d} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            {pts.map(([i, v]) => (
              <circle key={i} cx={cx(i)} cy={y(v)} r={i === shown ? 4.5 : 3}
                fill="var(--accent)" stroke="var(--paper)" strokeWidth="2" />
            ))}
          </>
        )}
        {/* hit targets: whole column per week */}
        {weekKeys.map((k, i) => (
          <rect key={k} x={padL + band * i} y={0} width={band} height={H} fill="transparent"
            onClick={() => setSel(i)} onMouseEnter={() => setSel(i)} style={{ cursor: 'pointer' }} />
        ))}
      </svg>
    </div>
  );
}

// Bar with 4px rounded top, square base on the baseline.
function roundedBar(x, y, w, h) {
  if (h <= 0) return '';
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}

function lastSessionText(e) {
  const s = e.lastSession;
  if (!s || !s.sets.length) return '';
  const unit = (s.unit !== undefined ? s.unit : e.ex.unit) || '';
  const reps = s.sets.map(x => x.reps).join(' · ');
  const w = s.sets[0].weight;
  return w > 0 ? `${fmt(w)}${unit ? ' ' + unit : ''} — ${reps}` : reps;
}

function GroupRow({ g, weekKeys, open, onToggle }) {
  return (
    <div style={{ borderBottom: '1px solid var(--hair-2)' }}>
      <button onClick={onToggle} className="tap" style={{
        width: '100%', minHeight: 56, padding: '10px 0', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>{g.name}</div>
          <div className="num" style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2, whiteSpace: 'nowrap' }}>
            {g.avgSets.toFixed(1)} sets/wk · {g.exercises.length} ex
          </div>
        </div>
        <Sparkline values={g.index} w={64} />
        <span style={{ width: 70, display: 'flex', justifyContent: 'flex-end' }}><TrendPill trend={g.trend} pct={g.pct} compact /></span>
        <span style={{ color: 'var(--muted-2)', fontSize: 10, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 200ms ease' }}>▾</span>
      </button>
      {open && (
        <div className="reveal" style={{ paddingBottom: 16 }}>
          <WeekChart weekKeys={weekKeys} values={g.index} kind="line" title="Strength vs start"
            fmtVal={(v) => `${v > 0 ? '+' : ''}${Math.round(v * 100)}%`} />
          <WeekChart weekKeys={weekKeys} values={g.setsPerWeek} kind="bar" title="Sets per week"
            fmtVal={(v) => `${Math.round(v)}`} />
          <div style={{ marginTop: 16 }}>
            <div style={{ ...mono, fontSize: 9.5, color: 'var(--muted)', fontWeight: 700, marginBottom: 6 }}>Exercises</div>
            {g.exercises.map(e => (
              <div key={e.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px dashed var(--hair-2)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>{e.name}</div>
                  <div className="num" style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Last: {lastSessionText(e)} · {e.count} session{e.count === 1 ? '' : 's'}
                  </div>
                </div>
                <TrendPill trend={e.trend} pct={e.pct} compact />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatsSheet({ store, onClose }) {
  const [range, setRange] = useStateS(() => {
    try { const v = localStorage.getItem(RANGE_KEY); return v === 'all' ? null : (parseInt(v, 10) || 8); } catch (e) { return 8; }
  });
  const pickRange = (r) => { setRange(r); try { localStorage.setItem(RANGE_KEY, r == null ? 'all' : String(r)); } catch (e) {} };
  const [openGroup, setOpenGroup] = useStateS(null);
  const stats = useMemoS(() => buildStats(store, range), [store, range]);
  const t = stats.totals;

  return (
    <Sheet onClose={onClose} title="Stats">
      {/* Range filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {RANGES.map(r => {
          const on = r.id === range;
          return (
            <button key={r.label} onClick={() => pickRange(r.id)} className="tap" style={{
              ...mono, fontSize: 10, fontWeight: 700, padding: '7px 12px', borderRadius: 4,
              background: on ? 'var(--accent)' : 'transparent', color: on ? '#fff' : 'var(--muted)',
              border: on ? '1px solid var(--accent)' : '1px solid var(--hair)',
            }}>{r.label}</button>
          );
        })}
      </div>

      {/* Headline tiles */}
      <div style={{ display: 'flex', gap: 8 }}>
        <StatTile label="Weeks trained" value={`${t.trainedWeeks}/${t.weeks}`} />
        <StatTile label="Sessions" value={t.sessions} sub="exercise logs" />
        <StatTile label="Sets" value={t.sets} />
      </div>

      {/* Plain-English summary */}
      <div style={{ marginTop: 14, padding: '12px 14px', background: 'var(--accent-tint)', borderLeft: '3px solid var(--accent)', borderRadius: 4, fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.5 }}>
        {t.sessions === 0 ? 'No sessions in this period.' : (
          <>
            <div><b>{t.up}</b> of {stats.groups.length} muscle groups are getting stronger. <b>{t.down}</b> are dropping.</div>
            {stats.best && <div>Best: <b>{stats.best.name}</b> ({pctStr(stats.best.pct)}).</div>}
            {stats.worst && <div>Needs work: <b>{stats.worst.name}</b> ({pctStr(stats.worst.pct)}).</div>}
          </>
        )}
      </div>

      {/* Groups */}
      <div style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ ...mono, fontSize: 10, color: 'var(--muted)', fontWeight: 700 }}>Muscle groups</span>
          <span style={{ flex: 1, height: 1, background: 'var(--hair)' }} />
        </div>
        {stats.groups.map(g => (
          <GroupRow key={g.name} g={g} weekKeys={stats.weekKeys}
            open={openGroup === g.name} onToggle={() => setOpenGroup(o => o === g.name ? null : g.name)} />
        ))}
      </div>

      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 14, lineHeight: 1.5 }}>
        Strength = best set's estimated 1-rep max (weight × (1 + reps ÷ 30)), compared with your first session in this period. Bodyweight moves use best reps. Within ±2% counts as flat.
      </div>
    </Sheet>
  );
}

Object.assign(window, { StatsSheet });
