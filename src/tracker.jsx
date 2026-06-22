// tracker.jsx — exercise card, logging, progression, notes, history
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
      background: s.bg,
      lineHeight: 1,
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

// ── Deterministic next-session verdict (v4) ────────────────────
// Exactly three outcomes, shown inline the moment a set is logged.
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

// ── Rep / Weight tap targets ───────────────────────────────────
function ChoiceRow({ label, options, value, onPick, formatter, unit, optimum, allowCustom, customOptions, onRemoveOption, onTyping, onCommitCustom }) {
  const [customStr, setCustomStr] = useState('');
  const isCustom = value != null && !options.includes(value);

  // Keep custom field in sync when value is set externally to a non-preset
  useEffect(() => {
    if (isCustom) setCustomStr(String(value));
  }, [value, isCustom]);

  const commitCustom = (raw) => {
    const v = parseFloat(raw);
    if (Number.isFinite(v) && v >= 0) {
      onPick(v);
      // Persist the typed value as a saved preset right away, so it becomes a
      // tappable button for the remaining sets in this same session (not only
      // on the next open). No-op if it already matches a default/preset option.
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

// ── Logging panel (one row per set) ───────────────────────────
function LoggingPanel({ ex, onCancel, onDone, customWeights, onRemoveCustomWeight, onAddCustomWeight }) {
  const repOptions = useMemo(() => repButtonRange(ex), [ex]);
  const repWord = ex.repUnit || 'reps';
  const repLabel = repWord.charAt(0).toUpperCase() + repWord.slice(1);

  // Custom weights typed during THIS session. Tracked locally so a value entered
  // on one set shows up as a tappable preset on the remaining sets immediately —
  // without waiting on a parent re-read. Merged with any persisted presets.
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

  // A typed custom weight is committed: surface it on the remaining sets right
  // away (local state) AND persist it so it survives to the next open.
  const handleCommitCustom = (v) => {
    setSessionCustoms(prev => prev.includes(v) ? prev : [...prev, v]);
    if (onAddCustomWeight) onAddCustomWeight(v);
  };

  const bodyweight = ex.unit === '' && ex.weightMin === 0 && ex.weightMax === 0;
  const initialSet = () => ({ reps: null, weight: bodyweight ? 0 : null });
  const [sets, setSets] = useState(() => Array.from({ length: ex.sets }, initialSet));
  const [activeSet, setActiveSet] = useState(0);
  // True while a text field is focused. Gates BOTH the auto-advance and the
  // Save action so nothing fires mid-typing in the custom-weight field.
  const [typing, setTyping] = useState(false);

  const updateSet = (i, patch) => {
    setSets(prev => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s));
  };

  const allLogged = sets.every(s => s.reps != null && s.weight != null);

  // Auto-advance to next set after both reps + weight chosen
  useEffect(() => {
    if (typing) return; // never advance while the user is typing a weight
    const s = sets[activeSet];
    if (s && s.reps != null && s.weight != null && activeSet < sets.length - 1) {
      const t = setTimeout(() => setActiveSet(activeSet + 1), 220);
      return () => clearTimeout(t);
    }
  }, [sets, activeSet, typing]);

  return (
    <div className="reveal" style={{ paddingTop: 18 }}>
      <HairlineHeading kicker="Log session" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22, paddingTop: 16 }}>
        {sets.map((s, i) => {
          const isActive = i === activeSet;
          const done = s.reps != null && s.weight != null;
          return (
            <div key={i} className={isActive ? 'reveal' : ''}
              style={{
                opacity: isActive || done ? 1 : 0.42,
                transition: 'opacity 200ms ease',
              }}>
              <button
                onClick={() => setActiveSet(i)}
                style={{
                  display: 'flex', alignItems: 'baseline', gap: 10, width: '100%',
                  textAlign: 'left', padding: '0 0 10px',
                }}>
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
                      label={`Weight ${ex.unit ? `(${ex.unit})` : ''}`.trim()}
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
              {done && (
                <VerdictLine verdict={nextSessionVerdict(ex, s)} style={{ marginTop: 10 }} />
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 10, paddingTop: 24 }}>
        <button onClick={onCancel} className="tap" style={{
          flex: 1, height: 48, borderRadius: 6,
          border: '1px solid var(--hair)', color: 'var(--ink-2)',
          fontSize: 14, fontWeight: 500,
        }}>
          Cancel
        </button>
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

// ══════════════════════════════════════════════════════════════
//  POST-LOG PROGRESSION FLOW (v3)
//  After a session is saved, a small queue of prompts appears below the
//  card — one at a time — driven by buildPrompts(). Each is an explicit
//  confirm. When the queue empties, the collapsed summary card remains.
// ══════════════════════════════════════════════════════════════

// What the weight range becomes after one standard increment.
function incrementPreview(ex) {
  const step = incrementFor(ex);
  const newMin = roundToStep(ex.weightMin + step, step);
  const newMax = roundToStep(ex.weightMax + step, step);
  const unit = ex.unit ? ' ' + ex.unit : '';
  const range = newMin === newMax ? fmt(newMax) : `${fmt(newMin)}–${fmt(newMax)}`;
  return { step, newMin, newMax, label: `${range}${unit}` };
}

// Shared shell for every prompt panel.
function PromptShell({ kicker, accent = 'var(--accent)', tint = 'var(--accent-tint)', children }) {
  return (
    <div className="reveal" style={{
      marginTop: 16, padding: '16px 18px 16px',
      background: tint,
      borderLeft: `3px solid ${accent}`,
      borderRadius: 4,
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em',
        textTransform: 'uppercase', color: accent, marginBottom: 9, fontWeight: 600,
      }}>{kicker}</div>
      {children}
    </div>
  );
}

function PromptActions({ confirmLabel, onConfirm, onDismiss, dismissLabel = 'Not now' }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
      <button onClick={onDismiss} className="tap" style={{
        flex: 1, height: 44, borderRadius: 6,
        color: 'var(--muted)', fontSize: 13, fontWeight: 500,
      }}>{dismissLabel}</button>
      <button onClick={onConfirm} className="tap" style={{
        flex: 2, height: 44, borderRadius: 6,
        background: 'var(--accent)', color: '#FFFFFF',
        fontSize: 13, fontWeight: 600, letterSpacing: '0.02em',
      }}>{confirmLabel}</button>
    </div>
  );
}

function PromptHeadline({ children }) {
  return (
    <div style={{
      fontFamily: 'var(--font-sans)', fontSize: 19, lineHeight: 1.3,
      color: 'var(--ink)', fontWeight: 500, letterSpacing: '-0.01em',
    }}>{children}</div>
  );
}

// 1 — Dynamic weight detection
function DynamicWeightPrompt({ ex, x, newFloor, onConfirm, onDismiss }) {
  const unit = ex.unit ? ' ' + ex.unit : '';
  return (
    <PromptShell kicker="Above your range">
      <PromptHeadline>
        You logged <span className="num" style={{ color: 'var(--accent)' }}>{fmt(x)}{unit}</span> — above your
        current target range. Update your working range to <span className="num">{fmt(x)}{unit}</span>?
      </PromptHeadline>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)',
        marginTop: 8, letterSpacing: '0.04em',
      }}>New range → {fmt(newFloor)}–{fmt(x)}{unit} · same spread</div>
      <PromptActions confirmLabel={`Update to ${fmt(x)}${unit}`} onConfirm={onConfirm} onDismiss={onDismiss} dismissLabel="Keep range" />
    </PromptShell>
  );
}

// 2 — Double progression
function ProgressionPrompt({ ex, onConfirm, onDismiss }) {
  const bw = ex.unit === '' && ex.weightMin === 0 && ex.weightMax === 0;
  const atRepCap = ex.repMax >= ex.repCap;
  const prev = bw ? null : incrementPreview(ex);
  return (
    <PromptShell kicker="Criteria met">
      <PromptHeadline>
        Progression criteria met. <span style={{ color: 'var(--accent)' }}>Increase load?</span>
      </PromptHeadline>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)',
        marginTop: 8, letterSpacing: '0.04em',
      }}>
        {bw
          ? `Add a rep → target ${Math.min(ex.repCap, ex.repMax + 1)} ${ex.repUnit || 'reps'}`
          : `+${fmt(prev.step)}${ex.unit ? ' ' + ex.unit : ''} → ${prev.label}${atRepCap ? ' · reps stay at cap' : ' · reps reset to floor'}`}
      </div>
      <PromptActions confirmLabel={bw ? 'Add a rep' : 'Increase load'} onConfirm={onConfirm} onDismiss={onDismiss} dismissLabel="Hold" />
    </PromptShell>
  );
}

// 3 — Overload signal (exceeded rep ceiling by ≥2)
function OverloadPrompt({ ex, set, excess, onConfirm, onDismiss }) {
  const prev = incrementPreview(ex);
  return (
    <PromptShell kicker="Load may be light">
      <PromptHeadline>
        You exceeded your rep target by <span className="num" style={{ color: 'var(--accent)' }}>{excess}</span> rep{excess === 1 ? '' : 's'} on
        set <span className="num">{set}</span>. Load may be too light. <span style={{ color: 'var(--accent)' }}>Increase weight now?</span>
      </PromptHeadline>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)',
        marginTop: 8, letterSpacing: '0.04em',
      }}>+{fmt(prev.step)}{ex.unit ? ' ' + ex.unit : ''} → {prev.label}</div>
      <PromptActions confirmLabel="Increase weight" onConfirm={onConfirm} onDismiss={onDismiss} dismissLabel="Not yet" />
    </PromptShell>
  );
}

// 5 — Plateau suggestions: four tappable choices, each logged as a note.
const PLATEAU_CHOICES = [
  { text: 'Add one set', flag: false },
  { text: 'Slow the eccentric to 3 seconds', flag: false },
  { text: 'Reduce rest time by 30 seconds', flag: false },
  { text: 'Genuine plateau — consider a deload', flag: true },
];

function PlateauSuggestions({ reason, onChoose, onDismiss, compact }) {
  const intro = reason === 'identical'
    ? 'Three identical sessions in a row.'
    : 'Reps and weight are both maxed at the rep cap.';
  return (
    <div className={compact ? '' : 'reveal'} style={{
      marginTop: compact ? 12 : 16, padding: '14px 16px 12px',
      background: 'var(--st-plateau-bg)',
      borderLeft: '3px solid var(--st-plateau)',
      borderRadius: 4,
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em',
        textTransform: 'uppercase', color: 'var(--st-plateau)', marginBottom: 7, fontWeight: 600,
      }}>Plateau detected</div>
      <div style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.5, fontWeight: 500, marginBottom: 12 }}>
        {intro} Pick one to log as a note:
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {PLATEAU_CHOICES.map((c, i) => (
          <button
            key={i}
            onClick={() => onChoose(c.text, c.flag)}
            className="tap"
            style={{
              width: '100%', minHeight: 46, padding: '10px 14px',
              textAlign: 'left', justifyContent: 'flex-start',
              borderRadius: 6, background: 'var(--paper)',
              border: `1px solid ${c.flag ? 'var(--st-plateau)' : 'var(--hair)'}`,
              fontSize: 14, fontWeight: 500,
              color: c.flag ? 'var(--st-plateau)' : 'var(--ink)',
            }}
          >
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)',
              marginRight: 12, fontWeight: 600,
            }}>{i + 1}</span>
            {c.text}
          </button>
        ))}
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className="tap" style={{
          width: '100%', height: 36, marginTop: 8,
          fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.10em',
          color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600,
        }}>Dismiss</button>
      )}
    </div>
  );
}

// Queue driver — shows prompts one at a time, then closes.
function PostLogFlow({ ex, prompts, onApplyIncrement, onUpdateRange, onPlateauChoice, onClose }) {
  const [idx, setIdx] = useState(0);
  const advance = () => {
    if (idx + 1 >= prompts.length) onClose();
    else setIdx(idx + 1);
  };
  const p = prompts[idx];
  if (!p) return null;

  if (p.type === 'dynamicWeight') {
    return (
      <DynamicWeightPrompt
        ex={ex} x={p.x} newFloor={p.newFloor}
        onConfirm={() => { onUpdateRange(ex.id, p.x); advance(); }}
        onDismiss={advance}
      />
    );
  }
  if (p.type === 'overload') {
    return (
      <OverloadPrompt
        ex={ex} set={p.set} excess={p.excess}
        onConfirm={() => { onApplyIncrement(ex.id, 'overload'); advance(); }}
        onDismiss={advance}
      />
    );
  }
  if (p.type === 'progression') {
    return (
      <ProgressionPrompt
        ex={ex}
        onConfirm={() => { onApplyIncrement(ex.id, 'progression'); advance(); }}
        onDismiss={advance}
      />
    );
  }
  if (p.type === 'plateau') {
    return (
      <PlateauSuggestions
        reason={p.reason}
        onChoose={(text, flag) => { onPlateauChoice(ex.id, text, flag); advance(); }}
        onDismiss={advance}
      />
    );
  }
  return null;
}

// Collapsed post-session summary card — the deterministic next-session verdict.
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
        <span style={{
          flex: 1, minWidth: 0, fontSize: 13, color: 'var(--ink-2)', fontWeight: 500,
        }}>{v.text}</span>
        {perSet.length > 0 && (
          <span style={{
            display: 'inline-block', color: 'var(--muted-2)', fontSize: 11,
            transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 200ms ease',
          }}>▾</span>
        )}
      </button>
      {open && perSet.length > 0 && (
        <div className="reveal" style={{
          padding: '4px 14px 16px', display: 'flex', flexDirection: 'column', gap: 10,
        }}>
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

function SummaryLine({ n, label, value, accent }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted-2)',
        letterSpacing: '0.08em', width: 16, flexShrink: 0, paddingTop: 2,
      }}>{n}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.10em',
          textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 2,
        }}>{label}</div>
        <div style={{
          fontSize: 14, lineHeight: 1.4, fontWeight: 500,
          color: accent || 'var(--ink-2)',
        }}>{value}</div>
      </div>
    </div>
  );
}

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

// ── Persistent Exercise Note ───────────────────────────────────
// One note per exercise, persisted across sessions.
// Saved explicitly via Save button. Deleted explicitly via Delete.
// Never auto-cleared.
function ExerciseNote({ note, onSave, onDelete }) {
  const hasNote = !!(note && note.text);
  const [editing, setEditing] = useState(!hasNote ? false : false); // closed by default
  const [draft, setDraft] = useState(hasNote ? note.text : '');
  const [justSaved, setJustSaved] = useState(false);

  // If the persistent note changes externally, sync the draft
  useEffect(() => {
    setDraft(hasNote ? note.text : '');
  }, [note && note.text]);

  if (!hasNote && !editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="tap"
        style={{
          marginTop: 12,
          padding: '0 14px', height: 36, borderRadius: 6,
          fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.10em',
          color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600,
        }}
      >
        + Add note
      </button>
    );
  }

  if (hasNote && !editing) {
    return (
      <div style={{
        marginTop: 14, padding: '12px 14px',
        background: 'var(--paper-2)', borderRadius: 6,
        display: 'flex', gap: 12, alignItems: 'flex-start',
      }}>
        <div style={{
          flex: 1, fontSize: 13.5, color: 'var(--ink-2)',
          lineHeight: 1.55, whiteSpace: 'pre-wrap',
        }}>
          {note.text}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
          <button
            onClick={() => { setDraft(note.text); setEditing(true); }}
            className="tap"
            style={{
              padding: '4px 8px', minHeight: 28,
              fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.10em',
              color: 'var(--ink-2)', textTransform: 'uppercase', fontWeight: 600,
            }}
          >Edit</button>
          <button
            onClick={onDelete}
            className="tap"
            style={{
              padding: '4px 8px', minHeight: 28,
              fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.10em',
              color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600,
            }}
          >Delete</button>
        </div>
      </div>
    );
  }

  // editing
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
          onClick={() => {
            const text = draft.trim();
            if (!text) return;
            onSave(text);
            setEditing(false);
            setJustSaved(true);
          }}
          disabled={!draft.trim()}
          className="tap"
          style={{
            padding: '0 16px', height: 36, borderRadius: 6,
            background: draft.trim() ? 'var(--accent)' : 'var(--paper-2)',
            color: draft.trim() ? '#FFFFFF' : 'var(--muted-2)',
            fontSize: 12, fontWeight: 600, letterSpacing: '0.04em',
            textTransform: 'uppercase',
            cursor: draft.trim() ? 'pointer' : 'not-allowed',
          }}
        >
          Save Note
        </button>
        <button
          onClick={() => {
            setEditing(false);
            setDraft(hasNote ? note.text : '');
          }}
          className="tap"
          style={{
            padding: '0 12px', height: 36, borderRadius: 6,
            fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.10em',
            color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600,
          }}
        >
          Cancel
        </button>
        <span style={{ flex: 1 }} />
        {hasNote && (
          <button
            onClick={() => { onDelete(); setEditing(false); setDraft(''); }}
            className="tap"
            style={{
              padding: '0 10px', height: 36,
              fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.10em',
              color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600,
            }}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

// Deterministic next-session verdict commit — shared by the card's quick-log
// path (none anymore) and LiveExerciseView. Persists logged weights as
// presets, stamps the verdict snapshot, and applies the range-increase
// outcome exactly once per session. Pure side-effect orchestration — the
// actual three-state logic lives in nextSessionVerdict() (progression.js).
function commitSession(ex, sets, { onLog, onApplyIncrement, onAddCustomWeight }) {
  if (onAddCustomWeight) {
    sets.forEach(s => {
      if (s.weight != null && s.weight > 0) onAddCustomWeight(ex.id, s.weight);
    });
  }
  const snapshot = {
    verdict: governingVerdict(ex, sets),
    perSet: sets.map(s => nextSessionVerdict(ex, s)),
    status: deriveStatus(ex),
  };
  onLog(ex.id, { sets, summary: snapshot }, deriveStatus(ex));
  if (sessionRaisesRange(ex, sets)) onApplyIncrement(ex.id);
}

// ── Exercise card ─────────────────────────────────────────────
// Tapping anywhere on the card (other than the History toggle or the note
// editor) opens the exercise in full-screen Live Mode. The card itself no
// longer hosts the logging UI — it's a glanceable summary + entry point.
function ExerciseCard({ ex, history, note, onOpenLive, onSaveNote, onDeleteNote }) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const cardRef = useRef(null);

  const status = deriveStatus(ex);

  const summary = useMemo(() => {
    if (!history.length) return null;
    const last = history[history.length - 1];
    if (last.summary && last.summary.verdict) return last.summary;
    return summarize(ex, history);
  }, [ex, history]);

  const exNotation = ex.notation;

  const openLive = () => {
    const rect = cardRef.current ? cardRef.current.getBoundingClientRect() : null;
    onOpenLive(ex.id, rect);
  };

  return (
    <article
      ref={cardRef}
      onClick={openLive}
      style={{
        padding: '22px 22px 20px',
        borderBottom: '1px solid var(--hair-2)',
        position: 'relative',
        cursor: 'pointer',
      }}
    >
      {/* Title row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{
            margin: 0,
            fontFamily: 'var(--font-sans)', fontWeight: 600,
            fontSize: 20, lineHeight: 1.2, color: 'var(--ink)',
            letterSpacing: '-0.015em', textWrap: 'pretty',
          }}>
            {ex.name}
          </h3>
          <div style={{
            marginTop: 6, fontSize: 12, color: 'var(--muted)',
            display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 8,
            fontWeight: 500,
          }}>
            <span className="num">{targetString(ex)}</span>
            {exNotation && (
              <span style={{
                color: 'var(--muted-2)',
                fontFamily: 'var(--font-mono)', fontSize: 10,
                letterSpacing: '0.04em',
              }}>
                · {exNotation}
              </span>
            )}
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Idle action row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        marginTop: 18,
      }}>
        <span
          className="tap"
          style={{
            padding: '0 22px', height: 44, borderRadius: 6,
            background: 'var(--accent)', color: '#FFFFFF',
            fontSize: 13, fontWeight: 600, letterSpacing: '0.04em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}
        >
          Log Session
        </span>
        <div style={{ flex: 1 }} />
        <button
          onClick={(e) => { e.stopPropagation(); setHistoryOpen(o => !o); }}
          className="tap"
          style={{
            padding: '0 10px', height: 44,
            fontSize: 11, color: 'var(--muted)',
            fontFamily: 'var(--font-mono)', letterSpacing: '0.08em',
            textTransform: 'uppercase', fontWeight: 600,
          }}
        >
          History {history.length ? <span style={{ marginLeft: 6, color: 'var(--ink-2)' }}>{history.length}</span> : ''}
          <span style={{ marginLeft: 6, display: 'inline-block', transform: historyOpen ? 'rotate(180deg)' : 'none', transition: 'transform 200ms ease' }}>▾</span>
        </button>
      </div>

      {/* Session summary card (collapsed) */}
      <SummaryCard summary={summary} />

      {/* Persistent exercise note */}
      <div onClick={e => e.stopPropagation()}>
        <ExerciseNote
          note={note}
          onSave={(text) => onSaveNote(ex.id, text)}
          onDelete={() => onDeleteNote(ex.id)}
        />
      </div>

      {/* History */}
      {historyOpen && (
        <div onClick={e => e.stopPropagation()}>
          <HistoryView history={history} ex={ex} />
        </div>
      )}
    </article>
  );
}

// ── Previous session reference — collapsed chip, tap to expand ───────────
function PrevSessionChip({ ex, history }) {
  const [open, setOpen] = useState(false);
  const last = history.length ? history[history.length - 1] : null;
  if (!last) return null;

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
            {last.sets.map((s, j) => `${s.reps}×${fmt(s.weight)}`).join(' · ')}{ex.unit ? ' ' + ex.unit : ''}
          </span>
        )}
        <span style={{ flex: 1 }} />
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted-2)',
          letterSpacing: '0.06em',
        }}>{shortDate(last.date)}</span>
        <span style={{ color: 'var(--muted-2)', fontSize: 10, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 200ms ease' }}>▾</span>
      </button>
      {open && (
        <div className="reveal" style={{ padding: '8px 12px 0' }}>
          <div className="num" style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6, fontWeight: 500 }}>
            {last.sets.map((s, j) => (
              <span key={j}>
                {s.reps}<span style={{ color: 'var(--muted-2)' }}>×</span>{fmt(s.weight)}
                {j < last.sets.length - 1 && <span style={{ color: 'var(--muted-2)', margin: '0 6px' }}>·</span>}
              </span>
            ))}
            {ex.unit && <span style={{ color: 'var(--muted)', fontSize: 11, marginLeft: 6 }}>{ex.unit}</span>}
          </div>
          {last.note && (
            <div style={{ marginTop: 4, fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>“{last.note}”</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Per-exercise settings — inline expand/collapse, explicit Cancel/Save ──
// Scoped to exactly the exercise that's live. Drafts are local until Save;
// Cancel discards them. No partial/implicit commits.
function LiveSettingsPanel({ ex, onSave, onCancel }) {
  const [draft, setDraft] = useState({
    name: ex.name, sets: ex.sets, repCap: ex.repCap,
    repMin: ex.repMin, repMax: ex.repMax,
    weightMin: ex.weightMin, weightMax: ex.weightMax,
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
        textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700,
        marginBottom: 12,
      }}>Exercise settings</div>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.10em',
          textTransform: 'uppercase', color: 'var(--muted)',
        }}>Name</span>
        <input
          value={draft.name}
          onChange={e => set({ name: e.target.value })}
          style={{
            height: 40, border: '1px solid var(--hair)', borderRadius: 4,
            padding: '0 10px', background: 'var(--paper)', fontSize: 15,
            outline: 'none', fontWeight: 600, color: 'var(--ink)',
          }}
        />
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <NumField label="Sets" value={draft.sets} min={1} max={10} onChange={v => set({ sets: v })} />
        <NumField label="Rep cap" value={draft.repCap} min={1} max={100} onChange={v => set({ repCap: v })} />
        <NumField label="Rep min" value={draft.repMin} min={1} max={draft.repMax} onChange={v => set({ repMin: v })} />
        <NumField label="Rep max" value={draft.repMax} min={draft.repMin} max={draft.repCap} onChange={v => set({ repMax: v })} />
        <NumField label={`Wt min (${ex.unit || '—'})`} value={draft.weightMin} step={ex.weightStep} min={0} max={draft.weightMax} onChange={v => set({ weightMin: v })} />
        <NumField label={`Wt max (${ex.unit || '—'})`} value={draft.weightMax} step={ex.weightStep} min={draft.weightMin} max={9999} onChange={v => set({ weightMax: v })} />
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button onClick={onCancel} className="tap" style={{
          flex: 1, height: 44, borderRadius: 6,
          border: '1px solid var(--hair)', color: 'var(--ink-2)',
          fontSize: 13, fontWeight: 500,
        }}>Cancel</button>
        <button onClick={() => onSave(draft)} className="tap" style={{
          flex: 1, height: 44, borderRadius: 6,
          background: 'var(--accent)', color: '#FFFFFF',
          fontSize: 13, fontWeight: 600, letterSpacing: '0.02em',
        }}>Save</button>
      </div>
    </div>
  );
}

// ── Live Exercise Mode — full-screen focused view ─────────────────────────
// Entered by tapping an exercise card. Owns the entire screen: editable
// header, previous-session reference, the same set-by-set logging UI, and a
// settings gear scoped to just this exercise. The day's exercise list keeps
// running underneath, unmounted-in-place — closing Live Mode returns to it
// exactly as it was.
function LiveExerciseView({
  ex, history, note, customWeights, originRect, onClose,
  onLog, onApplyIncrement, onUpdateRange, onPlateauChoice,
  onSaveNote, onDeleteNote, onAddCustomWeight, onRemoveCustomWeight, onUpdateEx,
}) {
  const [phase, setPhase] = useState('enter'); // enter | open | leaving
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [justLogged, setJustLogged] = useState(null); // sets just committed, for SummaryCard

  useEffect(() => {
    const raf = requestAnimationFrame(() => setPhase('open'));
    return () => cancelAnimationFrame(raf);
  }, []);

  const requestClose = () => {
    setPhase('leaving');
    setTimeout(onClose, 240);
  };

  // Transform-origin transition: starts scaled down + offset toward the
  // tapped card's position, animates to a full-bleed sheet, and reverses on
  // close — the "zoom into this card" feel without a layout engine.
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

  const summary = useMemo(() => {
    if (justLogged) {
      return {
        verdict: governingVerdict(ex, justLogged),
        perSet: justLogged.map(s => nextSessionVerdict(ex, s)),
        status: deriveStatus(ex),
      };
    }
    if (!history.length) return null;
    const last = history[history.length - 1];
    if (last.summary && last.summary.verdict) return last.summary;
    return summarize(ex, history);
  }, [ex, history, justLogged]);

  const handleDone = (sets) => {
    commitSession(ex, sets, { onLog, onApplyIncrement, onAddCustomWeight });
    setJustLogged(sets);
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
        <button onClick={requestClose} aria-label="Back to exercise list" className="tap" style={{
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
          <LiveSettingsPanel
            ex={ex}
            onSave={handleSaveSettings}
            onCancel={() => setSettingsOpen(false)}
          />
        )}

        <PrevSessionChip ex={ex} history={history} />

        {justLogged ? (
          <SummaryCard summary={summary} />
        ) : (
          <LoggingPanel
            ex={ex}
            customWeights={customWeights}
            onRemoveCustomWeight={(w) => onRemoveCustomWeight && onRemoveCustomWeight(ex.id, w)}
            onAddCustomWeight={(w) => onAddCustomWeight && onAddCustomWeight(ex.id, w)}
            onCancel={requestClose}
            onDone={handleDone}
          />
        )}

        {justLogged && (
          <button onClick={requestClose} className="tap" style={{
            width: '100%', height: 48, marginTop: 18, borderRadius: 6,
            background: 'var(--ink)', color: 'var(--paper)',
            fontSize: 14, fontWeight: 600, letterSpacing: '0.02em',
          }}>Back to Day</button>
        )}

        <HistoryView history={history} ex={ex} />
      </div>
    </div>
  );
}

// ── History reveal ────────────────────────────────────────────
function HistoryView({ history, ex }) {
  if (history.length === 0) {
    return (
      <div className="reveal" style={{
        marginTop: 14, paddingTop: 14, borderTop: '1px dashed var(--hair-2)',
        fontSize: 13, color: 'var(--muted)', fontWeight: 500,
      }}>
        No sessions logged yet.
      </div>
    );
  }
  return (
    <div className="reveal" style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed var(--hair-2)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {history.slice().reverse().map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: 14 }}>
            <div style={{
              width: 56, flexShrink: 0,
              fontFamily: 'var(--font-mono)', fontSize: 10,
              color: 'var(--muted)', letterSpacing: '0.06em',
              textTransform: 'uppercase', paddingTop: 2, fontWeight: 600,
            }}>{shortDate(s.date)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="num" style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6, fontWeight: 500 }}>
                {s.sets.map((set, j) => (
                  <span key={j}>
                    {set.reps}<span style={{ color: 'var(--muted-2)' }}>×</span>{fmt(set.weight)}
                    {j < s.sets.length - 1 && <span style={{ color: 'var(--muted-2)', margin: '0 6px' }}>·</span>}
                  </span>
                ))}
                {s.unit && <span style={{ color: 'var(--muted)', fontSize: 11, marginLeft: 6 }}>{ex.repUnit && ex.repUnit !== 'reps' ? `${ex.repUnit} × ${s.unit}` : s.unit}</span>}
              </div>
              {s.note && (
                <div style={{
                  marginTop: 4, fontSize: 12.5, color: 'var(--ink-2)',
                  lineHeight: 1.5,
                }}>
                  “{s.note}”
                </div>
              )}
              {s.progression && (
                <div style={{
                  marginTop: 4, fontSize: 10, fontFamily: 'var(--font-mono)',
                  color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase',
                  fontWeight: 600,
                }}>
                  {s.progression.kind === 'reps'
                    ? `Progressed → ${s.progression.toReps} reps`
                    : s.progression.kind === 'range'
                      ? `Range updated → ${fmt(s.progression.toWeight)}${ex.unit ? ' ' + ex.unit : ''}`
                    : s.progression.kind === 'weight'
                      ? `Progressed → ${fmt(s.progression.toWeight)}${ex.unit ? ' ' + ex.unit : ''}`
                      : (s.progression.toWeight != null && s.progression.toReps != null)
                        ? `Progressed → ${fmt(s.progression.toWeight)}${ex.unit ? ' ' + ex.unit : ''} × ${s.progression.toReps} reps`
                        : s.progression.toReps != null
                          ? `Progressed → ${s.progression.toReps} reps`
                          : `Progressed → ${fmt(s.progression.toWeight)}${ex.unit ? ' ' + ex.unit : ''}`}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, {
  StatusBadge, HairlineHeading, ChoiceRow, LoggingPanel,
  ProgressionPrompt, OverloadPrompt, DynamicWeightPrompt, PlateauSuggestions,
  PostLogFlow, SummaryCard, PromptShell, Stepper, ExerciseCard, HistoryView, ExerciseNote,
});
