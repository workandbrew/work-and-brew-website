import { useParams } from "react-router-dom";
import NotFound from "./NotFound";

// Secret key — share this URL only with your scout team:
// workandbrew.app/ops/teambrew26
const SCOUT_SECRET = "teambrew26";

export default function ScoutPortal() {
  const { key } = useParams();

  if (key !== SCOUT_SECRET) return <NotFound />;

  return (
    <iframe
      src="/scout-map.html"
      title="Work & Brew Scout Portal"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        border: "none",
        zIndex: 9999,
      }}
    />
  );
}
