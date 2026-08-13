import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./PageShared.css";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="page-shell">
      <Navbar />
      <div className="page-content page-content--centered">
        <div className="page-badge">404</div>
        <h1 className="page-title">This page is invalid.</h1>
        <p className="page-body">
          Looks like this page isn't here. Let's get you back to the map.
        </p>
        <button
          onClick={() => navigate("/")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "14px 32px",
            borderRadius: "12px",
            border: "none",
            background: "linear-gradient(135deg, #7a3b1e 0%, #a0522d 100%)",
            color: "#f4efe6",
            fontSize: "0.95rem",
            fontWeight: 700,
            fontFamily: "Inter, sans-serif",
            letterSpacing: "0.02em",
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(122,59,30,0.35)",
            transition: "opacity 0.15s, transform 0.15s",
          }}
          onMouseOver={e => { e.currentTarget.style.opacity = "0.88"; e.currentTarget.style.transform = "translateY(-1px)"; }}
          onMouseOut={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "translateY(0)"; }}
        >
          ☕ Back to Home
        </button>
      </div>
    </div>
  );
}
