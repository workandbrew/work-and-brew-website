import Navbar from "../components/Navbar";
import SiteFooter from "../components/SiteFooter";
import { Link } from "react-router-dom";
import "./PageShared.css";

export default function SmsTerms() {
  return (
    <div className="page-shell">
      <Navbar />
      <div className="legal-page">
        <div className="legal-container">
          <div className="page-badge">Legal · SMS</div>
          <h1 className="legal-title">SMS Terms of Service</h1>
          <p className="legal-meta">Last Updated: September 23, 2026 &nbsp;·&nbsp; New York City, NY</p>

          <p className="legal-intro">
            These terms apply to Work &amp; Brew's text-message reminder program for cafe scouting team
            members. See also our{" "}
            <Link to="/sms-privacy" className="legal-link">SMS Privacy Policy</Link>.
          </p>

          <section className="legal-section">
            <h2>Program Description</h2>
            <p>
              Work &amp; Brew sends recurring text-message reminders to cafe scouting team members who
              sign up, covering assignments, deadlines, and related logistics.
            </p>
          </section>

          <section className="legal-section">
            <h2>Cost &amp; Frequency</h2>
            <p>
              There is no charge from Work &amp; Brew to receive messages, but message and data rates may
              apply from your carrier. Message frequency varies based on team activity.
            </p>
          </section>

          <section className="legal-section">
            <h2>Opting Out</h2>
            <p>
              Reply <strong>STOP</strong> at any time to unsubscribe. You will receive one confirmation
              message and then no further texts.
            </p>
          </section>

          <section className="legal-section">
            <h2>Help</h2>
            <p>
              Reply <strong>HELP</strong> for assistance, or email{" "}
              <a href="mailto:support@workandbrew.app" className="legal-link">support@workandbrew.app</a>.
            </p>
          </section>

          <section className="legal-section">
            <h2>Carriers</h2>
            <p>Carriers are not liable for delayed or undelivered messages.</p>
          </section>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
