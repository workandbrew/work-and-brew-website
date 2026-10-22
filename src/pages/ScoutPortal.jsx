import { useParams, useLocation } from "react-router-dom";
import NotFound from "./NotFound";

// Secret key — share this URL only with your scout team:
// workandbrew.app/ops/teambrew26
const SCOUT_SECRET = "teambrew26";

export default function ScoutPortal() {
  const { key } = useParams();
  const { search } = useLocation(); // pass ?suggestions=1&row=3 or ?review=... on to the map

  if (key !== SCOUT_SECRET) return <NotFound />;

  return (
    <iframe
      src={"/scout-map.html" + search}
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
