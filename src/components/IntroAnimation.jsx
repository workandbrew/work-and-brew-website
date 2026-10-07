import { useEffect, useRef, useState } from "react";

/*
  IntroAnimation — 4-phase sequence:
    1. FILL   (~5.5 s) — espresso liquid rises bottom-to-top, screen stays dark
    2. CITY   (~2.5 s) — city silhouette fades in, window lights turn on one by one
    3. TITLE  ( 3.0 s) — "Work & Brew" + founded text hold over the lit city
    4. FADE   ( 1.2 s) — everything fades out to reveal the main page
  Plays once per session (sessionStorage flag).
*/

// ── Building definitions (NYC skyline) ────────────────────────────────────────
const BUILDINGS = [
  { x: 0,    w: 80,  h: 210, hasSpire: false },
  { x: 60,   w: 55,  h: 280, hasSpire: true,  spireH: 40 },
  { x: 100,  w: 70,  h: 190, hasSpire: false },
  { x: 155,  w: 45,  h: 320, hasSpire: true,  spireH: 55 },
  { x: 185,  w: 90,  h: 250, hasSpire: false },
  { x: 260,  w: 60,  h: 360, hasSpire: true,  spireH: 70 },
  { x: 305,  w: 50,  h: 210, hasSpire: false },
  { x: 340,  w: 75,  h: 290, hasSpire: false },
  { x: 400,  w: 55,  h: 380, hasSpire: true,  spireH: 80 },
  { x: 440,  w: 65,  h: 240, hasSpire: false },
  { x: 490,  w: 80,  h: 200, hasSpire: false },
  { x: 555,  w: 50,  h: 310, hasSpire: true,  spireH: 50 },
  { x: 590,  w: 70,  h: 260, hasSpire: false },
  { x: 645,  w: 55,  h: 350, hasSpire: true,  spireH: 65 },
  { x: 685,  w: 85,  h: 220, hasSpire: false },
  { x: 755,  w: 50,  h: 300, hasSpire: false },
  { x: 790,  w: 60,  h: 270, hasSpire: true,  spireH: 45 },
  { x: 835,  w: 75,  h: 190, hasSpire: false },
  { x: 895,  w: 55,  h: 340, hasSpire: true,  spireH: 60 },
  { x: 935,  w: 80,  h: 230, hasSpire: false },
  { x: 1000, w: 60,  h: 280, hasSpire: false },
  { x: 1045, w: 50,  h: 310, hasSpire: true,  spireH: 55 },
  { x: 1080, w: 90,  h: 200, hasSpire: false },
  { x: 1155, w: 55,  h: 260, hasSpire: false },
  { x: 1195, w: 70,  h: 350, hasSpire: true,  spireH: 70 },
];

// Pre-compute all window positions + each window's random light-on delay (0-1)
function buildWindowMap(W, H) {
  const scale  = W / 1280;
  const ground = H;
  const windows = [];

  BUILDINGS.forEach((b, bi) => {
    const bx = b.x * scale;
    const bw = b.w * scale;
    const bh = b.h;
    const by = ground - bh;

    const winW   = Math.max(4, 5  * scale);
    const winH   = 6;
    const winGapX = Math.max(6, 8 * scale);
    const winGapY = 12;
    const cols   = Math.floor((bw - winGapX) / (winW + winGapX));
    const rows   = Math.floor((bh - winGapY) / (winH + winGapY));

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const wx = bx + winGapX + c * (winW + winGapX);
        const wy = by + winGapY + r * (winH + winGapY);
        const lit = Math.random() > 0.32; // ~68% of windows are lit
        windows.push({
          wx, wy, winW, winH,
          lit,
          delay: Math.random(),           // 0-1 within the city phase
          brightness: 0.5 + Math.random() * 0.5,
          twinkleOffset: Math.random() * Math.PI * 2,
        });
      }
    }
  });
  return windows;
}

export default function IntroAnimation({ onDone }) {
  const canvasRef   = useRef(null);
  const animRef     = useRef(null);
  const windowsRef  = useRef(null); // pre-computed window map

  // "fading" state drives React opacity transition
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");

    // ── Timings ────────────────────────────────────────────────────────────────
    const T_FILL  = 3200;  // ms — liquid rises
    const T_CITY  = 1600;  // ms — city + lights appear
    const T_TITLE = 3000;  // ms — Work & Brew holds
    const T_TOTAL = T_FILL + T_CITY + T_TITLE;

    let startTs    = null;
    let wave1 = 0, wave2 = 0;

    function resize() {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      // Rebuild window map whenever canvas resizes
      windowsRef.current = buildWindowMap(canvas.width, canvas.height);
    }
    resize();
    window.addEventListener("resize", resize);

    // ── Easing ─────────────────────────────────────────────────────────────────
    function easeInOut(t) {
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }
    function easeOut(t) {
      return 1 - Math.pow(1 - t, 2);
    }

    // ── Draw a building silhouette ─────────────────────────────────────────────
    function drawBuildings(W, H, scale, cityAlpha) {
      ctx.save();
      ctx.globalAlpha = cityAlpha;
      BUILDINGS.forEach(b => {
        const bx = b.x * scale;
        const bw = b.w * scale;
        const bh = b.h;
        const by = H - bh;

        ctx.fillStyle = "rgba(10,4,1,0.96)";
        ctx.fillRect(bx, by, bw, bh);

        if (b.hasSpire) {
          ctx.beginPath();
          ctx.moveTo(bx + bw / 2 - 4 * scale, by);
          ctx.lineTo(bx + bw / 2, by - b.spireH);
          ctx.lineTo(bx + bw / 2 + 4 * scale, by);
          ctx.closePath();
          ctx.fill();
        }
      });
      ctx.restore();
    }

    // ── Draw window lights ─────────────────────────────────────────────────────
    function drawWindows(cityProgress, ts) {
      const wins = windowsRef.current;
      if (!wins) return;
      wins.forEach(w => {
        if (!w.lit) return;
        // Each window lights up when cityProgress passes its delay
        const localP = Math.min(Math.max((cityProgress - w.delay) / 0.35, 0), 1);
        if (localP <= 0) return;

        // Subtle twinkle once fully on
        const twinkle = localP === 1
          ? 0.85 + 0.15 * Math.sin(ts * 0.001 + w.twinkleOffset)
          : localP;

        ctx.fillStyle = `rgba(255,215,110,${twinkle * w.brightness * 0.75})`;
        ctx.fillRect(w.wx, w.wy, w.winW, w.winH);
      });
    }

    // ── Main render loop ───────────────────────────────────────────────────────
    function drawFrame(ts) {
      if (!startTs) startTs = ts;
      const elapsed = ts - startTs;

      const W = canvas.width;
      const H = canvas.height;
      const scale = W / 1280;

      wave1 += 0.016;
      wave2 += 0.011;

      ctx.clearRect(0, 0, W, H);

      // ── PHASE 1: FILLING ────────────────────────────────────────────────────
      const fillRaw = Math.min(elapsed / T_FILL, 1);
      const fillT   = easeInOut(fillRaw);
      const liquidY = H * (1 - fillT); // top of liquid

      if (fillRaw < 1) {
        // Dark sky above liquid
        ctx.fillStyle = "#0a0402";
        ctx.fillRect(0, 0, W, liquidY);

        // Liquid body
        const liqGrad = ctx.createLinearGradient(0, liquidY, 0, H);
        liqGrad.addColorStop(0,   "#3D1F0A");
        liqGrad.addColorStop(0.3, "#2C1005");
        liqGrad.addColorStop(1,   "#180A02");
        ctx.fillStyle = liqGrad;
        ctx.fillRect(0, liquidY + 18, W, H - liquidY);

        // Wave surface
        ctx.beginPath();
        ctx.moveTo(0, liquidY + 18);
        for (let x = 0; x <= W; x += 4) {
          const y = liquidY
            + Math.sin(x * 0.018 + wave1) * 7
            + Math.sin(x * 0.03  + wave2) * 4
            + 12;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(W, H);
        ctx.lineTo(0, H);
        ctx.closePath();
        ctx.fillStyle = "#2C1005";
        ctx.fill();

        // Foam crest
        ctx.beginPath();
        for (let x = 0; x <= W; x += 4) {
          const y = liquidY
            + Math.sin(x * 0.018 + wave1) * 7
            + Math.sin(x * 0.03  + wave2) * 4
            + 9;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = "rgba(200,140,80,0.22)";
        ctx.lineWidth   = 2.5;
        ctx.stroke();

      } else {

        // ── PHASE 2 & 3: CITY + TITLE ────────────────────────────────────────
        const cityElapsed   = elapsed - T_FILL;
        const cityRaw       = Math.min(cityElapsed / T_CITY, 1);
        const cityAlpha     = easeOut(cityRaw);         // 0 → 1
        const cityProgress  = cityRaw;                  // used for window staggering

        const titleElapsed  = cityElapsed - T_CITY;
        const titleAlpha    = cityRaw >= 1
          ? easeOut(Math.min(titleElapsed / 600, 1))    // fades in over 600ms
          : 0;

        // Full-screen dark background (espresso night sky)
        const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
        bgGrad.addColorStop(0,   "#020101");
        bgGrad.addColorStop(0.6, "#0d0502");
        bgGrad.addColorStop(1,   "#180A02");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);

        // Ambient glow behind skyline (warm amber horizon)
        if (cityAlpha > 0) {
          const glowGrad = ctx.createRadialGradient(W/2, H, 0, W/2, H, W * 0.7);
          glowGrad.addColorStop(0,   `rgba(120,60,15,${0.25 * cityAlpha})`);
          glowGrad.addColorStop(0.5, `rgba(80,30,5,${0.12 * cityAlpha})`);
          glowGrad.addColorStop(1,   "rgba(0,0,0,0)");
          ctx.fillStyle = glowGrad;
          ctx.fillRect(0, 0, W, H);
        }

        // Buildings
        drawBuildings(W, H, scale, cityAlpha);

        // Window lights
        if (cityAlpha > 0) drawWindows(cityProgress, ts);

        // "Work & Brew" title
        if (titleAlpha > 0) {
          ctx.save();
          ctx.globalAlpha = titleAlpha;
          ctx.textAlign   = "center";

          const titleSize = Math.round(W * 0.078);
          const titleY    = H * 0.40;

          // Glow behind title
          ctx.shadowColor = "rgba(200,132,74,0.55)";
          ctx.shadowBlur  = 36;

          ctx.font      = `800 ${titleSize}px 'Yeseva One', Georgia, serif`;
          ctx.fillStyle = "#E0D9CF";
          ctx.fillText("Work & Brew", W / 2, titleY);

          // Founded tagline — closer to the title
          const tagAlpha = Math.min(Math.max((titleElapsed - 200) / 400, 0), 1);
          if (tagAlpha > 0) {
            ctx.globalAlpha = titleAlpha * tagAlpha;
            ctx.shadowBlur  = 8;
            ctx.shadowColor = "rgba(0,0,0,0.4)";
            ctx.font        = `600 ${Math.round(W * 0.019)}px Inter, sans-serif`;
            ctx.fillStyle   = "rgba(224,217,207,0.6)";
            ctx.fillText("NEW YORK CITY · EST. MARCH 2025", W / 2, titleY + titleSize * 0.55);
          }

          ctx.restore();
        }
      }

      // Continue loop until all phases done
      if (elapsed < T_TOTAL) {
        animRef.current = requestAnimationFrame(drawFrame);
      } else {
        // Trigger React fade-out
        setFading(true);
      }
    }

    animRef.current = requestAnimationFrame(drawFrame);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  // When fading starts, wait for CSS transition then call onDone
  useEffect(() => {
    if (!fading) return;
    const t = setTimeout(() => onDone?.(), 1200);
    return () => clearTimeout(t);
  }, [fading, onDone]);

  return (
    <div
      style={{
        position:   "fixed",
        inset:      0,
        zIndex:     9999,
        opacity:    fading ? 0 : 1,
        transition: fading ? "opacity 1.2s ease" : "none",
        pointerEvents: fading ? "none" : "all",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
    </div>
  );
}
