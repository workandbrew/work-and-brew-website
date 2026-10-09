import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import "./PageShared.css";
import "./TeamHub.css";
import { DailyBars, RankBars, DeliveryMeter, Sparkline, NotConnected, Delta } from "./TeamHubCharts";

// Private Team Hub for department heads: send texts to the team, see every text sent, see the roster.
// Access is checked on the server (/api/hub) against the hub_admins table — this page only shows
// what the server returns.

const MAX_CHARS = 480;

async function hubFetch(method, body) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  const r = await fetch("/api/hub", {
    method,
    headers: { "content-type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await r.json().catch(() => ({}));
  return { status: r.status, ...json };
}

function when(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function fromLabel(from) {
  if (from === "gwen") return "Den (via Gwen)";
  return String(from || "").replace(/^Team Hub · /, "");
}

function Compose({ data, onSent }) {
  const [everyone, setEveryone] = useState(false);
  const [chapters, setChapters] = useState([]);
  const [people, setPeople] = useState([]);
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null);

  const textable = useMemo(() => data.team.filter((p) => p.canText), [data.team]);
  const toggle = (list, setList, v) => setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const to = everyone ? ["all"] : [...chapters, ...people];
  const resetPreview = () => { setPreview(null); setNote(null); };

  const doPreview = async () => {
    setBusy(true); setNote(null);
    const r = await hubFetch("POST", { action: "preview", to, message });
    setBusy(false);
    if (r.ok) setPreview(r);
    else setNote({ bad: true, text: r.error || "Something went wrong." });
  };

  const doSend = async () => {
    setBusy(true);
    // send to exactly the people shown in the preview
    const r = await hubFetch("POST", { action: "send", to: preview.recipients.map((p) => p.id), message });
    setBusy(false);
    if (r.sent) {
      setNote({ bad: !!r.failed, text: `Sent to ${r.sent}${r.failed ? `, ${r.failed} failed` : ""}.` });
      setPreview(null); setMessage(""); setEveryone(false); setChapters([]); setPeople([]);
      onSent();
    } else {
      setNote({ bad: true, text: r.error || (r.results || []).map((x) => `${x.name}: ${x.error}`).join("; ") || "Not sent." });
    }
  };

  return (
    <section className="hub-card">
      <h2 className="hub-h2">Send a text</h2>

      <div className="hub-label">To</div>
      <div className="hub-chips">
        <button type="button" className={`hub-chip ${everyone ? "on" : ""}`}
          onClick={() => { setEveryone(!everyone); resetPreview(); }}>Everyone</button>
        {data.chapters.map((c) => (
          <button type="button" key={c} disabled={everyone}
            className={`hub-chip ${chapters.includes(c) ? "on" : ""}`}
            onClick={() => { toggle(chapters, setChapters, c); resetPreview(); }}>{c}</button>
        ))}
      </div>
      <details className="hub-people">
        <summary>Pick people{people.length ? ` (${people.length})` : ""}</summary>
        <div className="hub-chips">
          {textable.map((p) => (
            <button type="button" key={p.id} disabled={everyone}
              className={`hub-chip ${people.includes(p.id) ? "on" : ""}`}
              onClick={() => { toggle(people, setPeople, p.id); resetPreview(); }}>{p.name}</button>
          ))}
        </div>
      </details>

      <div className="hub-label">Message</div>
      <textarea className="hub-text" rows={4} maxLength={MAX_CHARS} value={message}
        placeholder="New cafe assignments are up — due Friday!"
        onChange={(e) => { setMessage(e.target.value); resetPreview(); }} />
      <div className="hub-hint">{message.length}/{MAX_CHARS} · “Reply STOP to opt out.” is added automatically</div>

      {!preview && (
        <button className="hub-btn" disabled={busy || !to.length || !message.trim()} onClick={doPreview}>
          {busy ? "Checking…" : "Preview"}
        </button>
      )}

      {preview && (
        <div className="hub-preview">
          <div className="hub-label">Will text {preview.recipients.length}</div>
          <p className="hub-names">{preview.recipients.map((p) => p.name).join(", ")}</p>
          {preview.skipped?.length > 0 && (
            <p className="hub-hint">Skipping: {preview.skipped.map((s) => `${s.name} (${s.reason})`).join(", ")}</p>
          )}
          <div className="hub-bubble">{preview.body}</div>
          <div className="hub-row">
            <button className="hub-btn" disabled={busy} onClick={doSend}>
              {busy ? "Sending…" : `Send to ${preview.recipients.length}`}
            </button>
            <button className="hub-btn ghost" disabled={busy} onClick={resetPreview}>Edit</button>
          </div>
        </div>
      )}

      {note && <p className={`hub-note ${note.bad ? "bad" : ""}`}>{note.text}</p>}
    </section>
  );
}

function Log({ log }) {
  if (!log.length) return <p className="hub-empty">No texts sent yet.</p>;
  return (
    <ul className="hub-log">
      {log.map((b) => (
        <li key={b.id} className="hub-card hub-log-item">
          <div className="hub-log-top">
            <span>{when(b.at)}</span>
            <span>{fromLabel(b.from)}</span>
          </div>
          <div className="hub-bubble">{b.body}</div>
          <div className="hub-log-to">
            To {b.recipients.length}: {b.recipients.map((r) => r.name).join(", ")}
          </div>
          <div className={`hub-status ${b.failed ? "bad" : ""}`}>
            ✓ {b.sent} sent{b.failed ? ` · ✗ ${b.failed} failed` : ""}
          </div>
          {b.failed > 0 && (
            <details className="hub-fail">
              <summary>Why it failed</summary>
              {b.recipients.filter((r) => !r.ok).map((r, i) => <div key={i}>{r.name}: {r.error}</div>)}
            </details>
          )}
        </li>
      ))}
    </ul>
  );
}

function Team({ team }) {
  return (
    <ul className="hub-team">
      {team.map((p) => (
        <li key={p.id} className="hub-card hub-person">
          <div>
            <div className="hub-person-name">{p.name}</div>
            <div className="hub-hint">{p.role}{p.chapters.length ? ` · ${p.chapters.join(", ")}` : ""}</div>
          </div>
          <div className="hub-person-right">
            <div className={`hub-tag ${p.canText ? "ok" : ""}`}>
              {p.canText ? "Texts on" : p.optedOut ? "Opted out" : "No texts"}
            </div>
            {p.phoneLast4 && <div className="hub-hint">•••{p.phoneLast4}</div>}
          </div>
        </li>
      ))}
    </ul>
  );
}

function Tools() {
  const soon = [
    ["☕", "Cafe assignments", "Who's scouting which cafes"],
    ["📊", "Department overviews", "Progress from each Jira board"],
    ["🌐", "Website status", "Is workandbrew.app up and healthy"],
  ];
  return (
    <div className="hub-tools">
      <Link to="/ops/teambrew26" className="hub-card hub-tool">
        <span className="hub-tool-icon">🗺️</span>
        <div><div className="hub-person-name">Scout map</div><div className="hub-hint">Open the cafe scouting map</div></div>
      </Link>
      {soon.map(([icon, title, sub]) => (
        <div key={title} className="hub-card hub-tool soon">
          <span className="hub-tool-icon">{icon}</span>
          <div><div className="hub-person-name">{title}</div><div className="hub-hint">{sub} · coming soon</div></div>
        </div>
      ))}
    </div>
  );
}

// Desktop-only KPI row. Real numbers where we have them; outside sources say "Not connected".
function Stats({ data }) {
  const st = data.stats || {};
  const textable = data.team.filter((p) => p.canText).length;
  const tiles = [
    { label: "Texts sent", value: st.sent30 ?? 0, foot: <Delta now={st.sent30 ?? 0} before={st.prevSent30 ?? 0} />, spark: (data.daily || []).map((d) => d.sent) },
    { label: "Team members", value: data.team.length, foot: <span className="hc-foot">across {data.chapters.length} chapters</span> },
    { label: "Reachable by text", value: textable, foot: <span className="hc-foot">{data.team.length ? Math.round((textable / data.team.length) * 100) : 0}% of the team opted in</span> },
    { label: "Website visitors", source: "Google Analytics" },
    { label: "Email sign-ups", source: "Brevo" },
    { label: "Social followers", source: "Instagram" },
  ];
  return (
    <div className="hub-stats">
      {tiles.map((t) => (
        <div key={t.label} className={`hub-card hub-stat ${t.source ? "soon" : ""}`}>
          <div className="hub-stat-label">{t.label}</div>
          <div className="hub-stat-value">{t.source ? "—" : t.value.toLocaleString()}</div>
          {t.source ? <span className="hub-pill">Connect {t.source}</span> : t.foot}
          {t.spark && <Sparkline values={t.spark} />}
        </div>
      ))}
    </div>
  );
}

// Desktop-only charts. Texting numbers are real; outside sources show an empty state until connected.
function Analytics({ data }) {
  const daily = data.daily || [];
  const since = daily[0]?.date || ""; // same 30-day window as the chart and the meter
  const bySender = new Map();
  for (const b of data.log) {
    if (b.at.slice(0, 10) < since) continue;
    bySender.set(fromLabel(b.from), (bySender.get(fromLabel(b.from)) || 0) + b.sent);
  }
  const senders = [...bySender].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  const byChapter = data.chapters
    .map((c) => ({ label: c, value: data.team.filter((p) => p.chapters.includes(c)).length }))
    .sort((a, b) => b.value - a.value);
  const st = data.stats || {};
  const avg = daily.length ? (daily.reduce((n, d) => n + d.sent, 0) / daily.length).toFixed(1) : "0";
  return (
    <>
      <h2 className="hub-section">Messaging analytics</h2>
      <section className="hub-analytics hub-desk" aria-label="Messaging analytics">
        <div className="hub-card ha-wide">
          <div className="ha-head">
            <div>
              <h3 className="ha-title">Texts sent per day</h3>
              <p className="ha-sub">Last 30 days · all senders</p>
            </div>
            <div className="ha-kpis">
              <div><span className="ha-kpi">{(st.sent30 ?? 0).toLocaleString()}</span><span className="ha-kpi-label">Total</span></div>
              <div><span className="ha-kpi">{avg}</span><span className="ha-kpi-label">Daily avg.</span></div>
              <Delta now={st.sent30 ?? 0} before={st.prevSent30 ?? 0} label="vs. prior" />
            </div>
          </div>
          <DailyBars daily={daily} />
        </div>
        <div className="hub-card">
          <div className="ha-head"><div><h3 className="ha-title">Delivery rate</h3><p className="ha-sub">Last 30 days</p></div></div>
          <DeliveryMeter sent={st.sent30 ?? 0} failed={st.failed30 ?? 0} />
        </div>
        <div className="hub-card">
          <div className="ha-head"><div><h3 className="ha-title">Top senders</h3><p className="ha-sub">Texts sent · last 30 days</p></div></div>
          <RankBars rows={senders} unit="Texts sent" avatars />
        </div>
        <div className="hub-card">
          <div className="ha-head"><div><h3 className="ha-title">Team by chapter</h3><p className="ha-sub">People per NYC chapter</p></div></div>
          <RankBars rows={byChapter} unit="People" />
        </div>
        <div className="hub-card ha-nc-card">
          <div className="ha-head"><div><h3 className="ha-title">Growth</h3><p className="ha-sub">Website · email · social</p></div></div>
          <NotConnected icon="📈" source="Google Analytics, Brevo & Instagram" what="visitors, email sign-ups and followers" setup="One-time setup · about 5 minutes each" />
        </div>
      </section>
    </>
  );
}

export default function TeamHub() {
  const { user } = useAuth();
  const [tab, setTab] = useState("texts");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    const r = await hubFetch("GET");
    if (r.ok) { setData(r); setError(null); } else setError(r.error || "Couldn't load the Team Hub.");
  }, []);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    hubFetch("GET").then((r) => {
      if (!alive) return;
      if (r.ok) { setData(r); setError(null); } else setError(r.error || "Couldn't load the Team Hub.");
    });
    return () => { alive = false; };
  }, [user]);

  let body;
  if (!user) {
    body = (
      <div className="hub-card hub-center">
        <p>The Team Hub is for Work &amp; Brew department heads.</p>
        <Link className="hub-btn" to="/login?next=/team">Log in</Link>
      </div>
    );
  } else if (error) {
    body = <div className="hub-card hub-center"><p>{error}</p></div>;
  } else if (!data) {
    body = <p className="hub-empty">Loading…</p>;
  } else {
    body = (
      <>
        <div className="hub-tabs" role="tablist">
          {[["texts", "💬 Texts"], ["team", "👥 Team"], ["tools", "🧰 Tools"]].map(([k, label]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={`hub-tab ${tab === k ? "on" : ""}`}
              onClick={() => setTab(k)}>{label}</button>
          ))}
        </div>
        <Stats data={data} />
        <Analytics data={data} />
        <h2 className="hub-section">Messaging &amp; team</h2>
        {/* Phone: one tab at a time. Desktop (≥1024px): every panel at once, tabs hidden. */}
        <div className="hub-grid">
          <div className={`hub-panel hub-a ${tab === "texts" ? "on" : ""}`}><Compose data={data} onSent={load} /></div>
          <div className={`hub-panel hub-b ${tab === "texts" ? "on" : ""}`}>
            <div className="page-section-label hub-panel-label">Sent texts</div>
            <Log log={data.log} />
          </div>
          <div className={`hub-panel hub-c ${tab === "team" ? "on" : ""}`}>
            <div className="page-section-label hub-panel-label hub-desk">Team</div>
            <Team team={data.team} />
          </div>
          <div className={`hub-panel hub-d ${tab === "tools" ? "on" : ""}`}>
            <div className="page-section-label hub-panel-label hub-desk">Tools</div>
            <Tools />
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="page-shell hub-shell">
      <Navbar />
      <div className="page-content hub">
        <header className="hub-hero">
          <div className="hub-hero-main">
            <div className="page-badge">Work &amp; Brew · Team Hub</div>
            <h1 className="page-title">
              {data?.me?.name ? `${data.greeting || "Hi"}, ${data.me.name.split(" ")[0]}` : "Team Hub"}
            </h1>
            <p className="hub-hero-sub hub-desk">
              {data?.me?.role ? `${data.me.role} · ` : ""}Here's how the team is doing.
            </p>
          </div>
          {data?.today && <div className="hub-hero-date hub-desk">{data.today}</div>}
        </header>
        {body}
      </div>
    </div>
  );
}
