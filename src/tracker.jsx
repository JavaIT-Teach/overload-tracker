// tracker.jsx — exercise card, cluster logging, notes, history
// ─────────────────────────────────────────────────────────────
const { useState, useEffect, useRef, useMemo, useCallback, Fragment } = React;

// ── Small visual primitives ────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    developing: { label: 'Developing', fg: '#FFFFFF', bg: 'var(--st-dev)',     dot: 'rgba(255,255,255,0.85)' },
    stable:     { label: 'Stable',     fg: '#FFFFFF', bg: 'var(--st-stable)',  dot: 'rgba(255,255,255,0.9)' },
    plateau:    { label: 'Plateau',    fg: '#FFFFFF', bg: 'var(--st-plateau)', dot: 'rgba(255,255,255,0.9)' },
  };
  const s = map[status] || map.developing;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.10em',
      textTransform: 'uppercase', color: s.fg, fontWeight: 600,
      padding: '5px 10px', borderRadius: 4,
      background: s.bg, lineHeight: 1,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: 999, background: s.dot }} />
      {s.label}
    </span>
  );
}

function HairlineHeading({ children, kicker }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, paddingBottom: 6 }}>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--muted)',
      }}>{kicker}</span>
      <span style={{ flex: 1, height: 1, background: 'var(--hair)' }} />
      {children}
    </div>
  );
}

const VERDICT_TONE = {
  repeat:   { fg: 'var(--st-plateau)', bg: 'var(--st-plateau-bg)', label: 'Repeat weight' },
  hold:     { fg: 'var(--muted)',      bg: 'var(--paper-2)',       label: 'In range' },
  increase: { fg: 'var(--st-stable)',  bg: 'var(--st-stable-bg)',  label: 'Range ↑' },
};

function VerdictLine({ verdict, style }) {
  if (!verdict) return null;
  const t = VERDICT_TONE[verdict.kind] || VERDICT_TONE.hold;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...style }}>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.10em',
        textTransform: 'uppercase', fontWeight: 700, color: t.fg, background: t.bg,
        padding: '4px 8px', borderRadius: 4, lineHeight: 1, flexShrink: 0,
      }}>{t.label}</span>
      <span style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 500, lineHeight: 1.35 }}>{verdict.text}</span>
    </div>
  );
}

// ── Weight picker (shared by both panel types) ─────────────────
function ChoiceRow({ label, options, value, onPick, formatter, unit, optimum, allowCustom, customOptions, onRemoveOption, onTyping, onCommitCustom }) {
  const [customStr, setCustomStr] = useState('');
  const isCustom = value != null && !options.includes(value);

  useEffect(() => {
    if (isCustom) setCustomStr(String(value));
  }, [value, isCustom]);

  const commitCustom = (raw) => {
    const v = parseFloat(raw);
    if (Number.isFinite(v) && v >= 0) {
      onPick(v);
      if (onCommitCustom && !options.includes(v)) onCommitCustom(v);
    }
  };

  return (
    <div>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.10em',
        textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8,
      }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        {options.map(opt => {
          const sel = value === opt;
          const inRange = optimum && opt >= optimum[0] && opt <= optimum[1];
          const isPreset = customOptions && customOptions.has(opt);
          const btn = (
            <button
              onClick={() => { onPick(opt); setCustomStr(''); }}
              className="tap num"
              style={{
                minWidth: 52, padding: '0 12px', height: 44,
                borderRadius: 6,
                background: sel ? 'var(--ink)' : 'transparent',
                color: sel ? 'var(--paper)' : (inRange ? 'var(--ink)' : 'var(--muted)'),
                border: sel ? '1px solid var(--ink)' : `1px ${isPreset ? 'dashed' : 'solid'} ${inRange ? 'var(--hair)' : 'var(--hair-2)'}`,
                fontSize: 15, fontWeight: 500,
                transition: 'background 120ms ease, color 120ms ease, border-color 120ms ease',
              }}
            >
              {formatter ? formatter(opt) : opt}{unit && !sel ? <span style={{ marginLeft: 3, fontSize: 11, color: 'inherit', opacity: 0.6 }}>{unit}</span> : ''}
            </button>
          );
          if (isPreset && onRemoveOption) {
            return (
              <span key={opt} style={{ position: 'relative', display: 'inline-flex' }}>
                {btn}
                <button
                  onClick={(e) => { e.stopPropagation(); onRemoveOption(opt); }}
                  aria-label="Remove saved weight"
                  className="tap"
                  style={{
                    position: 'absolute', top: -7, right: -7,
                    width: 20, height: 20, minHeight: 20, borderRadius: 999,
                    background: 'var(--ink)', color: 'var(--paper)',
                    fontSize: 12, lineHeight: 1, padding: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '2px solid var(--paper)',
                  }}
                >×</button>
              </span>
            );
          }
          return <Fragment key={opt}>{btn}</Fragment>;
        })}
        {allowCustom && (
          <div style={{
            display: 'inline-flex', alignItems: 'center',
            height: 44, padding: '0 6px 0 10px',
            border: `1px solid ${isCustom ? 'var(--ink)' : 'var(--hair-2)'}`,
            borderRadius: 6,
            background: isCustom ? 'var(--ink)' : 'transparent',
            transition: 'background 120ms ease, border-color 120ms ease',
          }}>
            <input
              type="number"
              inputMode="decimal"
              step="any"
              placeholder="Custom"
              value={customStr}
              onFocus={() => onTyping && onTyping(true)}
              onChange={e => {
                setCustomStr(e.target.value);
                const v = parseFloat(e.target.value);
                if (Number.isFinite(v) && v >= 0) onPick(v);
              }}
              onBlur={e => { onTyping && onTyping(false); commitCustom(e.target.value); }}
              className="num"
              style={{
                width: 72, height: '100%',
                border: 'none', outline: 'none', background: 'transparent',
                fontSize: 16, fontWeight: 500,
                color: isCustom ? 'var(--paper)' : 'var(--ink)',
                MozAppearance: 'textfield',
              }}
            />
            {unit && (
              <span style={{
                fontSize: 11,
                color: isCustom ? 'rgba(250,250,250,0.7)' : 'var(--muted)',
                marginLeft: 2, marginRight: 4,
              }}>{unit}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Stepper ────────────────────────────────────────────────────
function Stepper({ label, value, step, min, max, onChange, unit, disabled, hint }) {
  const dec = () => {
    if (disabled) return;
    const v = Math.max(min ?? -Infinity, value - step);
    onChange(v);
  };
  const inc = () => {
    if (disabled) return;
    const v = Math.min(max ?? Infinity, value + step);
    onChange(v);
  };
  return (
    <div style={{ flex: 1 }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.10em',
        textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6,
      }}>{label}</div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 0,
        border: '1px solid var(--hair)', borderRadius: 6,
        background: 'var(--paper)', height: 48,
        opacity: disabled ? 0.4 : 1,
      }}>
        <button onClick={dec} className="tap" style={{ width: 44, height: '100%', fontSize: 20, color: 'var(--ink-2)' }} disabled={disabled}>−</button>
        <div className="num" style={{
          flex: 1, textAlign: 'center', fontSize: 20, color: 'var(--ink)', fontWeight: 600,
          letterSpacing: '-0.01em',
        }}>
          {fmt(value)}{unit ? <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 4, fontWeight: 400 }}>{unit}</span> : ''}
        </div>
        <button onClick={inc} className="tap" style={{ width: 44, height: '100%', fontSize: 20, color: 'var(--ink-2)' }} disabled={disabled}>+</button>
      </div>
      {hint && (
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)',
          marginTop: 6, letterSpacing: '0.04em',
        }}>{hint}</div>
      )}
    </div>
  );
}

// ── Rep tap grid for cluster mini-sets ─────────────────────────
function RepButtons({ value, onChange }) {
  const opts = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20];
  return (
    <div>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.10em',
        textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8,
      }}>Reps</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {opts.map(n => {
          const sel = value === n;
          return (
            <button key={n} onClick={() => onChange(n)} className="tap num" style={{
              width: 46, height: 42, borderRadius: 6,
              fontSize: 15, fontWeight: 500,
              background: sel ? 'var(--ink)' : 'transparent',
              color: sel ? 'var(--paper)' : 'var(--ink)',
              border: `1px solid ${sel ? 'var(--ink)' : 'var(--hair)'}`,
              transition: 'background 100ms ease, color 100ms ease',
            }}>{n}</button>
          );
        })}
      </div>
    </div>
  );
}

// ── Rest countdown bar ─────────────────────────────────────────
function CountdownBar({ total, remaining }) {
  const pct = total > 0 ? Math.max(0, (remaining / total) * 100) : 0;
  const done = remaining <= 0;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: 'var(--muted)',
        }}>Rest</span>
        <span className="num" style={{
          fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600,
          color: done ? 'var(--st-stable)' : 'var(--accent)',
        }}>{done ? 'Done ✓' : `${remaining}s`}</span>
      </div>
      <div style={{ height: 4, background: 'var(--hair)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: done ? 'var(--st-stable)' : 'var(--accent)',
          borderRadius: 99,
          transition: remaining > 0 ? 'width 1s linear' : 'none',
        }} />
      </div>
    </div>
  );
}

// ── Cluster progression signal ─────────────────────────────────
// Returns true when more than 4 mini-sets were needed before hitting ≤3 reps,
// meaning the 5th set (index 4) or later is when reps first dropped to 3.
function clusterTriggersProgression(sets) {
  const dropIdx = sets.findIndex(s => s.reps <= 3);
  if (dropIdx === -1) return false; // never hit 3 reps (manual finish)
  return dropIdx >= 4;              // hit 3 reps on the 5th mini-set or later
}

// ── Cluster Logging Panel ─────────────────────────────────────
function ClusterLoggingPanel({ ex, onCancel, onDone, customWeights, onRemoveCustomWeight, onAddCustomWeight, onSwitchToPlain }) {
  const restDuration = ex.restSeconds || 30;
  const bodyweight = ex.unit === '' && ex.weightMin === 0 && ex.weightMax === 0;

  const [sessionCustoms, setSessionCustoms] = useState([]);
  const allCustoms = useMemo(() => {
    const s = new Set();
    (customWeights || []).forEach(w => { if (Number.isFinite(w) && w >= 0) s.add(w); });
    sessionCustoms.forEach(w => { if (Number.isFinite(w) && w >= 0) s.add(w); });
    return [...s];
  }, [customWeights, sessionCustoms]);
  const weightOptions = useMemo(() => {
    const s = new Set(weightButtonRange(ex));
    allCustoms.forEach(w => s.add(w));
    return [...s].sort((a, b) => a - b);
  }, [ex, allCustoms]);
  const customWeightSet = useMemo(() => new Set(allCustoms), [allCustoms]);
  const [typing, setTyping] = useState(false);

  const handleCommitCustom = (v) => {
    setSessionCustoms(prev => prev.includes(v) ? prev : [...prev, v]);
    if (onAddCustomWeight) onAddCustomWeight(v);
  };

  const [weight, setWeight] = useState(bodyweight ? 0 : null);
  const [miniSets, setMiniSets] = useState([]);
  const [currentReps, setCurrentReps] = useState(8);
  const [phase, setPhase] = useState(bodyweight ? 'logging' : 'pickWeight');
  const [timerLeft, setTimerLeft] = useState(restDuration);
  const timerRef = useRef(null);

  useEffect(() => {
    if (phase !== 'resting' || timerLeft <= 0) {
      clearTimeout(timerRef.current);
      return;
    }
    timerRef.current = setTimeout(() => setTimerLeft(t => t - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [phase, timerLeft]);

  const logMiniSet = () => {
    setMiniSets(prev => [...prev, { reps: currentReps }]);
    setCurrentReps(8);
    setTimerLeft(restDuration);
    setPhase('resting');
  };

  const startNextMiniSet = () => {
    clearTimeout(timerRef.current);
    setPhase('logging');
  };

  const finishCluster = () => {
    clearTimeout(timerRef.current);
    if (miniSets.length === 0) { onCancel(); return; }
    const w = weight ?? 0;
    const sets = miniSets.map(s => ({ reps: s.reps, weight: w }));
    onDone(sets, { clusterMode: true });
  };

  const setNum = miniSets.length + 1;

  // ── Phase: pick weight ──────────────────────────────────────
  if (phase === 'pickWeight') {
    return (
      <div className="reveal" style={{ paddingTop: 18 }}>
        <HairlineHeading kicker="Log session" />
        <div style={{ paddingTop: 16 }}>
          <ChoiceRow
            label={`Weight${ex.unit ? ` (${ex.unit})` : ''}`}
            options={weightOptions}
            value={weight}
            onPick={setWeight}
            formatter={fmt}
            optimum={[ex.weightMin, ex.weightMax]}
            allowCustom
            unit={ex.unit}
            customOptions={customWeightSet}
            onRemoveOption={onRemoveCustomWeight}
            onCommitCustom={handleCommitCustom}
            onTyping={setTyping}
          />
        </div>
        <div style={{ display: 'flex', gap: 10, paddingTop: 24 }}>
          <button onClick={onCancel} className="tap" style={{
            flex: 1, height: 48, borderRadius: 6,
            border: '1px solid var(--hair)', color: 'var(--ink-2)',
            fontSize: 14, fontWeight: 500,
          }}>Cancel</button>
          <button
            onClick={() => { if (weight != null && !typing) setPhase('logging'); }}
            disabled={weight == null || typing}
            className="tap"
            style={{
              flex: 2, height: 48, borderRadius: 6,
              background: weight != null ? 'var(--accent)' : 'var(--paper-2)',
              color: weight != null ? '#FFFFFF' : 'var(--muted-2)',
              fontSize: 14, fontWeight: 600,
              cursor: weight != null ? 'pointer' : 'not-allowed',
              transition: 'background 200ms ease, color 200ms ease',
            }}
          >Start cluster →</button>
        </div>
        <button onClick={onSwitchToPlain} className="tap" style={{
          width: '100%', height: 36, marginTop: 12,
          fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.10em',
          color: 'var(--muted)', textTransform: 'uppercase',
        }}>Use plain sets instead</button>
      </div>
    );
  }

  // ── Phases: logging / resting ───────────────────────────────
  return (
    <div className="reveal" style={{ paddingTop: 18 }}>
      <HairlineHeading kicker="Log session">
        {weight != null && !bodyweight && (
          <span className="num" style={{
            fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)',
            fontWeight: 700, letterSpacing: '0.06em',
          }}>{fmt(weight)}{ex.unit ? ' ' + ex.unit : ''}</span>
        )}
      </HairlineHeading>

      {/* Mini-sets logged so far */}
      {miniSets.length > 0 && (
        <div style={{ paddingTop: 10, paddingBottom: 14 }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.10em',
            textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8,
          }}>Sets logged</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {miniSets.map((ms, i) => (
              <span key={i} className="num" style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 40, height: 40, borderRadius: 6,
                background: 'var(--paper-2)', border: '1px solid var(--hair)',
                fontSize: 15, fontWeight: 600, color: 'var(--ink-2)',
              }}>{ms.reps}</span>
            ))}
          </div>
        </div>
      )}

      {/* Timer bar (resting phase) */}
      {phase === 'resting' && (
        <div style={{ paddingBottom: 20 }}>
          <CountdownBar total={restDuration} remaining={timerLeft} />
        </div>
      )}

      {/* Rep picker (logging phase) */}
      {phase === 'logging' && (
        <div style={{ paddingBottom: 18 }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 12,
            fontWeight: 700,
          }}>Set {setNum}</div>
          <RepButtons value={currentReps} onChange={setCurrentReps} />
          <button
            onClick={logMiniSet}
            className="tap"
            style={{
              width: '100%', height: 52, marginTop: 16, borderRadius: 6,
              background: 'var(--accent)', color: '#FFFFFF',
              fontSize: 15, fontWeight: 700, letterSpacing: '0.02em',
            }}
          >Log {currentReps} rep{currentReps === 1 ? '' : 's'}</button>
        </div>
      )}

      {/* Next mini-set button (resting phase) */}
      {phase === 'resting' && (
        <button
          onClick={startNextMiniSet}
          className="tap"
          style={{
            width: '100%', height: 52, marginBottom: 10, borderRadius: 6,
            background: timerLeft <= 0 ? 'var(--accent)' : 'var(--paper-2)',
            color: timerLeft <= 0 ? '#FFFFFF' : 'var(--ink-2)',
            border: timerLeft <= 0 ? 'none' : '1px solid var(--hair)',
            fontSize: 15, fontWeight: 600,
            transition: 'background 300ms ease, color 300ms ease',
          }}
        >+ Next mini-set</button>
      )}

      {/* Finish cluster */}
      <button
        onClick={finishCluster}
        className="tap"
        style={{
          width: '100%', height: 44, borderRadius: 6,
          border: '1px solid var(--hair)',
          color: miniSets.length > 0 ? 'var(--ink-2)' : 'var(--muted-2)',
          background: 'transparent',
          fontSize: 14, fontWeight: 500,
        }}
      >
        {miniSets.length === 0 ? 'Cancel' : `Finish cluster (${miniSets.length} set${miniSets.length === 1 ? '' : 's'})`}
      </button>
    </div>
  );
}

// ── Plain sets panel (override mode) ──────────────────────────
function PlainLoggingPanel({ ex, onCancel, onDone, customWeights, onRemoveCustomWeight, onAddCustomWeight }) {
  const repOptions = useMemo(() => repButtonRange(ex), [ex]);
  const repWord = ex.repUnit || 'reps';
  const repLabel = repWord.charAt(0).toUpperCase() + repWord.slice(1);

  const [sessionCustoms, setSessionCustoms] = useState([]);
  const allCustoms = useMemo(() => {
    const s = new Set();
    (customWeights || []).forEach(w => { if (Number.isFinite(w) && w >= 0) s.add(w); });
    sessionCustoms.forEach(w => { if (Number.isFinite(w) && w >= 0) s.add(w); });
    return [...s];
  }, [customWeights, sessionCustoms]);
  const weightOptions = useMemo(() => {
    const set = new Set(weightButtonRange(ex));
    allCustoms.forEach(w => set.add(w));
    return [...set].sort((a, b) => a - b);
  }, [ex, allCustoms]);
  const customWeightSet = useMemo(() => new Set(allCustoms), [allCustoms]);

  const handleCommitCustom = (v) => {
    setSessionCustoms(prev => prev.includes(v) ? prev : [...prev, v]);
    if (onAddCustomWeight) onAddCustomWeight(v);
  };

  const bodyweight = ex.unit === '' && ex.weightMin === 0 && ex.weightMax === 0;
  const initialSet = () => ({ reps: null, weight: bodyweight ? 0 : null });
  const [sets, setSets] = useState(() => Array.from({ length: ex.sets }, initialSet));
  const [activeSet, setActiveSet] = useState(0);
  const [typing, setTyping] = useState(false);

  const updateSet = (i, patch) => {
    setSets(prev => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s));
  };

  const allLogged = sets.every(s => s.reps != null && s.weight != null);

  useEffect(() => {
    if (typing) return;
    const s = sets[activeSet];
    if (s && s.reps != null && s.weight != null && activeSet < sets.length - 1) {
      const t = setTimeout(() => setActiveSet(activeSet + 1), 220);
      return () => clearTimeout(t);
    }
  }, [sets, activeSet, typing]);

  return (
    <div className="reveal" style={{ paddingTop: 18 }}>
      <HairlineHeading kicker="Log session (plain sets)">
        <button onClick={onCancel} className="tap" style={{
          fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.10em',
          color: 'var(--muted)', textTransform: 'uppercase',
        }}>← Switch to cluster</button>
      </HairlineHeading>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22, paddingTop: 16 }}>
        {sets.map((s, i) => {
          const isActive = i === activeSet;
          const done = s.reps != null && s.weight != null;
          return (
            <div key={i} className={isActive ? 'reveal' : ''}
              style={{ opacity: isActive || done ? 1 : 0.42, transition: 'opacity 200ms ease' }}>
              <button
                onClick={() => setActiveSet(i)}
                style={{ display: 'flex', alignItems: 'baseline', gap: 10, width: '100%', textAlign: 'left', padding: '0 0 10px' }}>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.10em',
                  textTransform: 'uppercase', color: 'var(--muted)',
                }}>Set {i + 1}</span>
                {done && (
                  <span className="num" style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                    {s.reps} {repWord} · {fmt(s.weight)}{ex.unit ? ' ' + ex.unit : ''}
                  </span>
                )}
                <span style={{ flex: 1, height: 1, background: 'var(--hair-2)', alignSelf: 'center' }} />
              </button>
              {isActive && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 4 }}>
                  <ChoiceRow
                    label={repLabel}
                    options={repOptions}
                    value={s.reps}
                    onPick={(v) => updateSet(i, { reps: v })}
                    optimum={[ex.repMin, ex.repMax]}
                  />
                  {!bodyweight && (
                    <ChoiceRow
                      label={`Weight${ex.unit ? ` (${ex.unit})` : ''}`}
                      options={weightOptions}
                      value={s.weight}
                      onPick={(v) => updateSet(i, { weight: v })}
                      formatter={fmt}
                      optimum={[ex.weightMin, ex.weightMax]}
                      allowCustom
                      unit={ex.unit}
                      customOptions={customWeightSet}
                      onRemoveOption={onRemoveCustomWeight}
                      onCommitCustom={handleCommitCustom}
                      onTyping={setTyping}
                    />
                  )}
                </div>
              )}
              {done && <VerdictLine verdict={nextSessionVerdict(ex, s)} style={{ marginTop: 10 }} />}
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 10, paddingTop: 24 }}>
        <button onClick={onCancel} className="tap" style={{
          flex: 1, height: 48, borderRadius: 6,
          border: '1px solid var(--hair)', color: 'var(--ink-2)',
          fontSize: 14, fontWeight: 500,
        }}>Cancel</button>
        <button
          onClick={() => { if (typing) return; if (allLogged) onDone(sets); }}
          disabled={!allLogged}
          className="tap" style={{
          flex: 2, height: 48, borderRadius: 6,
          background: allLogged ? 'var(--accent)' : 'var(--paper-2)',
          color: allLogged ? '#FFFFFF' : 'var(--muted-2)',
          fontSize: 14, fontWeight: 600, letterSpacing: '0.02em',
          cursor: allLogged ? 'pointer' : 'not-allowed',
          transition: 'background 200ms ease, color 200ms ease',
        }}>
          {allLogged ? 'Save Session' : `${sets.filter(s => s.reps != null && s.weight != null).length} / ${sets.length} sets logged`}
        </button>
      </div>
    </div>
  );
}

// ── Post-log summary (cluster session) ─────────────────────────
function ClusterDoneSummary({ sets, ex }) {
  const w = sets[0]?.weight ?? 0;
  const repsStr = sets.map(s => s.reps).join(' · ');
  const totalRepsCount = sets.reduce((n, s) => n + s.reps, 0);
  const bodyweight = ex.unit === '' && ex.weightMin === 0 && ex.weightMax === 0;
  return (
    <div style={{
      marginTop: 14, padding: '14px 16px',
      background: 'var(--paper-2)', borderRadius: 8,
      border: '1px solid var(--hair)',
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700,
        marginBottom: 8,
      }}>Session logged</div>
      <div className="num" style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>
        {repsStr}
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>
        {sets.length} mini-sets · {totalRepsCount} total reps
        {!bodyweight && ` · ${fmt(w)}${ex.unit ? ' ' + ex.unit : ''}`}
      </div>
    </div>
  );
}

// ── Session summary card (old sessions, shows verdict) ─────────
function SummaryCard({ summary }) {
  const [open, setOpen] = useState(false);
  if (!summary || !summary.verdict) return null;
  const v = summary.verdict;
  const tone = VERDICT_TONE[v.kind] || VERDICT_TONE.hold;
  const perSet = summary.perSet || [];

  return (
    <div style={{
      marginTop: 14, borderRadius: 8,
      border: '1px solid var(--hair)', overflow: 'hidden',
      background: 'var(--paper)',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="tap"
        style={{
          width: '100%', minHeight: 44, padding: '10px 14px',
          display: 'flex', alignItems: 'center', gap: 10,
          justifyContent: 'flex-start', textAlign: 'left',
        }}
      >
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.10em',
          textTransform: 'uppercase', color: tone.fg, fontWeight: 700,
          padding: '4px 8px', borderRadius: 4, background: tone.bg, flexShrink: 0,
        }}>{tone.label}</span>
        <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--ink-2)', fontWeight: 500 }}>{v.text}</span>
        {perSet.length > 0 && (
          <span style={{
            display: 'inline-block', color: 'var(--muted-2)', fontSize: 11,
            transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 200ms ease',
          }}>▾</span>
        )}
      </button>
      {open && perSet.length > 0 && (
        <div className="reveal" style={{ padding: '4px 14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {perSet.map((pv, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted-2)',
                letterSpacing: '0.08em', width: 30, flexShrink: 0, textTransform: 'uppercase',
              }}>S{i + 1}</span>
              <VerdictLine verdict={pv} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Persistent exercise note ────────────────────────────────────
function ExerciseNote({ note, onSave, onDelete }) {
  const hasNote = !!(note && note.text);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(hasNote ? note.text : '');
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    setDraft(hasNote ? note.text : '');
  }, [note && note.text]);

  if (!hasNote && !editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="tap"
        style={{
          marginTop: 12, padding: '0 14px', height: 36, borderRadius: 6,
          fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.10em',
          color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600,
        }}
      >+ Add note</button>
    );
  }

  if (hasNote && !editing) {
    return (
      <div style={{
        marginTop: 14, padding: '12px 14px',
        background: 'var(--paper-2)', borderRadius: 6,
        display: 'flex', gap: 12, alignItems: 'flex-start',
      }}>
        <div style={{ flex: 1, fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
          {note.text}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
          <button onClick={() => { setDraft(note.text); setEditing(true); }} className="tap"
            style={{ padding: '4px 8px', minHeight: 28, fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.10em', color: 'var(--ink-2)', textTransform: 'uppercase', fontWeight: 600 }}>Edit</button>
          <button onClick={onDelete} className="tap"
            style={{ padding: '4px 8px', minHeight: 28, fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.10em', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>Delete</button>
        </div>
      </div>
    );
  }

  return (
    <div className="reveal" style={{ marginTop: 14 }}>
      <textarea
        value={draft}
        onChange={e => { setDraft(e.target.value); setJustSaved(false); }}
        placeholder="Form cues, tweaks, things to remember next session…"
        rows={3}
        autoFocus
        style={{
          width: '100%', padding: 12,
          border: '1px solid var(--hair)', borderRadius: 6,
          background: 'var(--paper)', fontSize: 13.5, color: 'var(--ink)',
          outline: 'none', lineHeight: 1.55,
        }}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
        <button
          onClick={() => { const t = draft.trim(); if (!t) return; onSave(t); setEditing(false); setJustSaved(true); }}
          disabled={!draft.trim()}
          className="tap"
          style={{
            padding: '0 16px', height: 36, borderRadius: 6,
            background: draft.trim() ? 'var(--accent)' : 'var(--paper-2)',
            color: draft.trim() ? '#FFFFFF' : 'var(--muted-2)',
            fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase',
            cursor: draft.trim() ? 'pointer' : 'not-allowed',
          }}
        >Save Note</button>
        <button onClick={() => { setEditing(false); setDraft(hasNote ? note.text : ''); }} className="tap"
          style={{ padding: '0 12px', height: 36, borderRadius: 6, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.10em', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>Cancel</button>
        <span style={{ flex: 1 }} />
        {hasNote && (
          <button onClick={() => { onDelete(); setEditing(false); setDraft(''); }} className="tap"
            style={{ padding: '0 10px', height: 36, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.10em', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>Delete</button>
        )}
      </div>
    </div>
  );
}

// ── Exercise card ──────────────────────────────────────────────
function ExerciseCard({ ex, history, note, done, onOpenLive, onSaveNote, onDeleteNote, onToggleDone }) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const cardRef = useRef(null);
  const status = deriveStatus(ex);

  const summary = useMemo(() => {
    if (!history.length) return null;
    const last = history[history.length - 1];
    // Don't show old-style verdicts for cluster sessions
    if (last.clusterMode) return null;
    if (last.summary && last.summary.verdict) return last.summary;
    return summarize(ex, history);
  }, [ex, history]);

  const openLive = () => {
    const rect = cardRef.current ? cardRef.current.getBoundingClientRect() : null;
    onOpenLive(ex.id, rect);
  };

  return (
    <article
      ref={cardRef}
      onClick={!done ? openLive : undefined}
      style={{
        padding: '22px 22px 20px',
        borderBottom: '1px solid var(--hair-2)',
        position: 'relative', cursor: done ? 'default' : 'pointer',
        opacity: done ? 0.55 : 1,
        transition: 'opacity 200ms ease',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{
            margin: 0, fontFamily: 'var(--font-sans)', fontWeight: 600,
            fontSize: 20, lineHeight: 1.2, color: 'var(--ink)',
            letterSpacing: '-0.015em', textWrap: 'pretty',
          }}>{ex.name}</h3>
          <div style={{
            marginTop: 6, fontSize: 12, color: 'var(--muted)',
            display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 8, fontWeight: 500,
          }}>
            <span className="num">{targetString(ex)}</span>
            {ex.notation && (
              <span style={{ color: 'var(--muted-2)', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.04em' }}>
                · {ex.notation}
              </span>
            )}
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 18 }}>
        {!done && (
          <span className="tap" style={{
            padding: '0 22px', height: 44, borderRadius: 6,
            background: 'var(--accent)', color: '#FFFFFF',
            fontSize: 13, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}>Log Session</span>
        )}
        {onToggleDone && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleDone(ex.id); }}
            className="tap"
            style={{
              padding: '0 14px', height: 44, borderRadius: 6,
              background: done ? 'var(--accent)' : 'var(--paper-2)',
              color: done ? '#fff' : 'var(--muted)',
              border: done ? 'none' : '0.5px solid var(--card-border)',
              fontSize: 13, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase',
              whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {done ? '✓ Done' : 'Done'}
          </button>
        )}
        <div style={{ flex: 1 }} />
        <button onClick={(e) => { e.stopPropagation(); setHistoryOpen(o => !o); }} className="tap"
          style={{ padding: '0 10px', height: 44, fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
          History {history.length ? <span style={{ marginLeft: 6, color: 'var(--ink-2)' }}>{history.length}</span> : ''}
          <span style={{ marginLeft: 6, display: 'inline-block', transform: historyOpen ? 'rotate(180deg)' : 'none', transition: 'transform 200ms ease' }}>▾</span>
        </button>
      </div>

      <SummaryCard summary={summary} />

      <div onClick={e => e.stopPropagation()}>
        <ExerciseNote note={note} onSave={(text) => onSaveNote(ex.id, text)} onDelete={() => onDeleteNote(ex.id)} />
      </div>

      {historyOpen && (
        <div onClick={e => e.stopPropagation()}>
          <HistoryView history={history} ex={ex} />
        </div>
      )}
    </article>
  );
}

// ── Previous session chip ──────────────────────────────────────
function PrevSessionChip({ ex, history }) {
  const [open, setOpen] = useState(false);
  const last = history.length ? history[history.length - 1] : null;
  if (!last) return null;

  const isCluster = !!last.clusterMode;
  const clusterWeight = isCluster && last.sets.length ? last.sets[0].weight : null;
  const bodyweight = ex.unit === '' && ex.weightMin === 0 && ex.weightMax === 0;

  const collapsedLabel = isCluster
    ? (bodyweight
        ? `${last.sets.map(s => s.reps).join(' · ')}`
        : `${fmt(clusterWeight)}${ex.unit ? ' ' + ex.unit : ''} — ${last.sets.map(s => s.reps).join(' · ')}`)
    : last.sets.map((s, j) => `${s.reps}×${fmt(s.weight)}`).join(' · ') + (ex.unit ? ' ' + ex.unit : '');

  return (
    <div style={{ marginBottom: 18 }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="tap"
        style={{
          width: '100%', minHeight: 40, padding: '8px 12px',
          display: 'flex', alignItems: 'center', gap: 8,
          justifyContent: 'flex-start', textAlign: 'left',
          background: 'var(--paper-2)', borderRadius: 6,
        }}
      >
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.10em',
          textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700, flexShrink: 0,
        }}>Last time</span>
        {!open && (
          <span className="num" style={{ fontSize: 12.5, color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {collapsedLabel}
          </span>
        )}
        {isCluster && !open && (
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted-2)',
            letterSpacing: '0.06em', flexShrink: 0,
          }}>cluster</span>
        )}
        <span style={{ flex: 1 }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted-2)', letterSpacing: '0.06em' }}>{shortDate(last.date)}</span>
        <span style={{ color: 'var(--muted-2)', fontSize: 10, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 200ms ease' }}>▾</span>
      </button>
      {open && (
        <div className="reveal" style={{ padding: '8px 12px 0' }}>
          {isCluster ? (
            <div>
              <div className="num" style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6, fontWeight: 500 }}>
                {!bodyweight && <span style={{ color: 'var(--muted)', marginRight: 8 }}>{fmt(clusterWeight)}{ex.unit ? ' ' + ex.unit : ''} —</span>}
                {last.sets.map((s, j) => (
                  <span key={j}>
                    {s.reps}
                    {j < last.sets.length - 1 && <span style={{ color: 'var(--muted-2)', margin: '0 4px' }}>·</span>}
                  </span>
                ))}
                <span style={{ color: 'var(--muted)', fontSize: 11, marginLeft: 6 }}>{last.sets.length} sets</span>
              </div>
            </div>
          ) : (
            <div className="num" style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6, fontWeight: 500 }}>
              {last.sets.map((s, j) => (
                <span key={j}>
                  {s.reps}<span style={{ color: 'var(--muted-2)' }}>×</span>{fmt(s.weight)}
                  {j < last.sets.length - 1 && <span style={{ color: 'var(--muted-2)', margin: '0 6px' }}>·</span>}
                </span>
              ))}
              {ex.unit && <span style={{ color: 'var(--muted)', fontSize: 11, marginLeft: 6 }}>{ex.unit}</span>}
            </div>
          )}
          {last.note && (
            <div style={{ marginTop: 4, fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>"{last.note}"</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Numeric input field (used in LiveSettingsPanel) ───────────
function NumField({ label, value, onChange, step = 1, min, max }) {
  const [str, setStr] = useState(String(value));
  useEffect(() => { setStr(String(value)); }, [value]);
  const commit = (raw) => {
    const v = parseFloat(raw);
    if (!Number.isFinite(v)) { setStr(String(value)); return; }
    const clamped = Math.max(min ?? -Infinity, Math.min(max ?? Infinity, v));
    onChange(clamped);
    setStr(String(clamped));
  };
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>{label}</div>
      <input
        type="number"
        inputMode="decimal"
        value={str}
        step={step}
        onChange={e => setStr(e.target.value)}
        onBlur={e => commit(e.target.value)}
        style={{ width: '100%', height: 38, border: '1px solid var(--hair)', borderRadius: 4, padding: '0 8px', background: 'var(--paper)', fontSize: 14, outline: 'none', color: 'var(--ink)' }}
      />
    </div>
  );
}

// ── Per-exercise settings panel ────────────────────────────────
function LiveSettingsPanel({ ex, onSave, onCancel }) {
  const [draft, setDraft] = useState({
    name: ex.name,
    sets: ex.sets, repCap: ex.repCap,
    repMin: ex.repMin, repMax: ex.repMax,
    weightMin: ex.weightMin, weightMax: ex.weightMax,
    restSeconds: ex.restSeconds || 30,
  });
  const set = (patch) => setDraft(d => ({ ...d, ...patch }));

  return (
    <div className="reveal" style={{
      margin: '0 0 18px', padding: '16px 16px 14px',
      background: 'var(--paper-2)', borderRadius: 8,
      border: '1px solid var(--hair)',
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700, marginBottom: 12,
      }}>Exercise settings</div>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--muted)' }}>Name</span>
        <input
          value={draft.name}
          onChange={e => set({ name: e.target.value })}
          style={{ height: 40, border: '1px solid var(--hair)', borderRadius: 4, padding: '0 10px', background: 'var(--paper)', fontSize: 15, outline: 'none', fontWeight: 600, color: 'var(--ink)' }}
        />
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <NumField label="Sets" value={draft.sets} min={1} max={10} onChange={v => set({ sets: v })} />
        <NumField label="Rep cap" value={draft.repCap} min={1} max={100} onChange={v => set({ repCap: v })} />
        <NumField label="Rep min" value={draft.repMin} min={1} max={draft.repMax} onChange={v => set({ repMin: v })} />
        <NumField label="Rep max" value={draft.repMax} min={draft.repMin} max={draft.repCap} onChange={v => set({ repMax: v })} />
        <NumField label={`Wt min (${ex.unit || '—'})`} value={draft.weightMin} step={ex.weightStep} min={0} max={draft.weightMax} onChange={v => set({ weightMin: v })} />
        <NumField label={`Wt max (${ex.unit || '—'})`} value={draft.weightMax} step={ex.weightStep} min={draft.weightMin} max={9999} onChange={v => set({ weightMax: v })} />
        <NumField label="Rest timer (s)" value={draft.restSeconds} min={5} max={60} onChange={v => set({ restSeconds: Math.round(v) })} />
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button onClick={onCancel} className="tap" style={{ flex: 1, height: 44, borderRadius: 6, border: '1px solid var(--hair)', color: 'var(--ink-2)', fontSize: 13, fontWeight: 500 }}>Cancel</button>
        <button onClick={() => onSave(draft)} className="tap" style={{ flex: 1, height: 44, borderRadius: 6, background: 'var(--accent)', color: '#FFFFFF', fontSize: 13, fontWeight: 600 }}>Save</button>
      </div>
    </div>
  );
}

// ── Live Exercise Mode ─────────────────────────────────────────
function LiveExerciseView({
  ex, history, note, customWeights, originRect, onClose,
  onLog, onApplyIncrement,
  onSaveNote, onDeleteNote, onAddCustomWeight, onRemoveCustomWeight, onUpdateEx,
}) {
  const [phase, setPhase] = useState('enter');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [logMode, setLogMode] = useState('cluster'); // 'cluster' | 'plain'
  const [justLogged, setJustLogged] = useState(null);
  const [progConfirmed, setProgConfirmed] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setPhase('open'));
    return () => cancelAnimationFrame(raf);
  }, []);

  const requestClose = () => {
    setPhase('leaving');
    setTimeout(onClose, 240);
  };

  const cx = originRect ? originRect.left + originRect.width / 2 : window.innerWidth / 2;
  const cy = originRect ? originRect.top + originRect.height / 2 : window.innerHeight / 2;
  const vx = window.innerWidth / 2;
  const vy = window.innerHeight / 2;
  const dx = cx - vx, dy = cy - vy;
  const collapsed = phase !== 'open';
  const sheetStyle = {
    position: 'fixed', inset: 0, zIndex: 200,
    background: 'var(--paper)',
    display: 'flex', flexDirection: 'column',
    transform: collapsed ? `translate(${dx}px, ${dy}px) scale(0.5)` : 'translate(0, 0) scale(1)',
    opacity: collapsed ? 0 : 1,
    transformOrigin: 'center center',
    transition: 'transform 260ms cubic-bezier(.2,.7,.3,1), opacity 220ms ease',
    willChange: 'transform, opacity',
  };

  const handleDone = (sets, meta = {}) => {
    const clusterMode = meta.clusterMode || false;
    if (onAddCustomWeight) {
      sets.forEach(s => { if (s.weight > 0) onAddCustomWeight(ex.id, s.weight); });
    }
    onLog(ex.id, { sets, clusterMode }, deriveStatus(ex));
    const progTriggered = clusterMode ? clusterTriggersProgression(sets) : false;
    setJustLogged({ sets, clusterMode, progTriggered });
  };

  const handleSaveSettings = (draft) => {
    onUpdateEx(ex.id, draft);
    setSettingsOpen(false);
  };

  return (
    <div style={sheetStyle}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '16px 14px 12px', flexShrink: 0,
        borderBottom: '1px solid var(--hair)',
      }}>
        <button onClick={requestClose} aria-label="Back" className="tap" style={{
          width: 40, height: 40, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--ink-2)',
        }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 4.5L6 10l6.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h2 style={{
          flex: 1, minWidth: 0, margin: 0,
          fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 19,
          color: 'var(--ink)', letterSpacing: '-0.015em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{ex.name}</h2>
        <button onClick={() => setSettingsOpen(o => !o)} aria-label="Exercise settings" className="tap" style={{
          width: 40, height: 40, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: settingsOpen ? 'var(--accent)' : 'var(--ink-2)',
        }}>
          <svg width="19" height="19" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="2.6" stroke="currentColor" strokeWidth="1.6" />
            <path d="M10 1.8v2.1M10 16.1v2.1M3.5 3.5l1.5 1.5M15 15l1.5 1.5M1.8 10h2.1M16.1 10h2.1M3.5 16.5L5 15M15 5l1.5-1.5"
              stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 18px 32px' }}>
        <div className="num" style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 500, marginBottom: 14 }}>
          {targetString(ex)}{ex.notation ? ` · ${ex.notation}` : ''}
        </div>

        {settingsOpen && (
          <LiveSettingsPanel ex={ex} onSave={handleSaveSettings} onCancel={() => setSettingsOpen(false)} />
        )}

        <PrevSessionChip ex={ex} history={history} />

        {justLogged ? (
          <div>
            <ClusterDoneSummary sets={justLogged.sets} ex={ex} />

            {/* Progression prompt */}
            {justLogged.clusterMode && justLogged.progTriggered && !progConfirmed && (
              <div className="reveal" style={{
                marginTop: 14, padding: '16px 18px',
                background: 'var(--accent-tint)',
                borderLeft: '3px solid var(--accent)',
                borderRadius: 4,
              }}>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em',
                  textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700, marginBottom: 8,
                }}>Progression signal</div>
                <div style={{ fontSize: 15, color: 'var(--ink)', fontWeight: 500, lineHeight: 1.4 }}>
                  You completed <span className="num" style={{ color: 'var(--accent)', fontWeight: 700 }}>{justLogged.sets.length}</span> mini-sets before reaching 3 reps.
                  Increase weight next session?
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                  <button onClick={() => setProgConfirmed(true)} className="tap" style={{
                    flex: 1, height: 44, borderRadius: 6,
                    color: 'var(--muted)', fontSize: 13, fontWeight: 500,
                  }}>Not yet</button>
                  <button onClick={() => { onApplyIncrement(ex.id); setProgConfirmed(true); }} className="tap" style={{
                    flex: 2, height: 44, borderRadius: 6,
                    background: 'var(--accent)', color: '#FFFFFF',
                    fontSize: 13, fontWeight: 600,
                  }}>Yes, increase</button>
                </div>
              </div>
            )}

            {progConfirmed && justLogged.progTriggered && (
              <div className="reveal" style={{
                marginTop: 10, padding: '10px 14px',
                background: 'var(--st-stable-bg)', borderRadius: 6,
                fontSize: 13, color: 'var(--st-stable)', fontWeight: 600,
                fontFamily: 'var(--font-mono)', letterSpacing: '0.04em',
              }}>✓ Weight range updated for next session</div>
            )}

            <button onClick={requestClose} className="tap" style={{
              width: '100%', height: 48, marginTop: 18, borderRadius: 6,
              background: 'var(--ink)', color: 'var(--paper)',
              fontSize: 14, fontWeight: 600, letterSpacing: '0.02em',
            }}>Back to Day</button>
          </div>
        ) : logMode === 'cluster' ? (
          <ClusterLoggingPanel
            ex={ex}
            customWeights={customWeights}
            onRemoveCustomWeight={(w) => onRemoveCustomWeight && onRemoveCustomWeight(ex.id, w)}
            onAddCustomWeight={() => {}}
            onCancel={requestClose}
            onDone={handleDone}
            onSwitchToPlain={() => setLogMode('plain')}
          />
        ) : (
          <PlainLoggingPanel
            ex={ex}
            customWeights={customWeights}
            onRemoveCustomWeight={(w) => onRemoveCustomWeight && onRemoveCustomWeight(ex.id, w)}
            onAddCustomWeight={() => {}}
            onCancel={() => setLogMode('cluster')}
            onDone={(sets) => handleDone(sets, {})}
          />
        )}

        <HistoryView history={history} ex={ex} />
      </div>
    </div>
  );
}

// ── History ────────────────────────────────────────────────────
function HistoryView({ history, ex }) {
  if (history.length === 0) {
    return (
      <div className="reveal" style={{
        marginTop: 14, paddingTop: 14, borderTop: '1px dashed var(--hair-2)',
        fontSize: 13, color: 'var(--muted)', fontWeight: 500,
      }}>No sessions logged yet.</div>
    );
  }
  const bodyweight = ex.unit === '' && ex.weightMin === 0 && ex.weightMax === 0;

  return (
    <div className="reveal" style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed var(--hair-2)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {history.slice().reverse().map((s, i) => {
          const isCluster = !!s.clusterMode;
          const clusterWeight = isCluster && s.sets.length ? s.sets[0].weight : null;

          return (
            <div key={i} style={{ display: 'flex', gap: 14 }}>
              <div style={{
                width: 56, flexShrink: 0,
                fontFamily: 'var(--font-mono)', fontSize: 10,
                color: 'var(--muted)', letterSpacing: '0.06em',
                textTransform: 'uppercase', paddingTop: 2, fontWeight: 600,
              }}>{shortDate(s.date)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {isCluster ? (
                  <div>
                    <div className="num" style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6, fontWeight: 500 }}>
                      {!bodyweight && (
                        <span style={{ color: 'var(--muted)', marginRight: 6 }}>
                          {fmt(clusterWeight)}{ex.unit ? ' ' + ex.unit : ''} —
                        </span>
                      )}
                      {s.sets.map((set, j) => (
                        <span key={j}>
                          {set.reps}
                          {j < s.sets.length - 1 && <span style={{ color: 'var(--muted-2)', margin: '0 4px' }}>·</span>}
                        </span>
                      ))}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted-2)',
                      letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2,
                    }}>{s.sets.length} mini-sets · cluster</div>
                  </div>
                ) : (
                  <div className="num" style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6, fontWeight: 500 }}>
                    {s.sets.map((set, j) => (
                      <span key={j}>
                        {set.reps}<span style={{ color: 'var(--muted-2)' }}>×</span>{fmt(set.weight)}
                        {j < s.sets.length - 1 && <span style={{ color: 'var(--muted-2)', margin: '0 6px' }}>·</span>}
                      </span>
                    ))}
                    {s.unit && <span style={{ color: 'var(--muted)', fontSize: 11, marginLeft: 6 }}>{ex.repUnit && ex.repUnit !== 'reps' ? `${ex.repUnit} × ${s.unit}` : s.unit}</span>}
                  </div>
                )}
                {s.note && (
                  <div style={{ marginTop: 4, fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                    "{s.note}"
                  </div>
                )}
                {s.progression && (
                  <div style={{
                    marginTop: 4, fontSize: 10, fontFamily: 'var(--font-mono)',
                    color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600,
                  }}>
                    {s.progression.kind === 'reps'
                      ? `Progressed → ${s.progression.toReps} reps`
                      : s.progression.kind === 'range'
                        ? `Range updated → ${fmt(s.progression.toWeight)}${ex.unit ? ' ' + ex.unit : ''}`
                      : s.progression.kind === 'weight'
                        ? `Progressed → ${fmt(s.progression.toWeight)}${ex.unit ? ' ' + ex.unit : ''}`
                        : `Progressed`}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, {
  StatusBadge, HairlineHeading, ChoiceRow, Stepper,
  ClusterLoggingPanel, PlainLoggingPanel, SummaryCard,
  ExerciseCard, LiveExerciseView, HistoryView, ExerciseNote,
});
