import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import "./PageShared.css";

export default function Settings() {
  const { user, signOut, updatePreferredName } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.preferredName || "");

  // no account, no settings
  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  if (!user) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    await updatePreferredName(name.trim());
    alert("Saved! ☕");
  };

  const handleLogout = () => {
    signOut();
    navigate("/");
  };

  return (
    <div className="page-shell">
      <Navbar />
      <div className="page-content">
        <div className="page-badge">Settings</div>
        <h1 className="page-title">Account Settings</h1>

        <form className="settings-card" onSubmit={handleSave}>
          <span className="auth-field-label">Display Name:</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your display name"
          />
          <button type="submit">Save Changes</button>
        </form>

        <div className="page-section-label">More Coming Soon</div>
        <div className="settings-placeholder">
          Email, password, and notification settings will live here soon.
        </div>

        <button className="settings-logout" onClick={handleLogout}>
          Log Out →
        </button>
      </div>
    </div>
  );
}
