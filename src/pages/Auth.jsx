import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import SiteFooter from "../components/SiteFooter";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import "./PageShared.css";

export default function Auth() {
  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [error,      setError]      = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resetSent,  setResetSent]  = useState(false);

  const { signIn } = useAuth();
  const navigate   = useNavigate();
  const [params]   = useSearchParams();
  // only same-site paths, e.g. /login?next=/team
  const next = /^\/(?!\/)/.test(params.get("next") || "") ? params.get("next") : "/";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const result = await signIn(email, password);
    setSubmitting(false);
    if (result?.error) {
      setError("Invalid email or password.");
      return;
    }
    navigate(next);
  };

  const handleForgotPassword = async () => {
    if (!email) { setError("Enter your email above first."); return; }
    setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    if (error) { setError(error.message); return; }
    setResetSent(true);
  };

  return (
    <div className="page-shell">
      <Navbar />
      <div className="page-content page-content--centered">
        <h1 className="page-title auth-hero">Welcome back ☕</h1>
        <p className="auth-hero-sub">
          This area is for the Work &amp; Brew team only. Access is by invitation.
        </p>

        <div className="auth-card">
          <div className="page-badge">Team Login</div>

          {resetSent ? (
            <div style={{ textAlign: "center", padding: "1rem 0" }}>
              <p style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📬</p>
              <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Check your email</p>
              <p style={{ fontSize: "0.9rem", color: "rgba(224,217,207,0.75)", lineHeight: 1.6 }}>
                A password reset link was sent to <strong>{email}</strong>.
              </p>
              <button
                type="button"
                style={{ marginTop: "1.25rem" }}
                onClick={() => setResetSent(false)}
              >
                Back to login
              </button>
            </div>
          ) : (
            <>
              {error && (
                <p style={{ color: "#c0392b", fontSize: "0.85rem", marginBottom: "10px", textAlign: "center" }}>
                  {error}
                </p>
              )}

              <form className="auth-form" onSubmit={handleSubmit}>
                <span className="auth-field-label">Email</span>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />

                <span className="auth-field-label">Password</span>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />

                <button type="submit" disabled={submitting}>
                  {submitting ? "Signing in…" : "Log In ☕"}
                </button>

                <a
                  className="auth-forgot"
                  href="#forgot"
                  onClick={(e) => { e.preventDefault(); handleForgotPassword(); }}
                >
                  Forgot password?
                </a>
              </form>
            </>
          )}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
