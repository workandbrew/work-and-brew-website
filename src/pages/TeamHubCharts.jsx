import { useState } from "react";

// Dependency-free SVG/HTML charts for the Team Hub (desktop).
// One series per chart in the brand's dark brown; hairline grid; hover + keyboard-focus tooltips;
// every chart also has a "View as table" so no value is hover-only.

const INK = "#2C1A0E";
const GRID = "#EFE7DB";
const GOOD = "#2F6B3A";
const BAD = "#B4442A";

const shortDay = (iso) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });

// 0 → 1, 7 → 10, 13 → 20, 120 → 200 — clean axis maximums
function niceMax(v) {
  if (v <= 1) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 5, 10].map((m) => m * p).find((n) => n >= v);
}

const initials = (name) =>
  String(name).replace(/\(.*?\)/g, "").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

function TableView({ head, rows }) {
  return (
    <details className="hc-table">
      <summary>View as table</summary>
      <div className="hc-table-scroll">
        <table>
          <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </details>
  );
}

// Signed change vs the previous period. More texts = good (green ▲).
export function Delta({ now, before, label = "vs. prior 30 days" }) {
  if (!before) return <span className="hc-delta neutral">{now ? "New this period" : "No activity yet"}</span>;
  const pct = Math.round(((now - before) / before) * 100);
  const dir = pct > 0 ? "up" : pct < 0 ? "down" : "flat";
  return (
    <span className={`hc-delta ${dir}`}>
      <span aria-hidden="true">{dir === "up" ? "▲" : dir === "down" ? "▼" : "■"}</span>
      {pct > 0 ? "+" : ""}{pct}% <span className="hc-delta-label">{label}</span>
    </span>
  );
}

// Column chart: texts sent per day.
export function DailyBars({ daily }) {
  const [hover, setHover] = useState(null);
  const W = 760, H = 220, L = 30, R = 6, T = 26, B = 26;
  const pw = W - L - R, ph = H - T - B;
  const max = niceMax(Math.max(...daily.map((d) => d.sent), 0));
  const slot = pw / daily.length;
  const bw = Math.min(14, slot - 8);
  const y = (v) => T + ph - (v / max) * ph;
  const peak = daily.reduce((best, d, i) => (d.sent > (daily[best]?.sent ?? -1) ? i : best), 0);
  const ticks = [0, max / 2, max];
  const h = hover != null ? daily[hover] : null;
  const bar = (x, top, bh) => {
    const r = Math.min(4, bh, bw / 2);
    return `M${x},${T + ph} V${top + r} Q${x},${top} ${x + r},${top} H${x + bw - r} Q${x + bw},${top} ${x + bw},${top + r} V${T + ph} Z`;
  };

  return (
    <div className="hc">
      <div className="hc-plot">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Texts sent per day, last 30 days">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke={t === 0 ? "#DCCFBD" : GRID} strokeWidth="1" />
              <text x={L - 10} y={y(t) + 4} textAnchor="end" className="hc-tick">{Number.isInteger(t) ? t : t.toFixed(1)}</text>
            </g>
          ))}
          {daily.map((d, i) => {
            const x = L + i * slot + (slot - bw) / 2;
            const top = y(d.sent);
            return (
              <g key={d.date}>
                {hover === i && <rect x={L + i * slot + 1} y={T} width={slot - 2} height={ph} rx="6" fill="#F6F0E6" />}
                {d.sent > 0 && <path d={bar(x, top, T + ph - top)} fill={INK} opacity={hover == null || hover === i ? 1 : 0.3} />}
                {(daily.length - 1 - i) % 7 === 0 && (
                  <text x={x + bw / 2} y={H - 6} textAnchor="middle" className="hc-tick">{shortDay(d.date)}</text>
                )}
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
            <g>
              <text x={L + peak * slot + slot / 2} y={y(daily[peak].sent) - 8} textAnchor="middle" className="hc-val">
                {daily[peak].sent}
              </text>
            </g>
          )}
        </svg>
        {h && (
          <div className="hc-tip" style={{ left: `${Math.min(88, Math.max(12, ((L + hover * slot + slot / 2) / W) * 100))}%` }}>
            <div className="hc-tip-date">{shortDay(h.date)}</div>
            <div className="hc-tip-row"><i style={{ background: INK }} /><strong>{h.sent}</strong> sent</div>
            {h.failed > 0 && <div className="hc-tip-row"><i style={{ background: BAD }} /><strong>{h.failed}</strong> failed</div>}
          </div>
        )}
      </div>
      <TableView head={["Day", "Sent", "Failed"]} rows={[...daily].reverse().map((d) => [shortDay(d.date), d.sent, d.failed])} />
    </div>
  );
}

// Ranked list with progress-style bars (e.g. texts per sender, people per chapter).
export function RankBars({ rows, unit, avatars = false }) {
  const [hover, setHover] = useState(null);
  if (!rows.length) return <p className="hc-empty">Nothing to show yet.</p>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  const total = rows.reduce((n, r) => n + r.value, 0);
  return (
    <div className="hc">
      <ul className="hc-rank">
        {rows.map((r, i) => (
          <li key={r.label} tabIndex={0} className={hover != null && hover !== i ? "dim" : ""}
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(i)} onBlur={() => setHover(null)}>
            {avatars && <span className="hc-avatar" aria-hidden="true">{initials(r.label)}</span>}
            <div className="hc-rank-body">
              <div className="hc-rank-top">
                <span className="hc-rank-label">{r.label}</span>
                <span className="hc-rank-val">{r.value}<span className="hc-rank-pct"> · {Math.round((r.value / (total || 1)) * 100)}%</span></span>
              </div>
              <span className="hc-rank-track"><span className="hc-rank-bar" style={{ width: `${(r.value / max) * 100}%` }} /></span>
            </div>
          </li>
        ))}
      </ul>
      <TableView head={["", unit, "Share"]} rows={rows.map((r) => [r.label, r.value, `${Math.round((r.value / (total || 1)) * 100)}%`])} />
    </div>
  );
}

// Delivery: one headline rate, a meter, and a labeled breakdown (status color + icon + text).
export function DeliveryMeter({ sent, failed }) {
  const total = sent + failed;
  const pct = total ? Math.round((sent / total) * 1000) / 10 : null;
  return (
    <div className="hc-meter">
      <div className="hc-meter-value">{pct == null ? "—" : `${pct}%`}</div>
      <div className="hc-meter-sub">{total ? "of texts reached the carrier" : "No texts in the last 30 days"}</div>
      <div className="hc-meter-track" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct ?? 0} aria-label="Delivery rate">
        <div className="hc-meter-fill" style={{ width: `${pct ?? 0}%` }} />
      </div>
      <div className="hc-meter-legend">
        <span><i style={{ background: GOOD }} />✓ Delivered <strong>{sent}</strong></span>
        <span><i style={{ background: BAD }} />✗ Failed <strong>{failed}</strong></span>
      </div>
    </div>
  );
}

// Tiny trend line for a stat tile.
export function Sparkline({ values }) {
  if (!values.length) return null;
  const W = 120, H = 28, max = Math.max(...values, 1);
  const pts = values.map((v, i) => [(i / Math.max(values.length - 1, 1)) * W, H - 3 - (v / max) * (H - 6)]);
  const line = pts.map((p) => p.join(",")).join(" ");
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg className="hc-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <polygon points={`0,${H} ${line} ${W},${H}`} fill={INK} fillOpacity="0.07" />
      <polyline points={line} fill="none" stroke={INK} strokeOpacity="0.45" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={lx} cy={ly} r="3" fill={INK} />
    </svg>
  );
}

// Empty state for a source that isn't connected yet — no fake numbers.
export function NotConnected({ icon, source, what, setup }) {
  return (
    <div className="hc-nc">
      <span className="hc-nc-icon" aria-hidden="true">{icon}</span>
      <div>
        <p className="hc-nc-title">Connect {source}</p>
        <p className="hc-nc-text">to see {what} here.</p>
        {setup && <p className="hc-nc-setup">{setup}</p>}
      </div>
    </div>
  );
}
