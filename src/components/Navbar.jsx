import { Link, useNavigate } from "react-router-dom";
import "./Navbar.css";

export default function Navbar() {
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo">
        <img src="/logo.png" alt="Work & Brew" className="navbar-logo-img" />
      </Link>
      <div className="navbar-links">
        <Link to="/">Find Cafés ☕</Link>
        <Link to="/about">Our Story</Link>
        <Link to="/for-owners">For Café Owners</Link>
        <Link to="/dashboard">My Cafés</Link>
        <button className="navbar-cta" onClick={() => navigate("/signup")}>
          Sign Up
        </button>
        <button className="navbar-login" onClick={() => navigate("/login")}>
          Log In
        </button>
      </div>
    </nav>
  );
}
