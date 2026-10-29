// @vitest-environment node
// A text scheduled for later must never go out early. These fake Twilio and Supabase and check what deliver() does.
import { describe, it, expect, vi, beforeEach } from "vitest";

const people = [
  { id: "a", name: "Ana One", phone: "+17185550001", chapters: [], sms_opt_in: true, active: true },
  { id: "b", name: "Ben Two", phone: "+17185550002", chapters: [], sms_opt_in: true, active: true },
  { id: "c", name: "Cy Three", phone: "+17185550003", chapters: [], sms_opt_in: true, active: true },
];
const logged = [];
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (table) => ({
      select: () => ({ eq: () => ({ order: async () => ({ data: people, error: null }) }) }),
      insert: async (row) => { if (table === "sms_messages") logged.push(row); return { error: null }; },
      update: () => ({ eq: async () => ({ error: null }) }),
    }),
  }),
}));

process.env.SUPABASE_URL = "https://x.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "k";
process.env.TWILIO_ACCOUNT_SID = "AC1";
process.env.TWILIO_MESSAGING_SERVICE_SID = "MG1";
process.env.TWILIO_AUTH_TOKEN = "t";

const { deliver } = await import("../sms.js");
const calls = [];
const twilioReplies = (status) => vi.fn(async (url, init) => {
  calls.push(Object.fromEntries(new URLSearchParams(init.body)));
  return { ok: true, json: async () => ({ sid: "SM" + calls.length, status }) };
});
const sunday = new Date(Date.now() + 3 * 864e5).toISOString();

beforeEach(() => { calls.length = 0; logged.length = 0; });

describe("scheduled texts", () => {
  it("asks Twilio to hold every text until the chosen time, in Twilio's time format", async () => {
    global.fetch = twilioReplies("scheduled");
    const r = await deliver({ to: "all", message: "See you Sunday!", sendAt: sunday });
    expect(r.json.sent).toBe(3);
    expect(r.json.scheduledAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    expect(calls).toHaveLength(3);
    for (const c of calls) { expect(c.ScheduleType).toBe("fixed"); expect(c.SendAt).toBe(r.json.scheduledAt); }
    expect(logged.every((l) => l.scheduled_for === r.json.scheduledAt)).toBe(true);
  });
  it("stops after the first person if Twilio sends right away instead of holding it", async () => {
    global.fetch = twilioReplies("accepted");
    const r = await deliver({ to: "all", message: "See you Sunday!", sendAt: sunday });
    expect(calls).toHaveLength(1);
    expect(r.json.sent).toBe(1);
    expect(r.json.ok).toBe(false);
    expect(r.json.scheduledAt).toBeNull();
    expect(r.json.error).toMatch(/right away/);
  });
  it("sends immediately when no time is picked", async () => {
    global.fetch = twilioReplies("accepted");
    const r = await deliver({ to: "all", message: "Now please" });
    expect(calls).toHaveLength(3);
    expect(calls.every((c) => !c.SendAt)).toBe(true);
    expect(r.json.ok).toBe(true);
  });
  it("refuses a time less than 15 minutes away", async () => {
    global.fetch = twilioReplies("scheduled");
    const r = await deliver({ to: "all", message: "x", sendAt: new Date(Date.now() + 5 * 60e3).toISOString() });
    expect(r.status).toBe(400);
    expect(calls).toHaveLength(0);
  });
});
