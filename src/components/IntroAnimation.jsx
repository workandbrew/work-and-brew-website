import { useEffect, useRef, useState } from "react";

/*
  IntroAnimation — espresso liquid rises full-screen, Work & Brew title fades in,
  modern NYC skyline visible, then the overlay fades out to reveal the page.
  Plays once per session (sessionStorage flag).
*/

export default function IntroAnimation({ onDone }) {
  const canvasRef = useRef(null);
  const [phase, setPhase]     = useState("filling");   // filling | holding | fading
  const [opacity, setOpacity] = useState(1);
  const animRef  = useRef(null);
  const fillRef  = useRef(0);   // 0 → 1

  // ── Skyline path (modern NYC silhouette with windows) ───────────────────────
  function drawSkyline(ctx, W, H, liquidY, textureColor) {
    const ground = H;
    const buildings = [
      // [x, width, height, floors_x, floors_y, floor_w, floor_h]
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

    // Scale buildings to canvas width
    const scale = W / 1280;

    buildings.forEach(b => {
      const bx = b.x * scale;
      const bw = b.w * scale;
      const bh = b.h;
      const by = ground - bh;

      // Building body
      ctx.fillStyle = "rgba(12,5,2,0.92)";
      ctx.fillRect(bx, by, bw, bh);

      // Spire
      if (b.hasSpire) {
        ctx.beginPath();
        ctx.moveTo(bx + bw / 2 - 4 * scale, by);
        ctx.lineTo(bx + bw / 2, by - b.spireH);
        ctx.lineTo(bx + bw / 2 + 4 * scale, by);
        ctx.closePath();
        ctx.fill();
      }

      // Windows — only draw where building is above the liquid
      const winW = Math.max(4, 5 * scale);
      const winH = 6;
      const winGapX = Math.max(6, 8 * scale);
      const winGapY = 12;
      const cols = Math.floor((bw - winGapX) / (winW + winGapX));
      const rows = Math.floor((bh - winGapY) / (winH + winGapY));

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const wx = bx + winGapX + c * (winW + winGapX);
          const wy = by + winGapY + r * (winH + winGapY);
          if (wy + winH < liquidY) {
            // Window above liquid: lit up
            const lit = Math.random() > 0.35;
            ctx.fillStyle = lit
              ? `rgba(255,220,130,${0.5 + Math.random() * 0.4})`
              : "rgba(30,15,5,0.6)";
          } else {
            // Window below liquid: dark / silhouette
            ctx.fillStyle = textureColor;
          }
          ctx.fillRect(wx, wy, winW, winH);
        }
      }
    });
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");
    let start    = null;
    const FILL_DURATION  = 3200;  // ms to fill from bottom to top
    const HOLD_DURATION  = 700;   // ms to hold full
    const FADE_DURATION  = 900;   // ms to fade out

    function resize() {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    // Wave state
    let wave1 = 0, wave2 = 0;

    function drawFrame(ts) {
      if (!start) start = ts;
      const elapsed = ts - start;
      const W = canvas.width;
      const H = canvas.height;

      // Fill progress 0→1 (ease-in-out)
      const raw = Math.min(elapsed / FILL_DURATION, 1);
      const t   = raw < 0.5 ? 2 * raw * raw : -1 + (4 - 2 * raw) * raw;
      fillRef.current = t;

      const liquidY = H - t * H;  // top of liquid (starts at H, moves to 0)

      wave1 += 0.018;
      wave2 += 0.012;

      ctx.clearRect(0, 0, W, H);

      // Sky gradient above liquid
      const grad = ctx.createLinearGradient(0, 0, 0, liquidY);
      grad.addColorStop(0,   "#0a0402");
      grad.addColorStop(0.5, "#1a0a04");
      grad.addColorStop(1,   "#2C1A0E");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, liquidY);

      // Draw skyline (above liquid portion shows lit windows)
      ctx.save();
      drawSkyline(ctx, W, H, liquidY, "rgba(30,10,2,0.5)");
      ctx.restore();

      // Liquid body
      const liquidGrad = ctx.createLinearGradient(0, liquidY, 0, H);
      liquidGrad.addColorStop(0,   "#3D1F0A");
      liquidGrad.addColorStop(0.3, "#2C1005");
      liquidGrad.addColorStop(1,   "#180A02");
      ctx.fillStyle = liquidGrad;
      ctx.fillRect(0, liquidY + 18, W, H - liquidY);

      // Wave surface
      ctx.beginPath();
      ctx.moveTo(0, liquidY + 18);
      for (let x = 0; x <= W; x += 4) {
        const y = liquidY
          + Math.sin(x * 0.018 + wave1) * 6
          + Math.sin(x * 0.03  + wave2) * 3.5
          + 10;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H);
      ctx.lineTo(0, H);
      ctx.closePath();
      ctx.fillStyle = "#2C1005";
      ctx.fill();

      // Foam highlight on wave crest
      ctx.beginPath();
      for (let x = 0; x <= W; x += 4) {
        const y = liquidY
          + Math.sin(x * 0.018 + wave1) * 6
          + Math.sin(x * 0.03  + wave2) * 3.5
          + 8;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "rgba(200,140,80,0.25)";
      ctx.lineWidth   = 2.5;
      ctx.stroke();

      // Title — fades in after 40% fill
      if (t > 0.4) {
        const titleAlpha = Math.min((t - 0.4) / 0.3, 1);
        const titleY     = liquidY - 80;

        ctx.save();
        ctx.globalAlpha = titleAlpha;
        ctx.textAlign   = "center";

        // "WORK & BREW"
        ctx.font        = `800 clamp(2.5rem,6vw,4rem)/1 'Yeseva One', Georgia, serif`;
        ctx.font        = `${Math.round(W * 0.055)}px 'Yeseva One', Georgia, serif`;
        ctx.fillStyle   = "#E0D9CF";
        ctx.shadowColor = "rgba(0,0,0,0.6)";
        ctx.shadowBlur  = 18;
        ctx.fillText("Work & Brew", W / 2, Math.max(titleY, 80));

        // Tagline
        if (t > 0.65) {
          const tagAlpha = Math.min((t - 0.65) / 0.2, 1);
          ctx.globalAlpha = titleAlpha * tagAlpha;
          ctx.font        = `${Math.round(W * 0.016)}px Inter, sans-serif`;
          ctx.letterSpacing = "0.15em";
          ctx.fillStyle   = "rgba(224,217,207,0.6)";
          ctx.shadowBlur  = 6;
          ctx.fillText("NEW YORK CITY · EST. MARCH 2025", W / 2, Math.max(titleY + Math.round(W * 0.055) + 18, 120));
        }
        ctx.restore();
      }

      if (raw < 1) {
        animRef.current = requestAnimationFrame(drawFrame);
      } else {
        // Hold then fade
        setTimeout(() => setPhase("fading"), HOLD_DURATION);
      }
    }

    animRef.current = requestAnimationFrame(drawFrame);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  // Fade-out phase
  useEffect(() => {
    if (phase !== "fading") return;
    const STEPS = 30;
    let step = 0;
    const iv = setInterval(() => {
      step++;
      setOpacity(1 - step / STEPS);
      if (step >= STEPS) {
        clearInterval(iv);
        onDone?.();
      }
    }, 900 / STEPS);
    return () => clearInterval(iv);
  }, [phase, onDone]);

  return (
    <div style={{
      position:  "fixed",
      inset:     0,
      zIndex:    9999,
      opacity,
      transition: phase === "fading" ? "opacity 0.9s ease" : "none",
      pointerEvents: phase === "fading" ? "none" : "all",
    }}>
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
    </div>
  );
}
