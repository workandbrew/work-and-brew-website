// /api/hub — the server side of the private Team Hub page (/team).
//
// Only logged-in website users whose email is in the Supabase `hub_admins` table get in
// (Den, David, Armando, Sayraliz). The browser sends its Supabase login token:
//   Authorization: Bearer <supabase access token>
//
//   GET                                       → { me, team, chapters, log }
//   POST { action: "preview", to, message }   → who would get it + the exact text (sends nothing)
//   POST { action: "send",    to, message }   → sends, logged with the sender's name
//
// Sending goes through the same deliver() as Gwen, so the same rules apply: only active,
// opted-in team members, STOP line always added, max 25 recipients per send.

import { readBody, db, loadScouts, publicScout, deliver } from "./_lib/sms.js";

async function hubUser(req) {
  const header = req.headers?.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return { status: 401, error: "Please log in." };
  const { data, error } = await db().auth.getUser(token);
  const email = data?.user?.email?.toLowerCase();
  if (error || !email) return { status: 401, error: "Your login expired. Please log in again." };
  const { data: admin, error: adminErr } = await db()
    .from("hub_admins").select("email, name, role").ilike("email", email).maybeSingle();
  if (adminErr) return { status: 500, error: `Team Hub isn't set up yet (${adminErr.message})` };
  if (!admin) return { status: 403, error: "The Team Hub is for department heads only." };
  return { admin };
}

// Groups log rows from one send (same batch) into a single entry, newest first.
async function recentLog() {
  const [{ data: rows, error }, { data: people }] = await Promise.all([
    db().from("sms_messages").select("*").order("created_at", { ascending: false }).limit(400),
    db().from("sms_contacts").select("id, name"),
  ]);
  if (error) throw new Error(error.message);
  const names = new Map((people || []).map((p) => [p.id, p.name]));
  const batches = new Map();
  for (const r of rows || []) {
    const key = r.batch_id || r.id;
    if (!batches.has(key)) {
      batches.set(key, { id: key, at: r.created_at, from: r.sent_by || "unknown", body: r.body, recipients: [] });
    }
    batches.get(key).recipients.push({
      name: names.get(r.scout_id) || "Removed contact",
      ok: r.status !== "failed",
      error: r.error || null,
    });
  }
  return [...batches.values()].slice(0, 60).map((b) => ({
    ...b,
    sent: b.recipients.filter((x) => x.ok).length,
    failed: b.recipients.filter((x) => !x.ok).length,
  }));
}

export default async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, error: "GET/POST only" });
  }
  let who;
  try { who = await hubUser(req); } catch (e) { return res.status(500).json({ ok: false, error: e.message }); }
  if (!who.admin) return res.status(who.status).json({ ok: false, error: who.error });
  const me = who.admin;

  try {
    if (req.method === "GET") {
      const [scouts, log] = await Promise.all([loadScouts(), recentLog()]);
      const team = scouts.map((s) => ({ ...publicScout(s), optedOut: !!s.opted_out_at, optedIn: !!s.sms_opt_in }));
      const chapters = [...new Set(team.flatMap((s) => s.chapters))].sort();
      const monthAgo = Date.now() - 30 * 864e5;
      const sent30 = log.filter((b) => new Date(b.at).getTime() >= monthAgo).reduce((n, b) => n + b.sent, 0);
      return res.status(200).json({ ok: true, me, team, chapters, log, stats: { sent30 } });
    }

    const { action, to, message } = readBody(req);
    if (!["preview", "send"].includes(action)) {
      return res.status(400).json({ ok: false, error: 'action must be "preview" or "send"' });
    }
    const { status, json } = await deliver({
      to, message, dryRun: action === "preview", sentBy: `Team Hub · ${me.name || me.email}`,
    });
    res.status(status).json(json);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}
