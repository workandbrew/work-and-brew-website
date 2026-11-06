// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

const rows = [
  // newest first, like the real query
  { id: 3, batch_id: "b1", scout_id: "a", status: "scheduled", body: "Hi Ann! Meetup at 4. Reply STOP to opt out.", scheduled_for: "2099-11-02T21:00:00Z", created_at: "2026-10-31T18:00:00Z", sent_by: "Team Hub · Denisse" },
  { id: 2, batch_id: "b1", scout_id: "a", status: "replaced", error: "Replaced by an edit", body: "Hi Ann! Meetup at 3. Reply STOP to opt out.", scheduled_for: "2099-11-01T20:00:00Z", created_at: "2026-10-30T18:00:00Z", sent_by: "Team Hub · Denisse" },
  { id: 1, batch_id: "b0", scout_id: "a", status: "delivered", body: "Hello. Reply STOP to opt out.", created_at: "2026-10-29T18:00:00Z", sent_by: "gwen" },
];
const q = (data) => { const o = { select: () => o, order: () => o, limit: () => Promise.resolve({ data, error: null }), then: (f) => Promise.resolve({ data, error: null }).then(f) }; return o; };
vi.mock("../sms.js", async (orig) => ({
  ...(await orig()),
  db: () => ({ from: (t) => q(t === "sms_messages" ? rows : [{ id: "a", name: "Ann Lee" }]) }),
  refreshDelivery: async () => {},
}));

describe("recentLog with an edited scheduled text", () => {
  it("shows one entry with the new time and records the edit", async () => {
    const { recentLog } = await import("../../hub.js");
    const { log } = await recentLog();
    expect(log).toHaveLength(2);
    const b = log.find((x) => x.id === "b1");
    expect(b.state).toBe("scheduled");
    expect(b.scheduledFor).toBe("2099-11-02T21:00:00Z");
    expect(b.recipients).toHaveLength(1);
    expect(b.at).toBe("2026-10-30T18:00:00Z");
    expect(b.edits).toEqual([expect.objectContaining({ fromTime: "2099-11-01T20:00:00Z", toTime: "2099-11-02T21:00:00Z", by: "Team Hub · Denisse" })]);
  });
});
