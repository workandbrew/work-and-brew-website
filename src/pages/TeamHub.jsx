import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, NavLink, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import Navbar from "../components/Navbar";
import "./TeamHub.css";
import { DailyBars, RankBars, DeliveryMeter, NotConnected, Delta } from "./TeamHubCharts";

// Private Team Hub for department heads: one place to run Work & Brew.
// Six pages (Overview, Messages, Cafés, Analytics, Growth & Social, Events) share one data load.
// Access is checked on the server (/api/hub) against the hub_admins table; this page only shows
// what the server returns.

const MAX_CHARS = 480;
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SCOUT_MAP = "/ops/teambrew26";

const ICONS = {
  overview: "M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z",
  messages: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  cafes: "M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14",
  analytics: "M3 3v18h18M8 17v-6M13 17V6M18 17v-4",
  growth: "m3 17 6-6 4 4 8-8M14 7h7v7",
  events: "M4 6h16v15H4zM4 11h16M8 3v5M16 3v5",
  back: "M15 18l-6-6 6-6",
  chev: "m6 9 6 6 6-6",
};
const Icon = ({ name }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={ICONS[name]} />
  </svg>
);

const PAGES = [
  { key: "overview", label: "Overview", short: "Home", sub: null },
  { key: "messages", label: "Messages", short: "Messages", sub: "Text one person, a group or the whole team. Every text is logged." },
  { key: "cafes", label: "Cafés", short: "Cafés", sub: "Every café in the database, live from the scout map." },
  { key: "analytics", label: "Texting analytics", short: "Analytics", sub: "How the team is using texting · last 30 days" },
  { key: "growth", label: "Growth & Social", short: "Growth", sub: "Team sign-ups, website, email and social reach across Instagram, TikTok, YouTube and Lemon8." },
  { key: "events", label: "Events", short: "Events", sub: "Meetups, pop-ups and café takeovers. Plan them here, then text the team from the same place." },
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

// "Current works": the founder's one-liner per department, so every head knows what the others are on.
function CurrentWorks({ data, reload, notify }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(false);
  // Collapsed by default after the first visit; the choice is remembered on this browser.
  const [open, setOpen] = useState(() => { try { return localStorage.getItem("wb-hub-works-open") !== "0"; } catch { return true; } });
  const toggle = () => { const v = !open; setOpen(v); try { localStorage.setItem("wb-hub-works-open", v ? "1" : "0"); } catch { /* private mode */ } };
  const works = data.works || [];
  const filled = works.filter((w) => w.body).length;
  const canEdit = !!data.me?.canEditWorks;
  const start = () => { setDraft(Object.fromEntries(works.map((w) => [w.department, w.body]))); setEditing(true); setOpen(true); };
  const save = async () => {
    setBusy(true);
    for (const w of works) {
      if ((draft[w.department] ?? "") === w.body) continue;
      const r = await hubFetch("POST", { action: "works-save", department: w.department, body: draft[w.department] });
      if (!r.ok) { setBusy(false); notify({ bad: true, text: r.error || "Couldn't save." }); return; }
    }
    setBusy(false); setEditing(false); notify({ text: "Current works updated." }); reload();
  };
  const latest = works.map((w) => w.updatedAt).filter(Boolean).sort().pop();
  return (
    <div className={`th-focus th-works ${open ? "" : "closed"}`}>
      <div className="th-works-h">
        <button type="button" className="th-works-toggle" onClick={toggle} aria-expanded={open}>
          <span className="th-caps th-hero-caps">Work &amp; Brew · Leads announcements</span>
          <Icon name="chev" />
        </button>
        {canEdit && !editing && <button type="button" className="th-works-edit" onClick={start}>Edit</button>}
      </div>
      {!open && <small className="th-works-when">{filled ? `${filled} of ${works.length} departments posted` : "Nothing posted yet"}{latest ? ` · updated ${when(latest)}` : ""} · tap to expand</small>}
      {open && works.map((w) => (
        <div key={w.department} className="th-works-row">
          <b>{w.department}</b>
          {editing
            ? <textarea className="th-works-input" rows={2} maxLength={600} value={draft[w.department] ?? ""} placeholder="What's this team on right now?" onChange={(e) => setDraft({ ...draft, [w.department]: e.target.value })} />
            : <span>{w.body || <i>Nothing posted yet.</i>}</span>}
          {!editing && w.updatedAt && <small className="th-works-stamp">Updated {when(w.updatedAt)}{w.updatedBy ? ` · ${w.updatedBy.split(" ")[0]}` : ""}</small>}
        </div>
      ))}
      {open && editing && (
        <div className="th-btns">
          <button className="th-btn th-btn-cream" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save"}</button>
          <button className="th-btn ghost th-btn-ghost-cream" disabled={busy} onClick={() => setEditing(false)}>Cancel</button>
        </div>
      )}
    </div>
  );
}

function Overview({ data, reload, notify }) {
  const daily = data.daily || [];
  const week = daily.slice(-7);
  const textable = data.team.filter((p) => p.canText).length;
  const visited = data.cafes ? data.cafes["Visit Completed"] || 0 : null;
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
        <CurrentWorks data={data} reload={reload} notify={notify} />
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
        <Card title="Scheduled this week" sub="Texts that send themselves" className="th-grow">
          {data.schedules?.filter((x) => x.active).length ? (
            <ul className="th-scheds">
              {data.schedules.filter((x) => x.active).map((x) => (
                <li key={x.id}><span className="th-sched-day">{x.weekdayName.slice(0, 3).toUpperCase()}</span>
                  <div className="th-sched-body"><b>{x.name}</b><small>To {x.recipients.map((r) => groupLabel(r, data)).join(", ")}</small></div></li>
              ))}
            </ul>
          ) : <p className="th-empty">Nothing scheduled this week.</p>}
          <NavLink to="/team/messages" className="th-link">{data.schedules?.length ? "Manage →" : "Schedule a weekly text →"}</NavLink>
        </Card>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- Messages

function Compose({ data, onSent, notify }) {
  const [to, setTo] = useState([]);
  const [message, setMessage] = useState(() => { try { const d = sessionStorage.getItem("wb-hub-draft"); sessionStorage.removeItem("wb-hub-draft"); return d || ""; } catch { return ""; } });
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tplName, setTplName] = useState("");
  const [when, setWhen] = useState("now"); // "now" or 0-6 (weekday, New York time)

  const textable = useMemo(() => data.team.filter((p) => p.canText), [data.team]);
  const everyone = to.includes("all");
  const toggle = (v) => { setPreview(null); setTo(v === "all" ? (everyone ? [] : ["all"]) : to.includes(v) ? to.filter((x) => x !== v) : [...to.filter((x) => x !== "all"), v]); };
  const chip = (v, label) => (
    <button type="button" key={v} className={`th-chip ${to.includes(v) ? "on" : ""}`} onClick={() => toggle(v)}>{label}</button>
  );
  const edit = (m) => { setMessage(m); setPreview(null); };

  const doPreview = async () => {
    setBusy(true);
    const r = await hubFetch("POST", { action: "preview", to, message });
    setBusy(false);
    if (r.ok) setPreview(r); else notify({ bad: true, text: r.error || "Something went wrong." });
  };
  const doSend = async () => {
    setBusy(true);
    const r = await hubFetch("POST", { action: "send", to: preview.recipients.map((p) => p.id), message });
    setBusy(false);
    if (r.sent) {
      notify({ bad: !!r.failed, text: `Sent to ${r.sent}${r.failed ? `, ${r.failed} failed` : ""}.` });
      setPreview(null); setMessage(""); setTo([]);
      onSent();
    } else notify({ bad: true, text: r.error || (r.results || []).map((x) => `${x.name}: ${x.error}`).join("; ") || "Not sent." });
  };
  const doSchedule = async () => {
    setBusy(true);
    // Saves the groups/chapters themselves, so new members are included each week.
    const r = await hubFetch("POST", { action: "schedule-save", to, body: message, weekday: when, name: data.templates.find((t) => t.body === message)?.name });
    setBusy(false);
    if (r.ok) {
      notify({ text: `Scheduled: goes out every ${WEEKDAYS[when]} morning.` });
      setPreview(null); setMessage(""); setTo([]); setWhen("now");
      onSent();
    } else notify({ bad: true, text: r.error || "Couldn't schedule it." });
  };
  const saveTemplate = async () => {
    setBusy(true);
    const r = await hubFetch("POST", { action: "template-save", name: tplName, body: message });
    setBusy(false);
    if (r.ok) { setSaving(false); setTplName(""); notify({ text: "Template saved." }); onSent(); }
    else notify({ bad: true, text: r.error || "Couldn't save the template." });
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

      <div className="th-caps">When</div>
      <div className="th-chips">
        <button type="button" className={`th-chip ${when === "now" ? "on" : ""}`} onClick={() => { setWhen("now"); setPreview(null); }}>Send now</button>
        {[1, 2, 3, 4, 5, 6, 0].map((d) => (
          <button type="button" key={d} className={`th-chip ${when === d ? "on" : ""}`} onClick={() => { setWhen(d); setPreview(null); }}>Every {WEEKDAYS[d].slice(0, 3)}</button>
        ))}
      </div>

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
            {when === "now"
              ? <button className="th-btn" disabled={busy} onClick={doSend}>{busy ? "Sending…" : `Send to ${preview.recipients.length}`}</button>
              : <button className="th-btn" disabled={busy} onClick={doSchedule}>{busy ? "Saving…" : `Schedule every ${WEEKDAYS[when]}`}</button>}
            <button className="th-btn ghost" disabled={busy} onClick={() => setPreview(null)}>Edit</button>
          </div>
        </div>
      )}
      <div className="th-rules">✓ Opted-in members only <span>✓ STOP line always added</span> <span>✓ Max 25 per send</span></div>
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

function Schedules({ data, onChange }) {
  if (!data.schedules) return null;
  const act = async (action, s, extra = {}) => { await hubFetch("POST", { action, id: s.id, ...extra }); onChange(); };
  return (
    <Card title="Scheduled weekly texts" sub="Sent automatically every week, in the morning (New York time)">
      {!data.schedules.length ? <p className="th-empty">Nothing scheduled. Pick a day under “When” to set one up.</p> : (
        <ul className="th-scheds">
          {data.schedules.map((s) => (
            <li key={s.id} className={s.active ? "" : "off"}>
              <span className="th-sched-day">{s.weekdayName.slice(0, 3).toUpperCase()}</span>
              <div className="th-sched-body">
                <b>{s.name}</b>
                <small>To {s.recipients.map((r) => groupLabel(r, data)).join(", ")}{s.last_sent_on ? ` · last sent ${s.last_sent_on}` : ""}</small>
              </div>
              <button className="th-x plain" onClick={() => act("schedule-toggle", s, { active: !s.active })}>{s.active ? "Pause" : "Resume"}</button>
              <button className="th-x" onClick={() => act("schedule-delete", s)} aria-label={`Delete ${s.name}`}>Delete</button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function groupLabel(v, data) {
  if (v === "all") return "Everyone";
  if (v.startsWith("group:")) return data.groups.find((g) => `group:${g.key}` === v)?.label || v.slice(6);
  return data.team.find((p) => p.id === v)?.name || v;
}

function Messages({ data, reload, notify }) {
  return (
    <>
      <div className="th-row">
        <Compose data={data} onSent={reload} notify={notify} />
        <div className="th-side-col th-stack">
          <Schedules data={data} onChange={reload} />
          <Templates data={data} onChange={reload} />
          <Log log={data.log} />
        </div>
      </div>
      <Directory team={data.team} />
    </>
  );
}

// ---------------------------------------------------------------- Cafés

const CAFE_ORDER = ["Visit Completed", "In Review", "In Progress", "Assigned", "Ready To Be Assigned", "New Cafe Added", "Incomplete",
  "Backlogged Cafe", "Temporarily Unavailable", "Ineligible Cafe", "Permanently Closed"];

const STATUS_TONE = { "Visit Completed": "g", "In Progress": "d", "Incomplete": "b", "Ineligible Cafe": "b", "Permanently Closed": "b", "Temporarily Unavailable": "b" };
const shortStatus = (st) => st.replace(" Cafe", "");
const tally = (rows, key) => {
  const m = new Map();
  for (const r of rows) if (r[key]) m.set(r[key], (m.get(r[key]) || 0) + 1);
  return [...m].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
};

function Cafes({ data }) {
  const [status, setStatus] = useState("all");
  const [borough, setBorough] = useState("all");
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(25);
  if (!data.cafes) {
    return (
      <Card title="Café statuses" sub="From the café database">
        <NotConnected icon="☕" source="the café database" what="where every café stands" setup="Cafés appear once they're in the database." />
      </Card>
    );
  }
  const c = data.cafes;
  const list = data.cafeList || [];
  const total = Object.values(c).reduce((n, v) => n + v, 0);
  const rows = CAFE_ORDER.concat(Object.keys(c).filter((k) => !CAFE_ORDER.includes(k))).filter((k) => c[k]).map((k) => ({ label: shortStatus(k), value: c[k] }));
  const closed = (c["Ineligible Cafe"] || 0) + (c["Permanently Closed"] || 0) + (c["Temporarily Unavailable"] || 0);
  const boroughs = [...new Set(list.map((x) => x.borough).filter(Boolean))].sort();
  const statuses = [...new Set(list.map((x) => x.status))].sort((a, b) => CAFE_ORDER.indexOf(a) - CAFE_ORDER.indexOf(b));
  const done = list.filter((x) => x.status === "Visit Completed");
  const needle = q.trim().toLowerCase();
  const filtered = list.filter((x) => (status === "all" || x.status === status) && (borough === "all" || x.borough === borough)
    && (!needle || `${x.name} ${x.borough} ${x.assignedTo || ""} ${x.scout || ""}`.toLowerCase().includes(needle)));

  return (
    <>
      <div className="th-row th-stats">
        <Stat label="Cafés in the database" value={total} foot={`${boroughs.length || "All"} boroughs`} />
        <Stat label="Visits completed" value={c["Visit Completed"] || 0} foot={total ? `${Math.round(((c["Visit Completed"] || 0) / total) * 100)}% of all cafés` : "Scouted and logged"} />
        <Stat label="In progress" value={c["In Progress"] || 0} foot="Assigned and underway" />
        <Stat label="Not a fit" value={closed} foot="Ineligible, closed or unavailable" />
      </div>
      <div className="th-row">
        <Card title="Scouting pipeline" sub="Every café by status" className="th-grow">
          <RankBars rows={rows} unit="Cafés" share={false} suffix="cafés" />
        </Card>
        <Card title="Visits completed by borough" sub="Where the team has scouted" className="th-grow">
          {done.length ? <RankBars rows={tally(done, "borough")} unit="Visits" share={false} suffix="cafés" /> : <p className="th-empty">No completed visits yet.</p>}
        </Card>
        <Card title="Who's scouting" sub="Cafés assigned to each person" className="th-grow">
          {tally(list, "assignedTo").length ? <RankBars rows={tally(list, "assignedTo").slice(0, 6)} unit="Cafés" avatars share={false} suffix="cafés" /> : <p className="th-empty">No assignments yet.</p>}
          <Link to={SCOUT_MAP} className="th-link">Assign cafés on the scout map →</Link>
        </Card>
      </div>
      {list.length > 0 && (
        <Card title="All cafés" sub={`${filtered.length} of ${list.length} · statuses update when a scout logs a visit`}
          right={<input className="th-input th-search" type="search" placeholder="Search cafés or scouts" value={q} onChange={(e) => { setQ(e.target.value); setShown(25); }} />}>
          <div className="th-chips">
            <button type="button" className={`th-chip sm ${status === "all" ? "on" : ""}`} onClick={() => setStatus("all")}>All statuses</button>
            {statuses.map((st) => <button type="button" key={st} className={`th-chip sm ${status === st ? "on" : ""}`} onClick={() => { setStatus(st); setShown(25); }}>{shortStatus(st)} · {c[st] || 0}</button>)}
          </div>
          {boroughs.length > 1 && (
            <div className="th-chips">
              <button type="button" className={`th-chip sm ${borough === "all" ? "on" : ""}`} onClick={() => setBorough("all")}>All boroughs</button>
              {boroughs.map((b) => <button type="button" key={b} className={`th-chip sm ${borough === b ? "on" : ""}`} onClick={() => { setBorough(b); setShown(25); }}>{b}</button>)}
            </div>
          )}
          <div className="th-table-wrap">
            <table className="th-table">
              <thead><tr><th>Café</th><th>Borough</th><th>Assigned to</th><th>Wi-Fi</th><th>Outlets</th><th>Status</th></tr></thead>
              <tbody>
                {filtered.slice(0, shown).map((x) => (
                  <tr key={x.id}>
                    <td className="nm">{x.name}</td>
                    <td>{x.borough || "n/a"}</td>
                    <td>{x.assignedTo || x.scout || "Unassigned"}</td>
                    <td>{x.wifi || "n/a"}</td>
                    <td>{x.outlets || "n/a"}</td>
                    <td><span className={`th-tag ${STATUS_TONE[x.status] || "n"}`}>{shortStatus(x.status)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!filtered.length && <p className="th-empty">No cafés match.</p>}
          {filtered.length > shown && <button className="th-btn ghost" onClick={() => setShown(shown + 50)}>Show more ({filtered.length - shown} left)</button>}
        </Card>
      )}
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

const ROLES = ["Cafe Scout", "Content Creator", "Scout Lead"];

function Signups({ data, onChange, notify }) {
  const [choice, setChoice] = useState({});
  const [busy, setBusy] = useState(null);
  const list = data.pendingSignups || [];
  const pick = (id, key, v) => setChoice({ ...choice, [id]: { role: "Cafe Scout", chapters: [], ...choice[id], [key]: v } });
  const decide = async (r, action) => {
    setBusy(r.id);
    const c = choice[r.id] || { role: "Cafe Scout", chapters: [] };
    const res = await hubFetch("POST", { action, id: r.id, ...c });
    setBusy(null);
    if (!res.ok) return notify({ bad: true, text: res.error || "Something went wrong." });
    notify({ text: action === "signup-reject" ? `${r.name} was declined.` : `${r.name} is on the team${res.welcome?.sent ? " and got a welcome text" : ""}.` });
    onChange();
  };
  return (
    <Card title="New sign-ups" sub="From the join-the-team page · approving sends the welcome texts (day 0, 1 and 7)"
      right={<span className="th-tag n">{list.length} waiting</span>}>
      {!list.length ? <p className="th-empty">No one waiting for approval.</p> : (
        <ul className="th-signups">
          {list.map((r) => {
            const c = choice[r.id] || { role: "Cafe Scout", chapters: [] };
            return (
              <li key={r.id}>
                <div className="th-su-top"><b>{r.name}</b><small>{r.phoneLast4 ? `•••• ${r.phoneLast4}` : "No phone"} · {r.sms_consent ? "Agreed to texts" : "No text consent"} · {when(r.created_at)}</small></div>
                <div className="th-chips">{ROLES.map((role) => <button key={role} type="button" className={`th-chip sm ${c.role === role ? "on" : ""}`} onClick={() => pick(r.id, "role", role)}>{role}</button>)}</div>
                <div className="th-chips">{data.chapters.map((ch) => <button key={ch} type="button" className={`th-chip sm ${c.chapters.includes(ch) ? "on" : ""}`}
                  onClick={() => pick(r.id, "chapters", c.chapters.includes(ch) ? c.chapters.filter((x) => x !== ch) : [...c.chapters, ch])}>{ch}</button>)}</div>
                <div className="th-btns">
                  <button className="th-btn" disabled={busy === r.id} onClick={() => decide(r, "signup-approve")}>Approve</button>
                  <button className="th-btn ghost" disabled={busy === r.id} onClick={() => decide(r, "signup-reject")}>Decline</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

const SOCIAL = [
  { key: "instagram", label: "Instagram", icon: "📸", unit: "followers", setup: "Business or Creator account · no Facebook Page needed" },
  { key: "tiktok", label: "TikTok", icon: "🎵", unit: "followers", setup: "Needs a TikTok developer app" },
  { key: "youtube", label: "YouTube", icon: "▶️", unit: "subscribers", setup: "Free Google API key" },
  { key: "lemon8", label: "Lemon8", icon: "🍋", unit: "followers", setup: "No public API · update weekly by hand" },
];

function ManualEntry({ platform, label, onChange, notify }) {
  const [v, setV] = useState("");
  const save = async () => {
    const r = await hubFetch("POST", { action: "growth-manual", platform, followers: v });
    if (r.ok) { setV(""); notify({ text: `${label} updated.` }); onChange(); } else notify({ bad: true, text: r.error || "Couldn't save." });
  };
  return (
    <div className="th-manual">
      <input className="th-input" inputMode="numeric" placeholder="This week's follower count" value={v} onChange={(e) => setV(e.target.value.replace(/[^\d]/g, ""))} />
      <button className="th-btn ghost" disabled={!v} onClick={save}>Update</button>
    </div>
  );
}

function ConnectTikTok({ notify }) {
  const go = async () => {
    const r = await hubFetch("POST", { action: "tiktok-connect" });
    if (r.ok && r.url) window.location.href = r.url; else notify({ bad: true, text: r.error || "Couldn't start the connection." });
  };
  return (
    <div className="th-btns">
      <button className="th-btn" onClick={go}>Connect TikTok</button>
      <span className="th-hint">Log in with the Work &amp; Brew TikTok account. Read-only.</span>
    </div>
  );
}

function SocialCard({ meta, src, manualReady, onChange, notify }) {
  const live = src?.connected && !src.error;
  const manual = src?.manual;
  const value = live ? src.followers : manual?.followers;
  const fresh = !!manual?.fresh; // hand-entered numbers count as fresh for a week
  return (
    <Card title={meta.label} sub={live ? `Live${src.handle ? ` · ${src.handle}` : ""}` : manual ? `Updated by hand · ${manual.on}` : "Not connected yet"} className="th-half"
      right={live ? <span className="th-tag g">Live</span> : manual ? <span className={`th-tag ${fresh ? "g" : "b"}`}>{fresh ? "Up to date" : "Update due"}</span> : null}>
      {value != null ? (
        <div className="th-social">
          <div className="th-stat-v">{Number(value).toLocaleString()}</div>
          <div className="th-stat-c">{meta.unit}{live && src.posts != null ? ` · ${src.posts.toLocaleString()} posts` : ""}{live && src.views ? ` · ${src.views.toLocaleString()} views` : ""}</div>
          {!live && manual?.previous != null && <Delta now={manual.followers} before={manual.previous} label="vs. last update" />}
        </div>
      ) : src?.error ? <p className="th-note bad">Couldn't load: {src.error}</p>
        : <NotConnected icon={meta.icon} source={meta.label} what={`${meta.unit} and growth`} setup={meta.setup} />}
      {meta.key === "tiktok" && src?.canConnect && <ConnectTikTok notify={notify} />}
      {!live && manualReady && <ManualEntry platform={meta.key} label={meta.label} onChange={onChange} notify={notify} />}
    </Card>
  );
}

function Growth({ data, reload, notify }) {
  const s = data.signups;
  const g = data.growth || {};
  const web = g.website || {};
  const email = g.email || {};
  const followers = SOCIAL.reduce((n, m) => {
    const src = g.social?.[m.key];
    const v = src?.connected && !src.error ? src.followers : src?.manual?.followers;
    return n + (Number(v) || 0);
  }, 0);
  return (
    <>
      <div className="th-row th-stats">
        <Stat label="Team sign-ups · 30D" value={s?.last30 ?? "—"} foot={s ? `${s.pending} waiting for approval` : "Not set up yet"} />
        <Stat label="Website visitors · 30D" value={web.connected && !web.error ? web.visitors30.toLocaleString() : "—"} foot={web.connected && !web.error ? <Delta now={web.visitors30} before={web.prior30} /> : "Connect Google Analytics"} />
        <Stat label="Email subscribers" value={email.connected && !email.error ? email.subscribers.toLocaleString() : "—"} foot={email.connected && !email.error ? (email.new30 != null ? `+${email.new30} in 30 days` : "Brevo") : "Connect Brevo"} />
        <Stat label="Social followers" value={followers ? followers.toLocaleString() : "—"} foot="Instagram, TikTok, YouTube, Lemon8" />
      </div>

      <Signups data={data} onChange={reload} notify={notify} />

      <div className="th-row">
        <Card title="Website visitors" sub="Google Analytics · last 30 days" className="th-grow">
          {web.connected && !web.error ? <DailyBars daily={web.daily.map((d) => ({ date: d.date, sent: d.value, failed: 0 }))} />
            : web.error ? <p className="th-note bad">Couldn't load: {web.error}</p>
            : <NotConnected icon="🌐" source="Google Analytics" what="daily visitors and traffic sources" setup="One-time setup · about 10 minutes" />}
        </Card>
        <Card title={web.connected && !web.error ? "Where visitors come from" : "Email sign-ups"} sub={web.connected && !web.error ? "Sessions by source" : "Brevo"} className="th-side-col">
          {web.connected && !web.error ? <RankBars rows={web.sources} unit="Sessions" />
            : email.connected && !email.error ? <div className="th-social"><div className="th-stat-v">{email.subscribers.toLocaleString()}</div><div className="th-stat-c">subscribers</div></div>
            : <NotConnected icon="✉️" source="Brevo" what="email subscribers" setup="One-time setup · about 5 minutes" />}
        </Card>
      </div>

      <div className="th-row th-wrap">
        {SOCIAL.map((m) => <SocialCard key={m.key} meta={m} src={g.social?.[m.key]} manualReady={g.manualReady} onChange={reload} notify={notify} />)}
      </div>
    </>
  );
}

// ---------------------------------------------------------------- Shell

// ---------------------------------------------------------------- Events

const EVENT_STATUS = { idea: "Idea", planning: "Planning", confirmed: "Confirmed", done: "Done", cancelled: "Cancelled" };
const DEFAULT_CHECKLIST = ["Pick the date", "Book the venue", "Post on Instagram and TikTok", "Text the team the details", "Supplies: name tags, flyers, QR codes", "Confirm who's hosting on the day"];
const toLocalInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const eventWhen = (e) => (e.starts_at
  ? new Date(e.starts_at).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" })
  : "Date not set");
const eventDone = (e) => (e.checklist || []).filter((i) => i.done).length;

function EventForm({ data, initial, onSaved, onCancel, notify }) {
  const [f, setF] = useState(() => ({
    title: initial?.title || "", startsAt: toLocalInput(initial?.starts_at), venue: initial?.venue || "", host: initial?.host || (data.me?.name || ""),
    status: initial?.status || "idea", headcount: initial?.headcount_target ?? "", notes: initial?.notes || "",
  }));
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async () => {
    setBusy(true);
    const body = { action: "event-save", id: initial?.id, ...f, startsAt: f.startsAt ? new Date(f.startsAt).toISOString() : "" };
    if (!initial) body.checklist = DEFAULT_CHECKLIST.map((text) => ({ text, done: false }));
    const r = await hubFetch("POST", body);
    setBusy(false);
    if (r.ok) { notify({ text: initial ? "Event updated." : "Event added." }); onSaved(r.event); }
    else notify({ bad: true, text: r.error || "Couldn't save the event." });
  };
  const hosts = useMemo(() => [...new Set([data.me?.name, ...data.team.map((p) => p.name)].filter(Boolean))], [data]);
  return (
    <Card title={initial ? "Edit event" : "New event"} sub="Saved to the team's database, visible to every department head">
      <div className="th-form">
        <label>Name<input className="th-input" placeholder="Bronx scouts meetup" value={f.title} maxLength={120} onChange={set("title")} /></label>
        <label>Date &amp; time<input className="th-input" type="datetime-local" value={f.startsAt} onChange={set("startsAt")} /></label>
        <label>Venue<input className="th-input" placeholder="Café name or address" value={f.venue} maxLength={200} onChange={set("venue")} /></label>
        <label>Host<input className="th-input" list="th-hosts" value={f.host} maxLength={80} onChange={set("host")} /><datalist id="th-hosts">{hosts.map((h) => <option key={h} value={h} />)}</datalist></label>
        <label>Headcount target<input className="th-input" type="number" min="0" placeholder="12" value={f.headcount} onChange={set("headcount")} /></label>
        <label>Status<select className="th-input" value={f.status} onChange={set("status")}>{Object.entries(EVENT_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <label className="th-form-wide">Notes<textarea className="th-text" rows={3} placeholder="What's the plan, what to bring, who's invited" value={f.notes} maxLength={2000} onChange={set("notes")} /></label>
      </div>
      <div className="th-btns">
        <button className="th-btn" disabled={busy || !f.title.trim()} onClick={save}>{busy ? "Saving…" : "Save event"}</button>
        <button className="th-btn ghost" disabled={busy} onClick={onCancel}>Cancel</button>
      </div>
    </Card>
  );
}

function EventDetail({ event, onChange, onEdit, notify }) {
  const [adding, setAdding] = useState("");
  const [busy, setBusy] = useState(false);
  const list = event.checklist || [];
  const done = eventDone(event);
  const post = async (body) => {
    setBusy(true);
    const r = await hubFetch("POST", { id: event.id, ...body });
    setBusy(false);
    if (!r.ok) notify({ bad: true, text: r.error || "Something went wrong." });
    onChange(r.ok ? r.event : null);
    return r.ok;
  };
  const toggle = (i) => post({ action: "event-check", index: i });
  const addItem = async () => { if (!adding.trim()) return; if (await post({ action: "event-check", checklist: [...list, { text: adding.trim(), done: false }] })) setAdding(""); };
  const removeItem = (i) => post({ action: "event-check", checklist: list.filter((_, j) => j !== i) });
  const remove = async () => { if (window.confirm(`Delete “${event.title}”? This can't be undone.`)) { await post({ action: "event-delete" }); } };
  const markDone = () => post({ action: "event-save", title: event.title, startsAt: event.starts_at || "", venue: event.venue, host: event.host, status: event.status === "done" ? "planning" : "done", headcount: event.headcount_target ?? "", notes: event.notes });
  const draft = `${event.title}${event.starts_at ? ` · ${eventWhen(event)}` : ""}${event.venue ? ` at ${event.venue}` : ""}${event.host ? ` · host: ${event.host}` : ""}. Reply if you can make it!`;
  const textTeam = () => { try { sessionStorage.setItem("wb-hub-draft", draft); } catch { /* private mode */ } };
  return (
    <Card title={event.title} sub={`${eventWhen(event)}${event.venue ? ` · ${event.venue}` : ""}${event.host ? ` · host: ${event.host}` : ""}`}
      right={<span className={`th-tag ev-${event.status}`}>{EVENT_STATUS[event.status] || event.status}</span>}>
      <div className="th-ev-nums">
        <div><div className="th-stat-v">{done} / {list.length}</div><div className="th-stat-c">checklist done</div></div>
        <div><div className="th-stat-v">{event.headcount_target ?? "—"}</div><div className="th-stat-c">headcount target</div></div>
      </div>
      <div className="th-prog"><i style={{ width: `${list.length ? Math.round((done / list.length) * 100) : 0}%` }} /></div>
      {event.notes && <p className="th-ev-notes">{event.notes}</p>}
      <div className="th-caps">Checklist</div>
      <ul className="th-chk">
        {list.map((it, i) => (
          <li key={i} className={it.done ? "done" : ""}>
            <button type="button" className="th-chk-box" disabled={busy} onClick={() => toggle(i)} aria-label={it.done ? "Mark not done" : "Mark done"}>{it.done ? "✓" : ""}</button>
            <span>{it.text}</span>
            <button className="th-x plain" disabled={busy} onClick={() => removeItem(i)} aria-label={`Remove ${it.text}`}>×</button>
          </li>
        ))}
        <li className="th-chk-add">
          <input className="th-input" placeholder="Add an item" value={adding} maxLength={160} onChange={(e) => setAdding(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addItem()} />
          <button className="th-btn ghost" disabled={busy || !adding.trim()} onClick={addItem}>Add</button>
        </li>
      </ul>
      <div className="th-btns">
        <Link className="th-btn" to="/team/messages" onClick={textTeam}>Text the team about this</Link>
        <button className="th-btn ghost" disabled={busy} onClick={markDone}>{event.status === "done" ? "Reopen" : "Mark done"}</button>
        <button className="th-btn ghost" disabled={busy} onClick={onEdit}>Edit</button>
        <button className="th-x" disabled={busy} onClick={remove}>Delete</button>
      </div>
    </Card>
  );
}

function Events({ data, reload, notify }) {
  // Local copy of the server list so a save/toggle shows instantly; resets whenever the hub reloads.
  const [local, setLocal] = useState({ src: data.events, list: data.events });
  if (local.src !== data.events) setLocal({ src: data.events, list: data.events });
  const events = local.src === data.events ? local.list : data.events;
  const setEvents = (fn) => setLocal((l) => ({ src: l.src, list: typeof fn === "function" ? fn(l.list || []) : fn }));
  const [openId, setOpenId] = useState(null);
  const [form, setForm] = useState(null); // null | "new" | event object
  const [now] = useState(() => Date.now());
  if (!events) {
    return <div className="th-card th-center"><p>The events table isn't set up yet. Run the <code>events</code> block at the end of <code>supabase/sms.sql</code> in Supabase → SQL editor, then refresh.</p></div>;
  }
  const live = events.filter((e) => e.status !== "cancelled");
  const upcoming = live.filter((e) => e.status !== "done" && (!e.starts_at || new Date(e.starts_at).getTime() >= now - 864e5));
  const past = live.filter((e) => !upcoming.includes(e));
  const open = events.find((e) => e.id === openId) || upcoming[0] || past[0] || null;
  const openItems = live.reduce((n, e) => n + (e.checklist || []).filter((i) => !i.done).length, 0);
  const yearStart = new Date(new Date().getFullYear(), 0, 1).getTime();
  const pastYear = past.filter((e) => e.starts_at && new Date(e.starts_at).getTime() >= yearStart).length;

  const patch = (ev) => { if (!ev) { reload(); return; } setEvents((l) => (l.some((e) => e.id === ev.id) ? l.map((e) => (e.id === ev.id ? ev : e)) : [...l, ev])); };
  const onDetailChange = (ev) => { if (ev) patch(ev); else { setEvents((l) => l.filter((e) => e.id !== openId)); setOpenId(null); reload(); } };
  const row = (e) => {
    const d = e.starts_at ? new Date(e.starts_at) : null;
    const pct = (e.checklist || []).length ? Math.round((eventDone(e) / e.checklist.length) * 100) : 0;
    return (
      <li key={e.id} className={open?.id === e.id ? "on" : ""}>
        <span className="th-sched-day th-ev-day">{d ? <><b>{d.toLocaleString("en-US", { day: "numeric", timeZone: "America/New_York" })}</b><small>{d.toLocaleString("en-US", { month: "short", timeZone: "America/New_York" }).toUpperCase()}</small></> : <small>TBD</small>}</span>
        <div className="th-sched-body">
          <b>{e.title}</b>
          <small>{[e.venue, d && d.toLocaleString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }), e.host && `host: ${e.host}`].filter(Boolean).join(" · ")}</small>
          <div className="th-prog sm"><i style={{ width: `${pct}%` }} /></div>
        </div>
        <span className={`th-tag ev-${e.status}`}>{EVENT_STATUS[e.status] || e.status}</span>
        <button className="th-btn ghost sm" onClick={() => { setOpenId(e.id); setForm(null); }}>Open</button>
      </li>
    );
  };

  return (
    <>
      <div className="th-row th-stats">
        <Stat label="Upcoming" value={upcoming.length} foot={upcoming[0] ? `next: ${upcoming[0].title}` : "nothing planned yet"} />
        <Stat label="Checklist items open" value={openItems} foot="across all events" />
        <Stat label="Headcount target" value={upcoming[0]?.headcount_target ?? "—"} foot="for the next event" />
        <Stat label="Past events" value={pastYear} foot="this year" />
      </div>
      <div className="th-row">
        <div className="th-stack" style={{ flex: 1, minWidth: 0 }}>
          <Card title="Upcoming" sub="soonest first" right={<button className="th-btn sm" onClick={() => setForm("new")}>New event</button>}>
            {!upcoming.length ? <p className="th-empty">No upcoming events. Tap “New event” to plan one.</p> : <ul className="th-scheds">{upcoming.map(row)}</ul>}
          </Card>
          {!!past.length && <Card title="Past & done"><ul className="th-scheds">{past.slice(0, 20).map(row)}</ul></Card>}
          {form && <EventForm data={data} initial={form === "new" ? null : form} notify={notify}
            onSaved={(ev) => { patch(ev); setOpenId(ev.id); setForm(null); }} onCancel={() => setForm(null)} />}
        </div>
        <div className="th-side-col th-stack">
          {open ? <EventDetail event={open} notify={notify} onChange={onDetailChange} onEdit={() => setForm(open)} />
            : <Card title="No event selected"><p className="th-empty">Add an event and it'll show up here with its checklist.</p></Card>}
        </div>
      </div>
    </>
  );
}

export default function TeamHub() {
  const { user } = useAuth();
  const { section } = useParams();
  const page = PAGES.find((p) => p.key === section) || PAGES[0];
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  // One place for messages ("Sent to 4", "TikTok is connected", errors), shown at the top of the page.
  const [notice, setNotice] = useState(() => {
    const t = new URLSearchParams(window.location.search).get("connected");
    return t ? { text: t, bad: /didn't|expired|cancel|aren't/i.test(t) } : null;
  });
  const notify = (n) => {
    setNotice(n);
    document.querySelector(".th-main")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  useEffect(() => {
    if (window.location.search.includes("connected=")) window.history.replaceState(null, "", window.location.pathname);
  }, []);
  useEffect(() => {
    if (!notice || notice.bad) return; // errors stay until dismissed
    const t = setTimeout(() => setNotice(null), 8000);
    return () => clearTimeout(t);
  }, [notice]);

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
    const View = { overview: Overview, messages: Messages, cafes: Cafes, analytics: Analytics, growth: Growth, events: Events }[page.key];
    body = <View data={data} reload={load} notify={notify} />;
  }

  return (
    <>
    <Navbar />
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
        {notice && (
          <div className={`th-notice ${notice.bad ? "bad" : ""}`} role="status">
            <span>{notice.bad ? "⚠️" : "✓"} {notice.text}</span>
            <button className="th-x plain" onClick={() => setNotice(null)}>Dismiss</button>
          </div>
        )}
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
    </>
  );
}
