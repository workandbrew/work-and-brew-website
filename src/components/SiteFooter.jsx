import { Link } from "react-router-dom";
import "./SiteFooter.css";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <p className="site-footer-copy">© {new Date().getFullYear()} Work &amp; Brew · New York City</p>
      <div className="site-footer-links">
        <Link to="/privacy" className="site-footer-link">Privacy Policy</Link>
        <span className="site-footer-dot" aria-hidden="true">·</span>
        <Link to="/terms" className="site-footer-link">Terms of Service</Link>
        <span className="site-footer-dot" aria-hidden="true">·</span>
        <a href="mailto:support@workandbrew.app" className="site-footer-link">Contact</a>
      </div>
    </footer>
  );
}
