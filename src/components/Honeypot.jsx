import { HONEYPOT_FIELD } from "../lib/honeypot";

// Hidden "honeypot" field: invisible to people and screen readers, but bots tend to fill it.
// Check it with isBot(event) from src/lib/honeypot.js and silently drop the submission if true.

export default function Honeypot() {
  return (
    <input
      type="text"
      name={HONEYPOT_FIELD}
      tabIndex={-1}
      autoComplete="off"
      aria-hidden="true"
      style={{ position: "absolute", left: "-10000px", width: 1, height: 1, opacity: 0 }}
      defaultValue=""
    />
  );
}

