import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./PageShared.css";

export default function Auth({ mode = "login" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const isLogin = mode === "login";

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: wire up to Supabase auth
    alert(`${isLogin ? "Logging in" : "Signing up"} with ${email}`);
  };

  return (
    <div className="page-shell">
      <Navbar />
      <div className="page-content page-content--centered">
        <div className="auth-card">
          <div className="page-badge">{isLogin ? "Welcome back" : "Join the list"}</div>
          <h1 className="page-title" style={{ fontSize: "1.8rem" }}>
            {isLogin ? "Log in to Work & Brew" : "Create your account"}
          </h1>

          <form className="auth-form" onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {!isLogin && (
              <input type="password" placeholder="Confirm Password" required />
            )}
            <button type="submit">
              {isLogin ? "Log In" : "Create Account"} ☕
            </button>
          </form>

          <p className="auth-switch">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <Link to={isLogin ? "/signup" : "/login"}>
              {isLogin ? "Sign up" : "Log in"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
