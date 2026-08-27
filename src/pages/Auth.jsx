import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import "./PageShared.css";

export default function Auth({ mode = "login" }) {
  const [email,         setEmail]         = useState("");
  const [username,      setUsername]      = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [password,      setPassword]      = useState("");
  const [confirmPw,     setConfirmPw]     = useState("");
  const [error,         setError]         = useState("");
  const [submitting,    setSubmitting]    = useState(false);

  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const isLogin = mode === "login";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!isLogin && password !== confirmPw) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    let result;
    if (isLogin) {
      result = await signIn(email, password);
    } else {
      result = await signUp(email, password, username, preferredName);
    }
    setSubmitting(false);

    if (result?.error) {
      setError(result.error.message);
      return;
    }

    navigate("/");
  };

  const handleSocial = async (provider) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider.toLowerCase(),
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) setError(`${provider} sign-in failed: ${error.message}`);
  };

  return (
    <div className="page-shell">
      <Navbar />
      <div className="page-content page-content--centered">
        <h1 className="page-title auth-hero">Welcome to the Work & Brew community!</h1>
        <p className="auth-hero-sub">
          Whether you're a native, visiting, or just a fan — we welcome you!
          No lies, BS, or payment. 100% free :)
        </p>

        <div className="auth-card">
          <div className="page-badge">{isLogin ? "Login Page" : "Join the community!"}</div>

          {error && (
            <p style={{ color: "#c0392b", fontSize: "0.85rem", marginBottom: "10px", textAlign: "center" }}>
              {error}
            </p>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <span className="auth-field-label">Email:</span>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            {!isLogin && (
              <>
                <span className="auth-field-label">Username:</span>
                <input
                  type="text"
                  placeholder="e.g. brewlover_nyc"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
                <span className="auth-field-label">
                  What should we call you?
                  <span className="auth-field-hint"> (your preferred name)</span>
                </span>
                <input
                  type="text"
                  placeholder="e.g. Deni, Alex, CJ…"
                  value={preferredName}
                  onChange={(e) => setPreferredName(e.target.value)}
                />
              </>
            )}

            <span className="auth-field-label">Password:</span>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {!isLogin && (
              <>
                <span className="auth-field-label">Confirm Password:</span>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  required
                />
              </>
            )}

            <button type="submit" disabled={submitting}>
              {submitting ? "Please wait…" : isLogin ? "Log In ☕" : "Create Account ☕"}
            </button>

            {isLogin && (
              <a
                className="auth-forgot"
                href="#forgot"
                onClick={async (e) => {
                  e.preventDefault();
                  if (!email) { setError("Enter your email above first."); return; }
                  const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/login`,
                  });
                  if (error) setError(error.message);
                  else alert("Password reset email sent! Check your inbox ☕");
                }}
              >
                Forgot password?
              </a>
            )}
          </form>

          <div className="auth-divider">
            <span>or continue with</span>
          </div>

          <div className="auth-social">
            <button type="button" onClick={() => handleSocial("Google")}>
              {isLogin ? "Log in with Google" : "Sign up with Google"}
            </button>
            <button type="button" onClick={() => handleSocial("Facebook")}>
              {isLogin ? "Log in with Facebook" : "Sign up with Facebook"}
            </button>
          </div>

          <p className="auth-switch">
            {isLogin ? "New user? " : "Already have an account? "}
            <Link to={isLogin ? "/signup" : "/login"}>
              {isLogin ? "Sign up with your email" : "Log in"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
