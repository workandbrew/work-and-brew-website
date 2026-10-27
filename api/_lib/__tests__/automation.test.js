// @vitest-environment node
import { describe, it, expect } from "vitest";
import { nyToday, saveSchedule, WELCOME_SERIES } from "../automation.js";
import { saveManual } from "../growth.js";

describe("nyToday", () => {
  it("uses New York time, not UTC", () => {
    // 2am UTC on Tuesday Oct 20 is still Monday Oct 19 in New York
    expect(nyToday(new Date("2026-10-20T02:00:00Z"))).toEqual({ date: "2026-10-19", weekday: 1 });
  });
});

describe("welcome series", () => {
  it("goes out on days 0, 1 and 7, in order, with a first-name greeting", () => {
    expect(WELCOME_SERIES.map((s) => s.day)).toEqual([0, 1, 7]);
    for (const s of WELCOME_SERIES) expect(s.body).toContain("{first name}");
  });
});

describe("input checks (nothing is written when they fail)", () => {
  it("rejects a schedule without a message, recipients or day", async () => {
    expect((await saveSchedule({ body: "", recipients: ["all"], weekday: 1 })).status).toBe(400);
    expect((await saveSchedule({ body: "Hi", recipients: [], weekday: 1 })).status).toBe(400);
    expect((await saveSchedule({ body: "Hi", recipients: ["all"], weekday: 9 })).status).toBe(400);
  });
  it("rejects unknown platforms and bad follower counts", async () => {
    expect((await saveManual("myspace", 10)).status).toBe(400);
    expect((await saveManual("lemon8", -3)).status).toBe(400);
    expect((await saveManual("lemon8", "abc")).status).toBe(400);
  });
});

describe("connect state (TikTok sign-in link)", async () => {
  process.env.CRON_SECRET = "test-secret";
  const { makeState, verifyState } = await import("../connectState.js");
  it("accepts a fresh link and rejects tampered or expired ones", () => {
    const s = makeState(1_000_000);
    expect(verifyState(s, 1_000_000 + 60_000)).toBe(true);
    expect(verifyState(s + "x", 1_060_000)).toBe(false);
    expect(verifyState(s, 1_000_000 + 16 * 60_000)).toBe(false);
    expect(verifyState("garbage", 1_000_000)).toBe(false);
  });
});
