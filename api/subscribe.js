// api/subscribe.js
// Serverless function — adds an email to the Brevo contact list.
// BREVO_API_KEY and BREVO_LIST_ID live only in Vercel's server-side
// environment variables and are never exposed to the browser.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email } = req.body || {};
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Valid email required." });
  }

  const apiKey  = process.env.BREVO_API_KEY;
  const listId  = parseInt(process.env.BREVO_LIST_ID, 10);

  if (!apiKey || !listId) {
    console.error("Brevo env vars missing");
    return res.status(500).json({ error: "Server configuration error." });
  }

  try {
    const brevoRes = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        email,
        listIds: [listId],
        updateEnabled: true,
        attributes: { SOURCE: "coming_soon_wall" },
      }),
    });

    // Any 2xx from Brevo = success (201 = created, 204 = updated, 200 = some edge cases)
    if (brevoRes.status >= 200 && brevoRes.status < 300) {
      return res.status(200).json({ ok: true });
    }

    const body = await brevoRes.json().catch(() => ({}));

    // Brevo returns 400 with these codes when the contact already exists in the list
    if (body?.code === "duplicate_parameter" || body?.code === "contact_already_in_list") {
      return res.status(200).json({ ok: true }); // already subscribed — treat as success
    }

    console.error("Brevo error:", brevoRes.status, body);
    return res.status(500).json({ error: body?.message || "Could not subscribe. Please try again." });
  } catch (err) {
    console.error("Subscribe error:", err);
    return res.status(500).json({ error: "Something went wrong. Try again." });
  }
}
