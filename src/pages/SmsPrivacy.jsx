import Navbar from "../components/Navbar";
import SiteFooter from "../components/SiteFooter";
import { Link } from "react-router-dom";
import "./PageShared.css";

export default function SmsPrivacy() {
  return (
    <div className="page-shell">
      <Navbar />
      <div className="legal-page">
        <div className="legal-container">
          <div className="page-badge">Legal · SMS</div>
          <h1 className="legal-title">SMS Privacy Policy</h1>
          <p className="legal-meta">Last Updated: September 23, 2026 &nbsp;·&nbsp; New York City, NY</p>

          <p className="legal-intro">
            This policy applies to Work &amp; Brew's text-message reminder program for members of our
            cafe scouting team. It is separate from our main{" "}
            <Link to="/privacy" className="legal-link">Privacy Policy</Link>.
          </p>

          <section className="legal-section">
            <h2>Information We Collect</h2>
            <p>
              When you sign up, we collect your name and mobile phone number. We use these only to send
              you operational reminders about your scouting assignments, deadlines, and related team
              logistics.
            </p>
          </section>

          <section className="legal-section">
            <h2>How We Use Your Information</h2>
            <p>
              Your mobile number is used solely to deliver the text reminders you signed up for. We do
              not use it for advertising or unrelated marketing.
            </p>
          </section>

          <section className="legal-section">
            <h2>Sharing of Information</h2>
            <p>
              <strong>
                Work &amp; Brew does not sell, rent, or share your mobile phone number or SMS opt-in
                information with any third parties or affiliates for their marketing or promotional
                purposes.
              </strong>{" "}
              Phone numbers are shared only with our SMS delivery provider (Twilio) strictly to send the
              messages you requested.
            </p>
          </section>

          <section className="legal-section">
            <h2>Opting Out</h2>
            <p>
              You can stop receiving texts at any time by replying <strong>STOP</strong> to any message.
              For help, reply <strong>HELP</strong> or email{" "}
              <a href="mailto:support@workandbrew.app" className="legal-link">support@workandbrew.app</a>.
              Message and data rates may apply. Message frequency varies.
            </p>
          </section>

          <section className="legal-section">
            <h2>Contact</h2>
            <p>
              Questions about this policy? Email{" "}
              <a href="mailto:support@workandbrew.app" className="legal-link">support@workandbrew.app</a>.
            </p>
          </section>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
