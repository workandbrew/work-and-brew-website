import { useEffect, useRef, useState } from "react";

/*
  IntroAnimation — sequence:
    1. FILL   (2.8 s) — espresso liquid rises bottom → top
    2. CITY   (1.2 s) — skyline fades in, window lights turn on one by one
    3. TITLE  (3.0 s) — "Work & Brew" + tagline hold
    4. FADE   (1.0 s) — dissolve to main page
*/

const BUILDINGS = [
  { x: 0,    w: 80,  h: 210, spireH: 0  },
  { x: 60,   w: 55,  h: 280, spireH: 40 },
  { x: 100,  w: 70,  h: 190, spireH: 0  },
  { x: 155,  w: 45,  h: 320, spireH: 55 },
  { x: 185,  w: 90,  h: 250, spireH: 0  },
  { x: 260,  w: 60,  h: 360, spireH: 70 },
  { x: 305,  w: 50,  h: 210, spireH: 0  },
  { x: 340,  w: 75,  h: 290, spireH: 0  },
  { x: 400,  w: 55,  h: 380, spireH: 80 },
  { x: 440,  w: 65,  h: 240, spireH: 0  },
  { x: 490,  w: 80,  h: 200, spireH: 0  },
  { x: 555,  w: 50,  h: 310, spireH: 50 },
  { x: 590,  w: 70,  h: 260, spireH: 0  },
  { x: 645,  w: 55,  h: 350, spireH: 65 },
  { x: 685,  w: 85,  h: 220, spireH: 0  },
  { x: 755,  w: 50,  h: 300, spireH: 0  },
  { x: 790,  w: 60,  h: 270, spireH: 45 },
  { x: 835,  w: 75,  h: 190, spireH: 0  },
  { x: 895,  w: 55,  h: 340, spireH: 60 },
  { x: 935,  w: 80,  h: 230, spireH: 0  },
  { x: 1000, w: 60,  h: 280, spireH: 0  },
  { x: 1045, w: 50,  h: 310, spireH: 55 },
  { x: 1080, w: 90,  h: 200, spireH: 0  },
  { x: 1155, w: 55,  h: 260, spireH: 0  },
  { x: 1195, w: 70,  h: 350, spireH: 70 },
];

// Pre-compute window rects + per-window stagger offset
function buildWindows(W, H) {
  const scale = W / 1280;
  const wins  = [];
  BUILDINGS.forEach(b => {
    const bx = b.x * scale;
    const bw = Math.max(b.w * scale, 10);
    const bh = b.h;
    const by = H - bh;
    const wW = Math.max(4, Math.floor(5 * scale));
    const wH = 6;
    const gX = Math.max(6, Math.floor(8 * scale));
    const gY = 12;
    const cols = Math.max(1, Math.floor((bw - gX) / (wW + gX)));
    const rows = Math.max(1, Math.floor((bh - gY) / (wH + gY)));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (Math.random() > 0.68) continue; // ~68% of windows are lit
        wins.push({
          x: bx + gX + c * (wW + gX),
          y: by + gY + r * (wH + gY),
          w: wW,
          h: wH,
          delay:      Math.random(),                   // 0-1 within city phase
          brightness: 0.55 + Math.random() * 0.45,
          twinkle:    Math.random() * Math.PI * 2,
        });
      }
    }
  });
  return wins;
}

export default function IntroAnimation({ onDone }) {
  const canvasRef  = useRef(null);
  const animRef    = useRef(null);
  const winsRef    = useRef([]);
  const doneRef    = useRef(false); // guard so onDone fires exactly once
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const T_FILL  = 2800;
    const T_CITY  = 1200;
    const T_TITLE = 3000;
    const T_TOTAL = T_FILL + T_CITY + T_TITLE;

    let startTs = null;
    let w1 = 0, w2 = 0;

    function resize() {
      canvas.width  = window.innerWidth  || 400;
      canvas.height = window.innerHeight || 700;
      winsRef.current = buildWindows(canvas.width, canvas.height);
    }
    resize();
    window.addEventListener("resize", resize);

    function ease(t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }
    function easeOut(t) { return 1 - (1-t)*(1-t); }

    function frame(ts) {
      try {
        if (!startTs) startTs = ts;
        const elapsed = ts - startTs;
        const W = canvas.width;
        const H = canvas.height;
        const sc = W / 1280;

        w1 += 0.016; w2 += 0.011;
        ctx.clearRect(0, 0, W, H);

        const fillRaw = Math.min(elapsed / T_FILL, 1);
        const fillT   = ease(fillRaw);
        // liqY goes from H (bottom) down to -H*0.15 (slightly past top) so the
        // wave surface completely exits the top edge before the fill phase ends.
        const liqY = H - fillT * (H * 1.15);

        if (fillRaw < 1) {
          // ─── PHASE 1: FILL ───────────────────────────────────────────────
          // Solid espresso background fills entire screen — no dark "sky" above
          ctx.fillStyle = "#180A02";
          ctx.fillRect(0, 0, W, H);

          // Liquid body — richer brown rising from bottom
          const lg = ctx.createLinearGradient(0, liqY, 0, H);
          lg.addColorStop(0,   "#5a2e14");
          lg.addColorStop(0.25, "#3a1808");
          lg.addColorStop(1,   "#200d03");
          ctx.fillStyle = lg;
          ctx.fillRect(0, Math.max(liqY + 14, 0), W, H);

          // Wave surface (only draw if crest is on screen)
          if (liqY > -20) {
            ctx.beginPath();
            ctx.moveTo(0, Math.max(liqY + 14, 0));
            for (let x = 0; x <= W; x += 3) {
              const y = liqY + Math.sin(x * 0.018 + w1) * 7 + Math.sin(x * 0.031 + w2) * 4 + 10;
              ctx.lineTo(x, y);
            }
            ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
            ctx.fillStyle = "#3a1808";
            ctx.fill();

            // Foam crest
            ctx.beginPath();
            for (let x = 0; x <= W; x += 3) {
              const y = liqY + Math.sin(x * 0.018 + w1) * 7 + Math.sin(x * 0.031 + w2) * 4 + 7;
              x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.strokeStyle = "rgba(200,130,60,0.18)";
            ctx.lineWidth   = 2;
            ctx.stroke();
          }

        } else {
          // ─── PHASE 2 + 3: CITY + TITLE ──────────────────────────────────
          // Background stays espresso-dark the whole time
          ctx.fillStyle = "#180A02";
          ctx.fillRect(0, 0, W, H);

          const cityElapsed = elapsed - T_FILL;
          const cityP = Math.min(cityElapsed / T_CITY, 1);
          const cityA = easeOut(cityP);

          // Subtle warm horizon blush at ground level
          const glow = ctx.createLinearGradient(0, H * 0.65, 0, H);
          glow.addColorStop(0, "rgba(0,0,0,0)");
          glow.addColorStop(1, `rgba(60,22,4,${0.5 * cityA})`);
          ctx.fillStyle = glow;
          ctx.fillRect(0, 0, W, H);

          // Buildings
          ctx.save();
          ctx.globalAlpha = cityA;
          BUILDINGS.forEach(b => {
            const bx = b.x * sc;
            const bw = b.w * sc;
            const bh = b.h;
            const by = H - bh;
            ctx.fillStyle = "rgba(8,3,1,0.97)";
            ctx.fillRect(bx, by, bw, bh);
            if (b.spireH > 0) {
              ctx.beginPath();
              ctx.moveTo(bx + bw/2 - 3*sc, by);
              ctx.lineTo(bx + bw/2, by - b.spireH);
              ctx.lineTo(bx + bw/2 + 3*sc, by);
              ctx.closePath();
              ctx.fill();
            }
          });
          ctx.restore();

          // Window lights staggered on
          winsRef.current.forEach(win => {
            const localP = Math.min(Math.max((cityP - win.delay) / 0.4, 0), 1);
            if (localP <= 0) return;
            const twinkle = localP >= 1
              ? 0.82 + 0.18 * Math.sin(ts * 0.0008 + win.twinkle)
              : localP;
            ctx.fillStyle = `rgba(255,210,100,${twinkle * win.brightness * 0.8 * cityA})`;
            ctx.fillRect(win.x, win.y, win.w, win.h);
          });

          // Title fades in after city is fully revealed
          const titleElapsed = cityElapsed - T_CITY;
          const titleA = cityP >= 1 ? easeOut(Math.min(titleElapsed / 450, 1)) : 0;

          if (titleA > 0) {
            const tSize = Math.round(Math.min(W * 0.082, 96));
            const tY    = H * 0.40;

            // ── Main title — subtle glow only, no hard shadow spread
            ctx.save();
            ctx.globalAlpha = titleA;
            ctx.textAlign   = "center";
            ctx.shadowColor = "rgba(180,100,40,0.35)";
            ctx.shadowBlur  = 10;
            ctx.font        = `800 ${tSize}px 'Yeseva One', Georgia, serif`;
            ctx.fillStyle   = "#E8E0D4";
            ctx.fillText("Work & Brew", W / 2, tY);
            ctx.restore();

            // ── Tagline fades in clearly after title is mostly visible (600ms gap)
            const tagA = Math.min(Math.max((titleElapsed - 600) / 400, 0), 1);
            if (tagA > 0) {
              ctx.save();
              ctx.globalAlpha = titleA * tagA;
              ctx.textAlign   = "center";
              ctx.shadowColor = "rgba(180,100,40,0.2)";
              ctx.shadowBlur  = 5;
              ctx.font        = `500 ${Math.round(Math.min(W * 0.020, 22))}px Inter, sans-serif`;
              ctx.fillStyle   = "rgba(220,210,195,0.65)";
              ctx.fillText("NEW YORK CITY · EST. MARCH 2025", W / 2, tY + tSize * 0.42 + 4);
              ctx.restore();
            }
          }
        }

        if (elapsed < T_TOTAL) {
          animRef.current = requestAnimationFrame(frame);
        } else {
          // Done — trigger fade
          if (!doneRef.current) {
            doneRef.current = true;
            setFading(true);
          }
        }
      } catch (err) {
        // If canvas drawing throws for any reason, still complete the animation
        console.error("IntroAnimation draw error:", err);
        if (!doneRef.current) {
          doneRef.current = true;
          setFading(true);
        }
      }
    }

    animRef.current = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  // After fade CSS transition, call onDone
  useEffect(() => {
    if (!fading) return;
    const t = setTimeout(() => onDone?.(), 1000);
    return () => clearTimeout(t);
  }, [fading, onDone]);

  // Safety net — if 15s pass and we're still showing, force complete
  useEffect(() => {
    const t = setTimeout(() => {
      if (!doneRef.current) {
        doneRef.current = true;
        onDone?.();
      }
    }, 15000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div style={{
      position:      "fixed",
      inset:         0,
      zIndex:        9999,
      opacity:       fading ? 0 : 1,
      transition:    fading ? "opacity 1s ease" : "none",
      pointerEvents: fading ? "none" : "all",
    }}>
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
    </div>
  );
}
