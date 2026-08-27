import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Navbar.css";

export default function Navbar() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const close = () => setMenuOpen(false);

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo" onClick={close}>
        <img src="/logo.png" alt="Work & Brew" className="navbar-logo-img" />
      </Link>

      <div className="navbar-links">
        <Link to="/">Find Cafés ☕</Link>
        <Link to="/about">Our Story</Link>
        <Link to="/for-owners">Business Inquiries</Link>
        {/* members only — shows up once you're signed in */}
        {user && <Link to="/dashboard">My Cafés</Link>}
      </div>

      <div className="navbar-buttons">
        {user ? (
          <button
            className="navbar-user"
            title="Account settings"
            onClick={() => navigate("/settings")}
          >
            {(user.username || "?").charAt(0).toUpperCase()}
          </button>
        ) : (
          <>
            <button className="navbar-login" onClick={() => navigate("/login")}>
              Log In
            </button>
            <button className="navbar-cta" onClick={() => navigate("/signup")}>
              Sign Up
            </button>
          </>
        )}
      </div>

      {/* Hamburger toggle — only visible on mobile */}
      <button
        className={`navbar-hamburger${menuOpen ? " is-open" : ""}`}
        onClick={() => setMenuOpen((v) => !v)}
        aria-label={menuOpen ? "Close menu" : "Open menu"}
      >
        <span />
        <span />
        <span />
      </button>

      {/* Mobile drawer — always in DOM, toggled via is-open class */}
      <div className={`navbar-mobile-menu${menuOpen ? " is-open" : ""}`}>
        <Link to="/" onClick={close}>Find Cafés ☕</Link>
        <Link to="/about" onClick={close}>Our Story</Link>
        <Link to="/for-owners" onClick={close}>Business Inquiries</Link>
        {user && <Link to="/dashboard" onClick={close}>My Cafés</Link>}

        <div className="navbar-mobile-auth">
          {user ? (
            <button
              onClick={() => { navigate("/settings"); close(); }}
            >
              Account Settings
            </button>
          ) : (
            <>
              <button onClick={() => { navigate("/login"); close(); }}>
                Log In
              </button>
              <button
                className="navbar-cta"
                onClick={() => { navigate("/signup"); close(); }}
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
