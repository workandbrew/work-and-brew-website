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
        <h1 className="page-title">This spot doesn't exist.</h1>
        <p className="page-body">
          Looks like this café closed down. Let's get you back to the map.
        </p>
        <button className="btn-primary" onClick={() => navigate("/")}>
          Back to the Map ☕
        </button>
      </div>
    </div>
  );
}
