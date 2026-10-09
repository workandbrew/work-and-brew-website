import { useState } from "react";

// Small, dependency-free SVG charts for the Team Hub (desktop).
// One series per chart in the brand's dark brown; hairline grid; hover/focus tooltips;
// every chart also has a "View as table" so no value is hover-only.

const INK = "#2C1A0E";
const GRID = "#EDE3D6";
const TRACK = "#EDE3D6";

const shortDay = (iso) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });

// 0 → 1, 7 → 10, 13 → 20, 120 → 200 — clean axis maximums
function niceMax(v) {
  if (v <= 1) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 5, 10].map((m) => m * p).find((n) => n >= v);
}

function TableView({ head, rows }) {
  return (
    <details className="hc-table">
      <summary>View as table</summary>
      <table>
        <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
      </table>
    </details>
  );
}

// Column chart: texts sent per day.
export function DailyBars({ daily }) {
  const [hover, setHover] = useState(null);
  const W = 760, H = 230, L = 34, R = 8, T = 14, B = 28;
  const pw = W - L - R, ph = H - T - B;
  const max = niceMax(Math.max(...daily.map((d) => d.sent), 0));
  const slot = pw / daily.length;
  const bw = Math.min(18, slot - 6);
  const y = (v) => T + ph - (v / max) * ph;
  const peak = daily.reduce((best, d, i) => (d.sent > (daily[best]?.sent ?? -1) ? i : best), 0);
  const ticks = [0, max / 2, max];
  const h = hover != null ? daily[hover] : null;

  return (
    <div className="hc">
      <div className="hc-plot">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Texts sent per day, last 30 days">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth="1" />
              <text x={L - 8} y={y(t) + 4} textAnchor="end" className="hc-tick">{Number.isInteger(t) ? t : t.toFixed(1)}</text>
            </g>
          ))}
          {daily.map((d, i) => {
            const x = L + i * slot + (slot - bw) / 2;
            const top = y(d.sent);
            const bh = T + ph - top;
            return (
              <g key={d.date}>
                {d.sent > 0 && (
                  <path
                    d={`M${x},${T + ph} V${top + Math.min(4, bh)} Q${x},${top} ${x + Math.min(4, bw / 2)},${top} H${x + bw - Math.min(4, bw / 2)} Q${x + bw},${top} ${x + bw},${top + Math.min(4, bh)} V${T + ph} Z`}
                    fill={INK} opacity={hover == null || hover === i ? 1 : 0.35}
                  />
                )}
                {i % 5 === 4 || i === daily.length - 1 ? (
                  <text x={x + bw / 2} y={H - 8} textAnchor="middle" className="hc-tick">{shortDay(d.date)}</text>
                ) : null}
                <rect
                  x={L + i * slot} y={T} width={slot} height={ph} fill="transparent" tabIndex={0}
                  aria-label={`${shortDay(d.date)}: ${d.sent} sent${d.failed ? `, ${d.failed} failed` : ""}`}
                  onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(i)} onBlur={() => setHover(null)}
                />
              </g>
            );
          })}
          {daily[peak]?.sent > 0 && hover == null && (
            <text x={L + peak * slot + slot / 2} y={y(daily[peak].sent) - 6} textAnchor="middle" className="hc-val">
              {daily[peak].sent}
            </text>
          )}
        </svg>
        {h && (
          <div className="hc-tip" style={{ left: `${Math.min(90, Math.max(10, ((L + hover * slot + slot / 2) / W) * 100))}%` }}>
            <strong>{h.sent} sent</strong>
            {h.failed > 0 && <span className="hc-tip-bad">{h.failed} failed</span>}
            <span>{shortDay(h.date)}</span>
          </div>
        )}
      </div>
      <TableView head={["Day", "Sent", "Failed"]} rows={[...daily].reverse().map((d) => [shortDay(d.date), d.sent, d.failed])} />
    </div>
  );
}

// Horizontal bars, one series (e.g. team members per chapter, texts per sender).
export function HBars({ rows, unit }) {
  const [hover, setHover] = useState(null);
  if (!rows.length) return <p className="hc-empty">Nothing to show yet.</p>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="hc">
      <ul className="hc-hbars">
        {rows.map((r, i) => (
          <li key={r.label} tabIndex={0}
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(i)} onBlur={() => setHover(null)}>
            <span className="hc-hlabel">{r.label}</span>
            <span className="hc-htrack">
              <span className="hc-hbar" style={{ width: `${(r.value / max) * 100}%`, opacity: hover == null || hover === i ? 1 : 0.35 }} />
            </span>
            <span className="hc-hval">{r.value}</span>
          </li>
        ))}
      </ul>
      <TableView head={["", unit]} rows={rows.map((r) => [r.label, r.value])} />
    </div>
  );
}

// Meter: share of texts delivered to the carrier.
export function DeliveryMeter({ sent, failed }) {
  const total = sent + failed;
  const pct = total ? Math.round((sent / total) * 100) : null;
  return (
    <div className="hc-meter">
      <div className="hc-meter-top">
        <span className="hc-meter-value">{pct == null ? "—" : `${pct}%`}</span>
        <span className="hc-meter-sub">{total ? `${sent} of ${total} texts went through` : "No texts in the last 30 days"}</span>
      </div>
      <div className="hc-meter-track" style={{ background: TRACK }}
        role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct ?? 0} aria-label="Delivery rate">
        <div className="hc-meter-fill" style={{ width: `${pct ?? 0}%`, background: INK }} />
      </div>
      {failed > 0 && <p className="hc-meter-note">⚠ {failed} failed — see “Why it failed” in Sent texts</p>}
    </div>
  );
}

// Tiny trend line for a stat tile.
export function Sparkline({ values }) {
  if (!values.length) return null;
  const W = 120, H = 30, max = Math.max(...values, 1);
  const pts = values.map((v, i) => `${(i / Math.max(values.length - 1, 1)) * W},${H - 2 - (v / max) * (H - 4)}`);
  const last = pts[pts.length - 1].split(",");
  return (
    <svg className="hc-spark" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <polyline points={pts.join(" ")} fill="none" stroke={INK} strokeOpacity="0.35" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="3.5" fill={INK} stroke="#FFFDF9" strokeWidth="2" />
    </svg>
  );
}

// Frame for a source that isn't connected yet — no fake numbers.
export function NotConnected({ source, what }) {
  return (
    <div className="hc-nc">
      <svg viewBox="0 0 300 90" aria-hidden="true">
        {[20, 45, 70].map((y) => <line key={y} x1="0" x2="300" y1={y} y2={y} stroke={GRID} strokeWidth="1" />)}
        <polyline points="0,70 50,62 100,66 150,48 200,52 250,34 300,38" fill="none" stroke="#D5C6B2" strokeWidth="2" strokeDasharray="0" />
      </svg>
      <p><strong>Connect {source}</strong> to see {what} here.</p>
    </div>
  );
}
