import React, { useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Line, Html } from "@react-three/drei";
import { useTheme } from "next-themes";
import { useStore } from "@nanostores/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  $customTheme,
  $currentPage,
  getThemeForPage,
  resolveStatus,
} from "@/stores/customTheme.ts";

const CUBE = 1023;
const CENTER = CUBE / 2;

const GROUP_COLORS = {
  main: "#22d3ee",
  splinter: "#a78bfa",
  ray: "#f472b6",
};

const GROUP_LABELS = {
  main: "Main shot",
  splinter: "Splinter",
  ray: "Ray",
};

// Adapt the 3-D scene to the active light/dark theme so the geometry stays
// legible instead of being a faint hint on a hard-coded dark canvas.
function useThemePalette() {
  const { resolvedTheme } = useTheme();
  // Re-render on theme switches so the hover marker below stays current.
  useStore($customTheme);
  const currentPage = useStore($currentPage);
  const isDark = resolvedTheme !== "light";
  // Hover marker follows the theme's warning role (amber in every preset,
  // customisable); the resting marker keeps its per-mode legibility choices.
  let warnHex = "#fbbf24";
  try {
    warnHex =
      resolveStatus(getThemeForPage(currentPage || "airdrop_calculate"), "warning") || warnHex;
  } catch {
    /* keep fallback */
  }
  return {
    isDark,
    bg: isDark ? "#0b1120" : "#eef2f7",
    wire: isDark ? "#64748b" : "#475569",
    wireOpacity: 0.9,
    axis: isDark ? "#cbd5e1" : "#1e293b",
    labelBg: isDark ? "rgba(2,6,23,0.85)" : "rgba(255,255,255,0.9)",
    labelText: isDark ? "#e2e8f0" : "#0f172a",
    marker: isDark ? "#fde047" : "#d97706",
    markerHover: warnHex,
  };
}

function CubeWireframe({ palette }) {
  const edges = useMemo(() => {
    const c = [
      [0, 0, 0],
      [CUBE, 0, 0],
      [CUBE, CUBE, 0],
      [0, CUBE, 0],
      [0, 0, CUBE],
      [CUBE, 0, CUBE],
      [CUBE, CUBE, CUBE],
      [0, CUBE, CUBE],
    ];
    const pairs = [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7],
    ];
    return pairs.map(([a, b]) => [c[a], c[b]]);
  }, []);
  return (
    <group>
      {edges.map((e, i) => (
        <Line
          key={i}
          points={e}
          color={palette.wire}
          lineWidth={1.5}
          transparent
          opacity={palette.wireOpacity}
        />
      ))}
    </group>
  );
}

function AxisLabels({ palette }) {
  const labelStyle = {
    background: palette.labelBg,
    color: palette.labelText,
    padding: "1px 5px",
    borderRadius: 4,
    fontSize: 11,
    fontFamily: "monospace",
    whiteSpace: "nowrap",
    pointerEvents: "none",
  };
  return (
    <group>
      <Html position={[CUBE + 40, 0, 0]} style={{ pointerEvents: "none" }}>
        <div style={labelStyle}>X →</div>
      </Html>
      <Html position={[0, CUBE + 40, 0]} style={{ pointerEvents: "none" }}>
        <div style={labelStyle}>Y ↑</div>
      </Html>
      <Html position={[0, 0, CUBE + 40]} style={{ pointerEvents: "none" }}>
        <div style={labelStyle}>Z ↗</div>
      </Html>
      <Html position={[0, 0, 0]} style={{ pointerEvents: "none" }}>
        <div style={labelStyle}>(0,0,0)</div>
      </Html>
      <Html position={[CUBE, CUBE, CUBE]} style={{ pointerEvents: "none" }}>
        <div style={labelStyle}>(1023,1023,1023)</div>
      </Html>
    </group>
  );
}

function HitMarker({ coord, ticket, palette }) {
  const [hovered, setHovered] = React.useState(false);
  const r = hovered ? 30 : 22;
  const markerColor = hovered ? palette.markerHover : palette.marker;
  return (
    <group position={coord}>
      <mesh
        onPointerEnter={(e) => { e.stopPropagation(); setHovered(true); }}
        onPointerLeave={() => setHovered(false)}
      >
        <sphereGeometry args={[r, 20, 20]} />
        <meshBasicMaterial color={markerColor} />
      </mesh>
      <Html center distanceFactor={900} style={{ pointerEvents: "none" }}>
        {/* Tooltip chip keeps a constant near-black fill in both modes, so the
            text uses the raw warning role (amber-on-black reads ~7:1) rather
            than -fg, which is marched for light page backgrounds. */}
        <div className="whitespace-nowrap rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-mono text-[hsl(var(--accent-warning))] shadow">
          #{ticket}
          <br />
          ({coord[0]}, {coord[1]}, {coord[2]})
        </div>
      </Html>
    </group>
  );
}

function Scene({ geometry, currentHit, palette }) {
  const segments = geometry?.segments || [];
  const points = geometry?.points || [];
  const isSpiral = geometry?.type === "spiral";

  const presentGroups = useMemo(() => {
    const order = ["main", "splinter", "ray"];
    const seen = new Set();
    for (const seg of segments) if (seg.group) seen.add(seg.group);
    return order.filter((g) => seen.has(g));
  }, [segments]);

  const pointsGeometry = useMemo(() => {
    if (!points.length) return null;
    const arr = new Float32Array(points.length * 3);
    for (let i = 0; i < points.length; i++) {
      arr[i * 3] = points[i][0];
      arr[i * 3 + 1] = points[i][1];
      arr[i * 3 + 2] = points[i][2];
    }
    return arr;
  }, [points]);

  return (
    <>
      <color attach="background" args={[palette.bg]} />
      <ambientLight intensity={0.8} />
      <CubeWireframe palette={palette} />
      <AxisLabels palette={palette} />

      {segments.map((seg, i) => (
        <Line
          key={`seg-${i}`}
          points={[seg.a, seg.b]}
          color={GROUP_COLORS[seg.group] || "#22d3ee"}
          lineWidth={2}
          transparent
          opacity={0.85}
        />
      ))}

      {isSpiral && points.length > 1 && (
        <Line points={points} color="#38bdf8" lineWidth={2} transparent opacity={0.85} />
      )}

      {pointsGeometry && !isSpiral && (
        <points>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              array={pointsGeometry}
              count={pointsGeometry.length / 3}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial size={5} color="#38bdf8" sizeAttenuation transparent opacity={0.85} />
        </points>
      )}

      {currentHit && (
        <HitMarker coord={currentHit.coords} ticket={currentHit.ticket} palette={palette} />
      )}

      <OrbitControls target={[CENTER, CENTER, CENTER]} enablePan={false} />
    </>
  );
}

/**
 * 3-D visualisation of an algorithm's geometry with the winner's hit(s)
 * highlighted.  Uses react-three-fiber + three.js.  Drag to rotate, scroll to
 * zoom.  The scene adapts to the active light/dark theme.
 *
 * @param {object} props
 * @param {object|null} props.geometry  Descriptor from `getGeometry`.
 * @param {Array<{ticket:number, coords:[number,number,number]}>} props.hits
 *   The winner's decoded hit coordinates for this algorithm.
 */
export default function AlgoGeometryView({ geometry, hits }) {
  const palette = useThemePalette();
  const safeHits = hits || [];
  const [hitIndex, setHitIndex] = useState(0);

  // Clamp index if hits change (e.g. algo switch)
  const clampedIndex = Math.min(hitIndex, Math.max(0, safeHits.length - 1));
  const currentHit = safeHits[clampedIndex] || null;

  if (!geometry) {
    return (
      <div className="flex h-[360px] items-center justify-center text-xs text-muted-foreground">
        No geometry available.
      </div>
    );
  }

  const segments = geometry?.segments || [];
  const presentGroups = useMemo(() => {
    const order = ["main", "splinter", "ray"];
    const seen = new Set();
    for (const seg of segments) if (seg.group) seen.add(seg.group);
    return order.filter((g) => seen.has(g));
  }, [segments]);

  return (
    <div className="relative h-[360px] w-full overflow-hidden rounded-lg border border-border/60">
      <Canvas
        camera={{ position: [CUBE * 1.6, CUBE * 1.2, CUBE * 1.6], fov: 50, near: 1, far: 8000 }}
      >
        <Scene geometry={geometry} currentHit={currentHit} palette={palette} />
      </Canvas>

      {presentGroups.length > 0 && (
        <div className="pointer-events-none absolute left-2 top-2 rounded-md border border-border/60 bg-card/80 px-2 py-1.5 text-[10px] backdrop-blur">
          <div className="mb-1 font-semibold text-foreground/80">Legend</div>
          {presentGroups.map((g) => (
            <div key={g} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-3 rounded-sm"
                style={{ background: GROUP_COLORS[g] }}
              />
              <span className="text-muted-foreground">{GROUP_LABELS[g]}</span>
            </div>
          ))}
        </div>
      )}

      {safeHits.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-md border border-border/60 bg-card/80 px-2 py-1 text-[11px] font-medium text-foreground/80 backdrop-blur">
          <button
            type="button"
            disabled={clampedIndex === 0}
            onClick={() => setHitIndex((i) => Math.max(0, i - 1))}
            className="rounded p-0.5 hover:bg-accent/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-[52px] text-center tabular-nums">
            {clampedIndex + 1} / {safeHits.length}
          </span>
          <button
            type="button"
            disabled={clampedIndex >= safeHits.length - 1}
            onClick={() => setHitIndex((i) => Math.min(safeHits.length - 1, i + 1))}
            className="rounded p-0.5 hover:bg-accent/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="pointer-events-none absolute bottom-2 right-2 rounded-md border border-border/60 bg-card/80 px-2 py-1 text-[10px] text-muted-foreground backdrop-blur">
        Drag to rotate · scroll to zoom
      </div>
    </div>
  );
}
