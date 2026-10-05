// @vitest-environment node
import { describe, it, expect } from "vitest";
import { isAuthorized, normalizePhone, withStopLine, resolveRecipients, publicScout } from "../sms.js";

const scouts = [
  { id: "11111111-1111-1111-1111-111111111111", name: "Orlando S.", phone: "+17185550001", chapters: ["Bronx"], sms_opt_in: true, active: true },
  { id: "22222222-2222-2222-2222-222222222222", name: "Iris Medina", phone: "+19795550002", chapters: ["Bronx", "Queens"], sms_opt_in: true, active: true },
  { id: "33333333-3333-3333-3333-333333333333", name: "Armando Bishop", phone: "+13475550003", chapters: ["Manhattan-UWS"], sms_opt_in: true, active: true },
  { id: "44444444-4444-4444-4444-444444444444", name: "Jadyn Loredo", phone: "+18385550004", chapters: ["Manhattan-LES"], sms_opt_in: false, active: true },
  { id: "55555555-5555-5555-5555-555555555555", name: "Opted Out", phone: "+19295550005", chapters: ["Bronx"], sms_opt_in: true, active: true, opted_out_at: "2026-09-01T00:00:00Z" },
  { id: "66666666-6666-6666-6666-666666666666", name: "Former Scout", phone: "+19295550006", chapters: ["Bronx"], sms_opt_in: true, active: false },
];
const names = (r) => r.recipients.map((s) => s.name).sort();

describe("isAuthorized", () => {
  const req = (h) => ({ headers: h ? { authorization: h } : {} });
  it("accepts the exact bearer key", () => expect(isAuthorized(req("Bearer s3cret"), "s3cret")).toBe(true));
  it("rejects a wrong or missing key", () => {
    expect(isAuthorized(req("Bearer nope"), "s3cret")).toBe(false);
    expect(isAuthorized(req(), "s3cret")).toBe(false);
    expect(isAuthorized(req("s3cret"), "s3cret")).toBe(false);
  });
  it("fails closed when no key is configured", () => expect(isAuthorized(req("Bearer "), "")).toBe(false));
});

describe("normalizePhone", () => {
  it("formats US numbers as E.164", () => {
    expect(normalizePhone("(929) 471-8403")).toBe("+19294718403");
    expect(normalizePhone("1-929-471-8403")).toBe("+19294718403");
    expect(normalizePhone("+1 929 471 8403")).toBe("+19294718403");
  });
  it("rejects junk", () => {
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("")).toBeNull();
  });
});

describe("withStopLine", () => {
  it("appends the opt-out line", () => expect(withStopLine("Assignments are up.")).toBe("Assignments are up. Reply STOP to opt out."));
  it("doesn't double it", () => expect(withStopLine("Hi! Reply STOP to opt out.")).toBe("Hi! Reply STOP to opt out."));
  it("doesn't count words that merely contain 'stop'", () => expect(withStopLine("Bus stops moved.")).toMatch(/Reply STOP to opt out\.$/));
});

describe("resolveRecipients", () => {
  it("resolves a chapter, skipping people who opted out or left", () => {
    const r = resolveRecipients("Bronx", scouts);
    expect(names(r)).toEqual(["Iris Medina", "Orlando S."]);
    expect(r.skipped.map((s) => s.name)).toEqual(["Opted Out"]);
  });
  it("chapter prefix covers every Manhattan chapter", () => {
    const r = resolveRecipients("manhattan", scouts);
    expect(names(r)).toEqual(["Armando Bishop"]);
    expect(r.skipped).toEqual([expect.objectContaining({ name: "Jadyn Loredo", reason: "has not opted in to texts" })]);
  });
  it("resolves names, ids and mixed lists without duplicates", () => {
    const r = resolveRecipients(["iris", "Queens", scouts[0].id], scouts);
    expect(names(r)).toEqual(["Iris Medina", "Orlando S."]);
  });
  it("only texts a raw phone number if it belongs to a scout", () => {
    expect(names(resolveRecipients("(718) 555-0001", scouts))).toEqual(["Orlando S."]);
    expect(resolveRecipients("+12125559999", scouts).unmatched).toEqual(["+12125559999"]);
  });
  it("reports unmatched entries instead of silently dropping them", () => {
    const r = resolveRecipients(["Bronx", "Staten Island"], scouts);
    expect(r.unmatched).toEqual(["Staten Island"]);
  });
  it("'all' means every active, opted-in scout", () => {
    expect(names(resolveRecipients("all", scouts))).toEqual(["Armando Bishop", "Iris Medina", "Orlando S."]);
  });
});

describe("publicScout", () => {
  it("never exposes the full phone number", () => {
    const p = publicScout(scouts[0]);
    expect(p).not.toHaveProperty("phone");
    expect(p.phoneLast4).toBe("0001");
    expect(p.canText).toBe(true);
  });
});
