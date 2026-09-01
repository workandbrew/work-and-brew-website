import Navbar from "../components/Navbar";
import SiteFooter from "../components/SiteFooter";
import "./PageShared.css";

export default function Privacy() {
  return (
    <div className="page-shell">
      <Navbar />
      <div className="legal-page">
        <div className="legal-container">
          <div className="page-badge">Legal</div>
          <h1 className="legal-title">Privacy Policy</h1>
          <p className="legal-meta">Effective Date: August 28, 2026 &nbsp;·&nbsp; Last Updated: August 31, 2026 &nbsp;·&nbsp; New York City, NY</p>

          <p className="legal-intro">
            Work &amp; Brew ("we," "us," or "our") is committed to protecting your privacy. This Privacy
            Policy explains what information we collect from users of our website at{" "}
            <a href="https://workandbrew.app" className="legal-link">workandbrew.app</a> and related
            services (the "Service"), how we use it, who we share it with, and what rights you have over
            your data. By using the Service, you agree to the practices described in this policy.
          </p>

          <section className="legal-section">
            <h2>1. Who We Are</h2>
            <p>
              Work &amp; Brew is an independently operated café finder and community platform built for
              remote workers and digital nomads across New York City. We are currently operating as an
              independent project, not yet incorporated as an LLC, founded and led by Denisse Medina F.,
              based in New York City, NY, with a team of 9 people spread across the five boroughs.
            </p>
            <p>
              We care deeply about the communities we serve — both the café owners trying to grow their
              businesses and the workers looking for a great place to get things done. This Privacy Policy
              reflects that care. For any privacy-related inquiries, please contact us at{" "}
              <a href="mailto:support@workandbrew.app" className="legal-link">support@workandbrew.app</a>.
            </p>
          </section>

          <section className="legal-section">
            <h2>2. Information We Collect</h2>
            <p>
              <strong>Information you provide directly.</strong> When you create an account, we collect
              your email address, a chosen username, and an optional preferred display name. We never
              store your password in plain text — it is securely hashed. If you submit a café partnership
              or business inquiry, we collect your name, business name, email address, website URL, and
              the content of your message. If you submit a café suggestion, we collect the café name and
              your suggestion text. When you save a café to your profile, that preference is stored and
              associated with your account so you can access it across devices.
            </p>
            <p>
              <strong>Information collected automatically.</strong> We use Google Analytics to understand
              how visitors use our site — which pages they visit, how long they stay, and their general
              geographic location at the city or country level. This data is anonymized and does not
              personally identify you. Standard server logs may also include your IP address, browser
              type, and operating system for security and performance purposes. When you load our café
              map, your IP address is sent to MapTiler as part of loading the map tiles. We use cookies
              for session management, Google Analytics, and reCAPTCHA bot protection on our forms.
            </p>
            <p>
              <strong>Information from third-party sign-in.</strong> If you choose to sign in using
              Google, we receive your name and email address from that provider. We do not
              receive, store, or have access to your password for that external account. You can revoke
              this access at any time through your Google account settings.
            </p>
          </section>

          <section className="legal-section">
            <h2>3. How We Use Your Information</h2>
            <p>
              We use the information we collect to create and manage your account, authenticate your
              identity, and keep your profile up to date. We use it to personalize your experience by
              remembering your saved cafés across devices. We use business inquiry submissions to review,
              respond to, and act on café partnership opportunities. We analyze anonymized usage data to
              improve features, fix bugs, and make better decisions about what to build next. We use
              reCAPTCHA to detect and prevent fraud and automated abuse on our forms. We may send
              important account-related notifications such as password resets or policy updates, but we
              do not send marketing emails without your explicit consent.
            </p>
            <p>
              We will never sell your personal data. We will never use your information to serve
              third-party advertisements. Your data is used exclusively to operate and improve
              Work &amp; Brew.
            </p>
          </section>

          <section className="legal-section">
            <h2>4. Third-Party Services We Use</h2>
            <p>
              We rely on trusted third-party providers to operate Work &amp; Brew. <strong>Supabase</strong> serves
              as our database and authentication provider, securely storing your account data and saved
              café preferences. <strong>MapTiler</strong> provides the interactive map tiles on our café
              map, and your IP address is sent to their servers when the map loads. <strong>Google Analytics</strong> provides
              anonymized usage tracking to help us understand how people use our platform. We offer
              optional sign-in through <strong>Google OAuth</strong>, governed by Google's privacy policy. <strong>Google reCAPTCHA</strong> protects
              our forms from spam and automated abuse. <strong>Vercel</strong> hosts and deploys our
              website, and standard server logs may be collected on their end.
            </p>
            <p>
              Each of these providers has its own privacy policy, and we encourage you to review them.
              We do not sell, rent, or share your personal data with any third party for advertising or
              commercial purposes.
            </p>
          </section>

          <section className="legal-section">
            <h2>5. Data Retention</h2>
            <p>
              We retain your account data — including your email address, username, and saved preferences
              — for as long as your account is active and for a reasonable period afterward in case you
              choose to return. Business inquiry submissions are retained for up to two years for
              record-keeping purposes. Café suggestions may be retained indefinitely as they inform our
              product improvements. Analytics data is aggregated, anonymized, and may be retained
              indefinitely.
            </p>
            <p>
              If you request account deletion, we will remove your personal information within 30 days,
              except where we are required by law to retain it longer. To request deletion, please email{" "}
              <a href="mailto:support@workandbrew.app" className="legal-link">support@workandbrew.app</a>.
            </p>
          </section>

          <section className="legal-section">
            <h2>6. Your Rights</h2>
            <p>
              You have the right to access the personal data we hold about you, correct any inaccurate
              information through your account Settings, and request that we delete your account and
              associated personal data. You may opt out of Google Analytics at any time using the Google
              Analytics Opt-out Browser Add-on. Where technically feasible, you may request your data in
              a portable format. You may also withdraw any consent you have given us at any time.
            </p>
            <p>
              To exercise any of these rights, email us at{" "}
              <a href="mailto:support@workandbrew.app" className="legal-link">support@workandbrew.app</a>.
              We will respond within 30 days and will never penalize you for exercising your privacy rights.
            </p>
          </section>

          <section className="legal-section">
            <h2>7. Children's Privacy</h2>
            <p>
              Work &amp; Brew is intended for users aged 13 and older. We do not knowingly collect
              personal information from children under the age of 13. If you are a parent or guardian
              and believe that a child under 13 has provided us with their personal information, please
              contact us immediately at{" "}
              <a href="mailto:support@workandbrew.app" className="legal-link">support@workandbrew.app</a>.
              We will investigate and delete any such information promptly. Users between the ages of 13
              and 17 are welcome to use Work &amp; Brew, and we encourage parental awareness of their
              activity on the platform.
            </p>
          </section>

          <section className="legal-section">
            <h2>8. Data Security</h2>
            <p>
              We take reasonable technical and organizational measures to protect your personal data
              against unauthorized access, alteration, disclosure, or destruction. These include HTTPS
              encryption for all data transmitted between your browser and our servers, secure password
              hashing so passwords are never stored in plain text, database access controls through
              Supabase's Row Level Security, environment variable protection to ensure API keys and
              credentials are never exposed in our public codebase, and reCAPTCHA to prevent automated
              abuse of our forms.
            </p>
            <p>
              While we do everything we reasonably can, no method of internet transmission is 100%
              secure. We cannot guarantee absolute security, but we will notify you if a breach occurs
              that affects your personal data.
            </p>
          </section>

          <section className="legal-section">
            <h2>9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time as our Service evolves or as legal
              requirements change. When we make material changes, we will update the "Last Updated" date
              at the top of this page. For significant changes, we may also notify you via email or a
              notice on the site. Your continued use of the Service after any changes are posted
              constitutes your acceptance of the updated policy. We encourage you to review this page
              periodically.
            </p>
          </section>

          <section className="legal-section">
            <h2>10. Contact Us</h2>
            <p>
              If you have any questions, concerns, or requests related to this Privacy Policy or your
              personal data, please reach out. We're a small, human team and we take every inquiry
              seriously. We will respond within 30 days.
            </p>
            <p className="legal-contact">
              Work &amp; Brew, founded by Denisse Medina F.<br />
              New York City, NY<br />
              <a href="mailto:support@workandbrew.app" className="legal-link">support@workandbrew.app</a>
            </p>
          </section>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
