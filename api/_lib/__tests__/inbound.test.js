import { describe, it, expect } from "vitest";
import { twilioSignature, signatureOk, replyKind } from "../inbound.js";

describe("Twilio signature", () => {
  // Example values from Twilio's webhook security docs
  const token = "12345";
  const url = "https://mycompany.com/myapp.php?foo=1&bar=2";
  const params = { CallSid: "CA1234567890ABCDE", Caller: "+12349013030", Digits: "1234", From: "+12349013030", To: "+18005551212" };
  it("matches Twilio's documented signature", () => {
    expect(twilioSignature(token, url, params)).toBe("0/KCTR6DLpKmkAf8muzZqo1nDgQ=");
  });
  it("accepts a correct header and rejects tampering", () => {
    const sig = twilioSignature(token, url, params);
    expect(signatureOk(token, url, params, sig)).toBe(true);
    expect(signatureOk(token, url, { ...params, Digits: "9999" }, sig)).toBe(false);
    expect(signatureOk(token, url, params, "")).toBe(false);
    expect(signatureOk("", url, params, sig)).toBe(false);
  });
});

describe("replyKind", () => {
  it("reads Twilio's OptOutType first", () => {
    expect(replyKind("whatever", "STOP")).toBe("stop");
    expect(replyKind("whatever", "START")).toBe("start");
  });
  it("falls back to keywords, ignoring case and punctuation", () => {
    expect(replyKind(" stop. ")).toBe("stop");
    expect(replyKind("Unsubscribe")).toBe("stop");
    expect(replyKind("start")).toBe("start");
    expect(replyKind("help")).toBe("help");
    expect(replyKind("Stop by the café later?")).toBe("message");
    expect(replyKind("Can't make it Friday")).toBe("message");
  });
});
