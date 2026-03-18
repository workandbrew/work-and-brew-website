import Navbar from "../components/Navbar";
import "./PageShared.css";

export default function ForOwners() {
  return (
    <div className="page-shell">
      <Navbar />
      <div className="page-content">
        <div className="page-badge">For Café Owners</div>
        <h1 className="page-title">Get discovered <br />by the right people.</h1>
        <p className="page-body">
          Work & Brew puts small, independent cafés front and center. We
          personally visit, verify, and highlight what makes your space unique
          — so remote workers can find you, trust you, and keep coming back.
        </p>
        <p className="page-body">
          No hidden paywalls. No exploiting your wifi passwords. Just honest,
          human-vetted recommendations that drive real foot traffic to your door.
        </p>

        {/* Interest Form Placeholder */}
        <div className="page-section-label">Get Listed</div>
        <form
          className="owner-form"
          onSubmit={(e) => {
            e.preventDefault();
            alert("Thanks! We'll be in touch. ☕");
          }}
        >
          <input type="text" placeholder="Café Name" required />
          <input type="text" placeholder="Neighborhood / Borough" required />
          <input type="email" placeholder="Your Email" required />
          <textarea placeholder="Tell us a little about your café..." rows={4} />
          <button type="submit">Submit Interest ☕</button>
        </form>
      </div>
    </div>
  );
}
