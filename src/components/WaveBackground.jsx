import React, { useMemo } from "react";
import { useStore } from "@nanostores/react";
import { $waveSettings } from "@/stores/visuals.ts";

const VIEWBOX_WIDTH = 2000;
const VIEWBOX_HEIGHT = 600;
const SEGMENTS = 32;
const KEYFRAME_COUNT = 8;
const PHASE_STEP = (2 * Math.PI) / KEYFRAME_COUNT;

// Intentionally static (theming carve-out): these are user-selected visual
// settings (rainbow/ocean/sunset/mono/custom), independent of the colour theme.
// A wave palette must not shift when the user switches themes.
// Exported so ConfigureVisuals can render faithful palette preview swatches.
export const PRESET_PALETTES = {
  rainbow: [
    ["#4f46e5", "#06b6d4"],
    ["#06b6d4", "#38bdf8"],
    ["#a855f7", "#ec4899"],
    ["#22d3ee", "#34d399"],
    ["#60a5fa", "#06b6d4"],
  ],
  ocean: [
    ["#0c4a6e", "#0369a1"],
    ["#0e7490", "#06b6d4"],
    ["#155e75", "#0891b2"],
    ["#164e63", "#0e7490"],
    ["#083344", "#075985"],
  ],
  sunset: [
    ["#7c2d12", "#ea580c"],
    ["#9a3412", "#f97316"],
    ["#c2410c", "#fb923c"],
    ["#dc2626", "#f59e0b"],
    ["#b91c1c", "#fbbf24"],
  ],
  mono: [
    ["#374151", "#6b7280"],
    ["#4b5563", "#9ca3af"],
    ["#1f2937", "#4b5563"],
    ["#6b7280", "#d1d5db"],
    ["#374151", "#9ca3af"],
  ],
};

function hexToRgb(hex) {
  const m = hex.replace("#", "");
  const v =
    m.length === 3
      ? m.split("").map((c) => c + c).join("")
      : m;
  const n = parseInt(v, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r, g, b) {
  const c = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

function interpolateColor(c1, c2, t) {
  const a = hexToRgb(c1);
  const b = hexToRgb(c2);
  return rgbToHex(
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  );
}

function getActiveColors(palette, customColor1, customColor2) {
  if (palette === "custom") {
    return [
      [customColor1, customColor2],
      [interpolateColor(customColor1, customColor2, 0.33), interpolateColor(customColor1, customColor2, 0.66)],
      [interpolateColor(customColor1, customColor2, 0.5), interpolateColor(customColor1, customColor2, 0.5)],
      [interpolateColor(customColor1, customColor2, 0.66), interpolateColor(customColor1, customColor2, 0.33)],
      [customColor2, customColor1],
    ];
  }
  return PRESET_PALETTES[palette] || PRESET_PALETTES.rainbow;
}

function sinePath(baselineY, amplitude, period, phase) {
  const stepX = VIEWBOX_WIDTH / SEGMENTS;
  const k = (2 * Math.PI) / period;

  const points = [];
  for (let i = 0; i <= SEGMENTS; i++) {
    const x = i * stepX;
    const y = baselineY + amplitude * Math.sin(k * x + phase);
    const slope = amplitude * k * Math.cos(k * x + phase);
    points.push({ x, y, slope });
  }

  let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const dx = p1.x - p0.x;
    const handleLen = dx / 3;
    const c1x = p0.x + handleLen;
    const c1y = p0.y + p0.slope * handleLen;
    const c2x = p1.x - handleLen;
    const c2y = p1.y - p1.slope * handleLen;
    path += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
  }
  return path;
}

function buildWaves(waveCount, waveSpeed, waveThickness) {
  const waves = [];
  for (let i = 0; i < waveCount; i++) {
    const baselineY = ((i + 1) / (waveCount + 1)) * VIEWBOX_HEIGHT;
    const amplitude = 22 + ((i * 7) % 20);
    const period = 600 + ((i * 137) % 700);
    const phaseOffset = (i * 0.7) % (2 * Math.PI);
    const baseDuration = 6 + ((i * 1.9) % 8);
    const duration = baseDuration / waveSpeed;
    const strokeWidth = (12 + ((i * 2) % 8)) * waveThickness;
    const opacity = 0.4 + ((waveCount - i) / waveCount) * 0.4;

    const keyframes = [];
    for (let k = 0; k < KEYFRAME_COUNT; k++) {
      keyframes.push(
        sinePath(baselineY, amplitude, period, phaseOffset + k * PHASE_STEP),
      );
    }
    waves.push({ keyframes, duration, strokeWidth, opacity, index: i });
  }
  return waves;
}

const KEY_TIMES = Array.from(
  { length: KEYFRAME_COUNT + 1 },
  (_, i) => (i / KEYFRAME_COUNT).toFixed(4),
).join(";");

const PARTICLES = [
  { cx: 220, cy: 80, r: 2.2, dur: 18, range: 60 },
  { cx: 480, cy: 520, r: 1.8, dur: 22, range: 70 },
  { cx: 720, cy: 60, r: 2.5, dur: 16, range: 55 },
  { cx: 980, cy: 560, r: 2, dur: 24, range: 65 },
  { cx: 1260, cy: 90, r: 1.6, dur: 20, range: 60 },
  { cx: 1520, cy: 510, r: 2.4, dur: 19, range: 75 },
  { cx: 1780, cy: 110, r: 2, dur: 21, range: 65 },
  { cx: 330, cy: 330, r: 1.5, dur: 23, range: 55 },
  { cx: 840, cy: 310, r: 1.8, dur: 17, range: 70 },
  { cx: 1140, cy: 200, r: 2.2, dur: 25, range: 65 },
  { cx: 1640, cy: 350, r: 1.7, dur: 19, range: 60 },
  { cx: 560, cy: 450, r: 2, dur: 22, range: 65 },
];

export default function WaveBackground({ className = "", overrideSettings = null }) {
  // Derived $waveSettings atom (with custom eq): re-renders only when one
  // of the 9 wave fields changes, not on unrelated keys (e.g. ipfsGateway).
  // Mounted on every page via PageHeader, so this saves a full SVG rebuild.
  const storeSettings = useStore($waveSettings);
  const settings = overrideSettings || storeSettings;

  const {
    waveCount,
    waveSpeed,
    waveThickness,
    wavePalette,
    customColor1,
    customColor2,
    auroraIntensity,
    particlesEnabled,
    blurAmount,
  } = settings;

  const safeWaveCount = Number.isFinite(Number(waveCount))
    ? Math.max(3, Math.min(8, Math.round(Number(waveCount))))
    : 8;
  const safeWaveSpeed = Number.isFinite(Number(waveSpeed))
    ? Math.max(0.3, Math.min(2, Number(waveSpeed)))
    : 1.0;
  const safeWaveThickness = Number.isFinite(Number(waveThickness))
    ? Math.max(0.5, Math.min(2, Number(waveThickness)))
    : 1.0;
  const safeBlur = Number.isFinite(Number(blurAmount))
    ? Math.max(0, Math.min(5, Number(blurAmount)))
    : 2;
  const safeAurora = Number.isFinite(Number(auroraIntensity))
    ? Math.max(0, Math.min(2, Number(auroraIntensity)))
    : 1.0;

  const colors = useMemo(
    () => getActiveColors(wavePalette, customColor1, customColor2),
    [wavePalette, customColor1, customColor2],
  );

  const waves = useMemo(
    () => buildWaves(safeWaveCount, safeWaveSpeed, safeWaveThickness),
    [safeWaveCount, safeWaveSpeed, safeWaveThickness],
  );

  const clampedBlur = safeBlur;
  const auroraMul = safeAurora;

  return (
    <svg
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        {colors.map(([c1, c2], i) => (
          <linearGradient key={`waveGrad-${i}`} id={`waveGrad${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={c1} stopOpacity="0.95" />
            <stop offset="100%" stopColor={c2} stopOpacity="0.95" />
          </linearGradient>
        ))}

        <radialGradient id="auroraA" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35 * auroraMul} />
          <stop offset="60%" stopColor="#6366f1" stopOpacity={0.08 * auroraMul} />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="auroraB" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.3 * auroraMul} />
          <stop offset="60%" stopColor="#22d3ee" stopOpacity={0.07 * auroraMul} />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="auroraC" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ec4899" stopOpacity={0.25 * auroraMul} />
          <stop offset="60%" stopColor="#ec4899" stopOpacity={0.06 * auroraMul} />
          <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
        </radialGradient>

        <filter
          id="blur-strong"
          x="-200"
          y="-200"
          width="2400"
          height="1000"
          filterUnits="userSpaceOnUse"
        >
          <feGaussianBlur stdDeviation={clampedBlur} />
        </filter>
        <filter
          id="blur-huge"
          x="-500"
          y="-500"
          width="3000"
          height="1600"
          filterUnits="userSpaceOnUse"
        >
          <feGaussianBlur stdDeviation="60" />
        </filter>

        <linearGradient id="fadeY" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="black" />
          <stop offset="3%" stopColor="white" />
          <stop offset="97%" stopColor="white" />
          <stop offset="100%" stopColor="black" />
        </linearGradient>
        <mask id="fadeBandMask">
          <rect
            x="0"
            y="0"
            width={VIEWBOX_WIDTH}
            height={VIEWBOX_HEIGHT}
            fill="url(#fadeY)"
          />
        </mask>
      </defs>

      {auroraMul > 0 && (
        <g filter="url(#blur-huge)" className="dark:mix-blend-screen mix-blend-normal">
          <ellipse cx="400" cy="150" rx="700" ry="240" fill="url(#auroraA)">
            <animate
              attributeName="cx"
              values="400;520;400"
              dur="32s"
              repeatCount="indefinite"
            />
          </ellipse>
          <ellipse cx="1300" cy="400" rx="650" ry="220" fill="url(#auroraB)">
            <animate
              attributeName="cx"
              values="1300;1180;1300"
              dur="38s"
              repeatCount="indefinite"
            />
          </ellipse>
          <ellipse cx="1000" cy="280" rx="550" ry="190" fill="url(#auroraC)">
            <animate
              attributeName="cy"
              values="280;220;280"
              dur="30s"
              repeatCount="indefinite"
            />
          </ellipse>
        </g>
      )}

      {particlesEnabled && (
        <g className="dark:mix-blend-screen mix-blend-normal">
          {PARTICLES.map((p, i) => (
            <circle
              key={i}
              cx={p.cx}
              cy={p.cy}
              r={p.r}
              fill="#e0f2fe"
              opacity="0.5"
            >
              <animate
                attributeName="cy"
                values={`${p.cy};${p.cy - p.range};${p.cy}`}
                dur={`${p.dur}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.2;0.75;0.2"
                dur={`${p.dur}s`}
                repeatCount="indefinite"
              />
            </circle>
          ))}
        </g>
      )}

      <g
        filter="url(#blur-strong)"
        strokeLinecap="round"
        mask="url(#fadeBandMask)"
        className="dark:mix-blend-screen mix-blend-normal"
      >
        {waves.map((w) => (
          <path
            key={w.index}
            d={w.keyframes[0]}
            stroke={`url(#waveGrad${w.index % colors.length})`}
            strokeWidth={w.strokeWidth}
            fill="none"
            opacity={w.opacity}
          >
            <animate
              attributeName="d"
              values={[...w.keyframes, w.keyframes[0]].join(";")}
              keyTimes={KEY_TIMES}
              dur={`${w.duration}s`}
              calcMode="linear"
              repeatCount="indefinite"
            />
          </path>
        ))}
      </g>
    </svg>
  );
}
