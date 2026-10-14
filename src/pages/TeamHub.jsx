import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, NavLink, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import "./TeamHub.css";
import { DailyBars, RankBars, DeliveryMeter, NotConnected, Delta } from "./TeamHubCharts";

// Private Team Hub for department heads: one place to run Work & Brew.
// Five pages (Overview, Messages, Cafés, Analytics, Growth & Social) share one data load.
// Access is checked on the server (/api/hub) against the hub_admins table; this page only shows
// what the server returns.

const MAX_CHARS = 480;
const SCOUT_MAP = "/ops/teambrew26";

const ICONS = {
  overview: "M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z",
  messages: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  cafes: "M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14",
  analytics: "M3 3v18h18M8 17v-6M13 17V6M18 17v-4",
  growth: "m3 17 6-6 4 4 8-8M14 7h7v7",
  back: "M15 18l-6-6 6-6",
};
const Icon = ({ name }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={ICONS[name]} />
  </svg>
);

const PAGES = [
  { key: "overview", label: "Overview", short: "Home", sub: null },
  { key: "messages", label: "Messages", short: "Messages", sub: "Text one person, a group or the whole team. Every text is logged." },
  { key: "cafes", label: "Cafés", short: "Cafés", sub: "Where every café stands, from the scout map." },
  { key: "analytics", label: "Texting analytics", short: "Analytics", sub: "How the team is using texting · last 30 days" },
  { key: "growth", label: "Growth & Social", short: "Growth", sub: "Team sign-ups, website, email and social reach." },
];
const pathFor = (key) => (key === "overview" ? "/team" : `/team/${key}`);

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

const when = (iso) => new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const fromLabel = (from) => (from === "gwen" ? "Den (via Gwen)" : String(from || "").replace(/^Team Hub · /, ""));
const initials = (name) => String(name).trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
const sum = (arr, k) => arr.reduce((n, d) => n + d[k], 0);

function Card({ title, sub, right, children, className = "" }) {
  return (
    <section className={`th-card ${className}`}>
      {(title || right) && (
        <div className="th-card-h">
          <div>{title && <h3>{title}</h3>}{sub && <p>{sub}</p>}</div>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

function Stat({ label, value, foot }) {
  return (
    <div className="th-stat">
      <div className="th-caps">{label}</div>
      <div className="th-stat-v">{value}</div>
      <div className="th-stat-c">{foot}</div>
    </div>
  );
}

// ---------------------------------------------------------------- Overview

function Overview({ data }) {
  const daily = data.daily || [];
  const week = daily.slice(-7);
  const failedWeek = sum(week, "failed");
  const textable = data.team.filter((p) => p.canText).length;
  const visited = data.cafes ? data.cafes["Visit Completed"] || 0 : null;
  const focus = [
    data.signups?.pending ? `${data.signups.pending} sign-up${data.signups.pending > 1 ? "s" : ""} waiting for approval` : null,
    failedWeek ? `${failedWeek} text${failedWeek > 1 ? "s" : ""} failed this week: check the log` : null,
    data.cafes?.["In Progress"] ? `${data.cafes["In Progress"]} café visit${data.cafes["In Progress"] > 1 ? "s" : ""} in progress` : null,
  ].filter(Boolean);
  const byChapter = data.chapters.map((c) => ({ label: c, value: data.team.filter((p) => p.chapters.includes(c)).length })).sort((a, b) => b.value - a.value);
  const cafeRows = data.cafes ? Object.entries(data.cafes).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value) : [];

  return (
    <>
      <section className="th-hero">
        <div>
          <div className="th-caps th-hero-caps">Work &amp; Brew · Team Hub</div>
          <h2>{data.greeting || "Hi"}, {String(data.me?.name || "").split(" ")[0] || "there"}</h2>
          <p>{data.me?.role ? `${data.me.role} · ` : ""}Everything Work &amp; Brew is running, in one place.</p>
        </div>
        <div className="th-focus">
          <div className="th-caps th-hero-caps">Today&apos;s focus</div>
          {(focus.length ? focus : ["All clear: nothing needs you right now."]).map((f) => <div key={f} className="th-focus-item">{f}</div>)}
        </div>
      </section>

      <div className="th-row th-stats">
        <Stat label="Texts · 30D" value={data.stats?.sent30 ?? 0} foot={<Delta now={data.stats?.sent30 ?? 0} before={data.stats?.prevSent30 ?? 0} />} />
        <Stat label="Cafés visited" value={visited ?? "—"} foot={visited == null ? "Connect the scout map" : "Visits completed"} />
        <Stat label="Reachable by text" value={`${textable} of ${data.team.length}`} foot="Opted in to texts" />
        <Stat label="Sign-ups · 30D" value={data.signups?.last30 ?? "—"} foot={data.signups ? `${data.signups.pending} waiting for approval` : "Not set up yet"} />
        <Stat label="Chapters" value={data.chapters.length} foot={`${data.team.length} people on the team`} />
      </div>

      <div className="th-row">
        <Card title="Texts this week" sub="Last 7 days · all senders" className="th-grow"
          right={<Delta now={sum(week, "sent")} before={sum(daily.slice(-14, -7), "sent")} label="vs. last week" />}>
          <DailyBars daily={week} />
        </Card>
        <Card title="Recent activity" sub="The shared log every lead can see" className="th-side-col">
          {data.log.length ? (
            <ul className="th-acts">
              {data.log.slice(0, 5).map((b) => (
                <li key={b.id} className={b.failed ? "bad" : ""}>
                  <span className="th-act-ic"><Icon name="messages" /></span>
                  <div>
                    <div className="th-act-t">{fromLabel(b.from)} texted {b.recipients.length === 1 ? b.recipients[0].name : `${b.recipients.length} people`}</div>
                    <div className="th-act-m">{b.failed ? `${b.failed} failed · ` : `${b.sent} delivered · `}{when(b.at)}</div>
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="th-empty">No texts sent yet.</p>}
          <NavLink to="/team/messages" className="th-link">Open messages →</NavLink>
        </Card>
      </div>

      <div className="th-row">
        <Card title="Team by chapter" sub="People per NYC chapter" className="th-grow"><RankBars rows={byChapter} unit="People" share={false} suffix="people" /></Card>
        <Card title="Café statuses" sub="From the scout map" className="th-grow">
          {cafeRows.length ? <RankBars rows={cafeRows} unit="Cafés" share={false} suffix="cafés" /> : <p className="th-empty">No café updates yet.</p>}
        </Card>
        <Card title="Templates" sub="Ready-to-send messages" className="th-grow">
          <ul className="th-tlist">{data.templates.map((t) => <li key={t.id}>{t.name}</li>)}</ul>
          <NavLink to="/team/messages" className="th-link">Send one →</NavLink>
        </Card>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- Messages

function Compose({ data, onSent }) {
  const [to, setTo] = useState([]);
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null);
  const [saving, setSaving] = useState(false);
  const [tplName, setTplName] = useState("");

  const textable = useMemo(() => data.team.filter((p) => p.canText), [data.team]);
  const everyone = to.includes("all");
  const toggle = (v) => { setPreview(null); setNote(null); setTo(v === "all" ? (everyone ? [] : ["all"]) : to.includes(v) ? to.filter((x) => x !== v) : [...to.filter((x) => x !== "all"), v]); };
  const chip = (v, label) => (
    <button type="button" key={v} className={`th-chip ${to.includes(v) ? "on" : ""}`} onClick={() => toggle(v)}>{label}</button>
  );
  const edit = (m) => { setMessage(m); setPreview(null); setNote(null); };

  const doPreview = async () => {
    setBusy(true); setNote(null);
    const r = await hubFetch("POST", { action: "preview", to, message });
    setBusy(false);
    if (r.ok) setPreview(r); else setNote({ bad: true, text: r.error || "Something went wrong." });
  };
  const doSend = async () => {
    setBusy(true);
    const r = await hubFetch("POST", { action: "send", to: preview.recipients.map((p) => p.id), message });
    setBusy(false);
    if (r.sent) {
      setNote({ bad: !!r.failed, text: `Sent to ${r.sent}${r.failed ? `, ${r.failed} failed` : ""}.` });
      setPreview(null); setMessage(""); setTo([]);
      onSent();
    } else setNote({ bad: true, text: r.error || (r.results || []).map((x) => `${x.name}: ${x.error}`).join("; ") || "Not sent." });
  };
  const saveTemplate = async () => {
    setBusy(true);
    const r = await hubFetch("POST", { action: "template-save", name: tplName, body: message });
    setBusy(false);
    if (r.ok) { setSaving(false); setTplName(""); setNote({ text: "Template saved." }); onSent(); }
    else setNote({ bad: true, text: r.error || "Couldn't save the template." });
  };

  return (
    <Card title="Send a text" sub="Preview first: nothing sends until you confirm" className="th-grow">
      <div className="th-caps">Start from a template</div>
      <div className="th-chips">
        {data.templates.map((t) => (
          <button type="button" key={t.id} className={`th-chip ${message === t.body ? "on" : ""}`} onClick={() => edit(t.body)}>{t.name}</button>
        ))}
      </div>

      <div className="th-caps">To</div>
      <div className="th-chips">
        {chip("all", "Everyone")}
        {data.groups.map((g) => chip(`group:${g.key}`, `${g.label} · ${g.count}`))}
      </div>
      <div className="th-chips">{data.chapters.map((c) => chip(c, c))}</div>
      <details className="th-people">
        <summary>Pick specific people</summary>
        <div className="th-chips">{textable.map((p) => chip(p.id, p.name))}</div>
      </details>

      <div className="th-caps">Message</div>
      <textarea className="th-text" rows={4} maxLength={MAX_CHARS} value={message}
        placeholder="Hi {first name}! New café assignments are up. Due Friday!" onChange={(e) => edit(e.target.value)} />
      <div className="th-hint">{message.length}/{MAX_CHARS} · <b>{"{first name}"}</b> fills in automatically · “Reply STOP to opt out.” is always added</div>

      {!preview && (
        <div className="th-btns">
          <button className="th-btn" disabled={busy || !to.length || !message.trim()} onClick={doPreview}>{busy ? "Checking…" : "Preview"}</button>
          {message.trim() && !saving && <button className="th-btn ghost" onClick={() => setSaving(true)}>Save as template</button>}
        </div>
      )}
      {saving && !preview && (
        <div className="th-btns">
          <input className="th-input" placeholder="Template name, e.g. Monday assignments" value={tplName} maxLength={60} onChange={(e) => setTplName(e.target.value)} />
          <button className="th-btn" disabled={busy || !tplName.trim()} onClick={saveTemplate}>Save</button>
          <button className="th-btn ghost" onClick={() => setSaving(false)}>Cancel</button>
        </div>
      )}

      {preview && (
        <div className="th-preview">
          <div className="th-caps">Preview · will text {preview.recipients.length}</div>
          <p className="th-names">{preview.recipients.map((p) => p.name).join(", ")}</p>
          {preview.skipped?.length > 0 && <p className="th-hint">Skipping: {preview.skipped.map((s) => `${s.name} (${s.reason})`).join(", ")}</p>}
          <div className="th-bubble">{preview.body}</div>
          <div className="th-btns">
            <button className="th-btn" disabled={busy} onClick={doSend}>{busy ? "Sending…" : `Send to ${preview.recipients.length}`}</button>
            <button className="th-btn ghost" disabled={busy} onClick={() => setPreview(null)}>Edit</button>
          </div>
        </div>
      )}
      <div className="th-rules">✓ Opted-in members only <span>✓ STOP line always added</span> <span>✓ Max 25 per send</span></div>
      {note && <p className={`th-note ${note.bad ? "bad" : ""}`}>{note.text}</p>}
    </Card>
  );
}

function Templates({ data, onChange }) {
  const remove = async (id) => { await hubFetch("POST", { action: "template-delete", id }); onChange(); };
  return (
    <Card title="Templates" sub={data.templatesSaved ? "Saved by the team" : "Starter templates · save your own from Send a text"}>
      <ul className="th-templates">
        {data.templates.map((t) => (
          <li key={t.id}>
            <div className="th-tpl-top"><b>{t.name}</b>{data.templatesSaved && <button className="th-x" onClick={() => remove(t.id)} aria-label={`Delete ${t.name}`}>Delete</button>}</div>
            <div className="th-tpl-body">{t.body}</div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Log({ log }) {
  const [filter, setFilter] = useState("all");
  const rows = filter === "failed" ? log.filter((b) => b.failed) : log;
  return (
    <Card title="Sent texts" sub="Shared log: every lead sees what scouts were told"
      right={<div className="th-chips">{["all", "failed"].map((f) => <button key={f} className={`th-chip sm ${filter === f ? "on" : ""}`} onClick={() => setFilter(f)}>{f === "all" ? "All" : "Failed"}</button>)}</div>}>
      {!rows.length ? <p className="th-empty">{filter === "failed" ? "No failed texts." : "No texts sent yet."}</p> : (
        <ul className="th-log">
          {rows.slice(0, 25).map((b) => (
            <li key={b.id}>
              <div className="th-log-top"><span>{when(b.at)}</span><span>{fromLabel(b.from)}</span></div>
              <div className="th-bubble">{b.body}</div>
              <div className="th-log-bot">
                <span>To {b.recipients.length} · {b.recipients.map((r) => r.name).join(", ")}</span>
                <b className={b.failed ? "bad" : "good"}>✓ {b.sent} delivered{b.failed ? ` · ✗ ${b.failed} failed` : ""}</b>
              </div>
              {b.failed > 0 && (
                <details className="th-fail"><summary>Why it failed</summary>
                  {b.recipients.filter((r) => !r.ok).map((r, i) => <div key={i}>{r.name}: {r.error}</div>)}
                </details>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Directory({ team }) {
  return (
    <Card title="Team directory" sub="Phone numbers stay hidden: only the last 4 digits show" right={<span className="th-tag n">{team.length} members</span>}>
      <div className="th-table-wrap">
        <table className="th-table">
          <thead><tr><th>Name</th><th>Role</th><th>Chapters</th><th>Phone</th><th>Status</th></tr></thead>
          <tbody>
            {team.map((p) => (
              <tr key={p.id}>
                <td className="nm"><span className="th-av">{initials(p.name)}</span>{p.name}</td>
                <td>{p.role}</td>
                <td>{p.chapters.join(", ") || "All"}</td>
                <td>{p.phoneLast4 ? `•••• ${p.phoneLast4}` : "n/a"}</td>
                <td><span className={`th-tag ${p.canText ? "g" : "b"}`}>{p.canText ? "Texts on" : p.optedOut ? "Opted out" : "No texts"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Messages({ data, reload }) {
  return (
    <>
      <div className="th-row">
        <Compose data={data} onSent={reload} />
        <div className="th-side-col th-stack">
          <Templates data={data} onChange={reload} />
          <Log log={data.log} />
        </div>
      </div>
      <Directory team={data.team} />
    </>
  );
}

// ---------------------------------------------------------------- Cafés

const CAFE_ORDER = ["Visit Completed", "In Progress", "Backlogged Cafe", "Temporarily Unavailable", "Ineligible Cafe", "Permanently Closed"];

function Cafes({ data }) {
  if (!data.cafes) {
    return (
      <Card title="Café statuses" sub="From the scout map">
        <NotConnected icon="☕" source="the scout map" what="where every café stands" setup="Statuses appear once scouts start logging visits." />
      </Card>
    );
  }
  const c = data.cafes;
  const rows = CAFE_ORDER.filter((k) => c[k]).map((k) => ({ label: k.replace(" Cafe", ""), value: c[k] }));
  const closed = (c["Ineligible Cafe"] || 0) + (c["Permanently Closed"] || 0) + (c["Temporarily Unavailable"] || 0);
  return (
    <>
      <div className="th-row th-stats">
        <Stat label="Visits completed" value={c["Visit Completed"] || 0} foot="Scouted and logged" />
        <Stat label="In progress" value={c["In Progress"] || 0} foot="Assigned and underway" />
        <Stat label="Backlogged" value={c["Backlogged Cafe"] || 0} foot="Saved for later" />
        <Stat label="Not a fit" value={closed} foot="Ineligible, closed or unavailable" />
      </div>
      <div className="th-row">
        <Card title="Scouting pipeline" sub="Every café with a status on the scout map" className="th-grow">
          <RankBars rows={rows} unit="Cafés" share={false} suffix="cafés" />
        </Card>
        <Card title="Update a café" sub="Scouts log visits on the scout map" className="th-side-col">
          <p className="th-p">Statuses here update the moment a scout saves a visit on the scout map.</p>
          <Link to={SCOUT_MAP} className="th-btn">Open the scout map</Link>
        </Card>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- Analytics

function Analytics({ data }) {
  const daily = data.daily || [];
  const since = daily[0]?.date || "";
  const recent = data.log.filter((b) => b.at.slice(0, 10) >= since);
  const bySender = new Map();
  for (const b of recent) bySender.set(fromLabel(b.from), (bySender.get(fromLabel(b.from)) || 0) + b.sent);
  const senders = [...bySender].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const byDay = weekdays.map((label) => ({ label, value: 0 }));
  for (const b of recent) byDay[(new Date(b.at).getDay() + 6) % 7].value += b.sent;
  const st = data.stats || {};
  const textable = data.team.filter((p) => p.canText).length;
  return (
    <>
      <div className="th-row th-stats">
        <Stat label="Texts sent" value={st.sent30 ?? 0} foot={<Delta now={st.sent30 ?? 0} before={st.prevSent30 ?? 0} />} />
        <Stat label="Delivered" value={`${st.sent30 ?? 0} of ${(st.sent30 ?? 0) + (st.failed30 ?? 0)}`} foot={`${st.failed30 ?? 0} failed`} />
        <Stat label="Reachable by text" value={`${textable} of ${data.team.length}`} foot={`${data.team.length - textable} can't be texted`} />
        <Stat label="Sends" value={recent.length} foot="Batches in the last 30 days" />
      </div>
      <div className="th-row">
        <Card title="Texts sent per day" sub="Last 30 days · all senders" className="th-grow"><DailyBars daily={daily} /></Card>
        <Card title="Delivery" sub="Last 30 days" className="th-side-col"><DeliveryMeter sent={st.sent30 ?? 0} failed={st.failed30 ?? 0} /></Card>
      </div>
      <div className="th-row">
        <Card title="Who sent texts" sub="Texts sent · last 30 days" className="th-grow"><RankBars rows={senders} unit="Texts sent" avatars share={false} suffix="texts" /></Card>
        <Card title="Sends by weekday" sub="When the team texts most" className="th-grow"><RankBars rows={byDay.filter((d) => d.value)} unit="Texts" share={false} suffix="texts" /></Card>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- Growth & Social

function Growth({ data }) {
  const s = data.signups;
  return (
    <>
      <div className="th-row th-stats">
        <Stat label="Team sign-ups · 30D" value={s?.last30 ?? "—"} foot={s ? `${s.approved30} approved` : "Not set up yet"} />
        <Stat label="Waiting for approval" value={s?.pending ?? "—"} foot="From the scout sign-up page" />
        <Stat label="Team members" value={data.team.length} foot={`across ${data.chapters.length} chapters`} />
      </div>
      <div className="th-row th-wrap">
        <Card title="Website visitors" sub="Google Analytics" className="th-half"><NotConnected icon="🌐" source="Google Analytics" what="daily visitors and traffic sources" setup="One-time setup · about 10 minutes" /></Card>
        <Card title="Email sign-ups" sub="Brevo" className="th-half"><NotConnected icon="✉️" source="Brevo" what="new subscribers per week" setup="One-time setup · about 5 minutes" /></Card>
        <Card title="Instagram" sub="Followers and best posts" className="th-half"><NotConnected icon="📸" source="Instagram" what="followers and engagement" setup="Needs a business account" /></Card>
        <Card title="TikTok" sub="Followers and views" className="th-half"><NotConnected icon="🎵" source="TikTok" what="followers and views" setup="Needs a TikTok developer app" /></Card>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- Shell

export default function TeamHub() {
  const { user } = useAuth();
  const { section } = useParams();
  const page = PAGES.find((p) => p.key === section) || PAGES[0];
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
    body = <div className="th-card th-center"><p>The Team Hub is for Work &amp; Brew department heads.</p><Link className="th-btn" to={`/login?next=${pathFor(page.key)}`}>Log in</Link></div>;
  } else if (error) body = <div className="th-card th-center"><p>{error}</p></div>;
  else if (!data) body = <p className="th-empty">Loading…</p>;
  else {
    const View = { overview: Overview, messages: Messages, cafes: Cafes, analytics: Analytics, growth: Growth }[page.key];
    body = <View data={data} reload={load} />;
  }

  return (
    <div className="th">
      <aside className="th-sidebar">
        <Link to="/" className="th-brand"><span>Work &amp; Brew</span><small>TEAM HUB</small></Link>
        <nav>
          {PAGES.map((p) => (
            <NavLink key={p.key} to={pathFor(p.key)} end className={({ isActive }) => `th-nav ${isActive ? "on" : ""}`}>
              <Icon name={p.key} />{p.key === "analytics" ? "Analytics" : p.label}
            </NavLink>
          ))}
        </nav>
        <div className="th-nav-h">TOOLS</div>
        <Link to={SCOUT_MAP} className="th-nav"><Icon name="cafes" />Scout map</Link>
        <Link to="/" className="th-nav"><Icon name="back" />Back to the site</Link>
        <div className="th-spacer" />
        {data?.me && (
          <div className="th-me"><span className="th-av light">{initials(data.me.name || data.me.email)}</span>
            <div><b>{data.me.name}</b><small>{data.me.role}</small></div></div>
        )}
      </aside>

      <main className="th-main">
        {page.key !== "overview" && (
          <header className="th-top"><h1>{page.label}</h1>{page.sub && <p>{page.sub}</p>}</header>
        )}
        {page.key === "overview" && data?.today && <header className="th-top"><h1>Overview</h1><p>{data.today} · Work &amp; Brew</p></header>}
        {body}
      </main>

      <nav className="th-tabs" aria-label="Team Hub pages">
        {PAGES.map((p) => (
          <NavLink key={p.key} to={pathFor(p.key)} end className={({ isActive }) => `th-tab ${isActive ? "on" : ""}`}>
            <Icon name={p.key} />{p.short}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
