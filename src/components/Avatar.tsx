import React, {
  type HTMLProps,
  memo,
  useMemo,
  useRef,
  useState,
  useEffect,
  useId,
  useSyncExternalStore,
} from "react";

import { getContrast, hashCode, RNG } from "@/lib/utilities";

const SIZE = 36;

// Intentionally static (theming carve-out): identicon identity colours. The
// same account must render the same avatar in every theme and mode, or users
// lose visual recognition. Do NOT derive these from the active theme.
const DEFAULT_COLORS = ["#92A1C6", "#146A7C", "#F0AB3D", "#C271B4", "#C20D90"];

// Shared per-page mouse + idle tracker (1 window listener for all avatars).
// Previously every Avatar added its own mousemove listener, throttle state,
// blink setInterval + inner setTimeout, and 30s idle setTimeout — O(N) timers
// that re-rendered every instance on each mouse move. Now a single passive
// listener feeds all instances; blink is pure CSS (see globals.css).
type SharedMouse = { x: number | null; y: number | null };

let sharedMouse: SharedMouse = { x: null, y: null };
let sharedIdle = false;
const mouseSubscribers = new Set<() => void>();
const idleSubscribers = new Set<() => void>();
let trackerInitialised = false;
let lastMouseEmit = 0;
let idleTimer: ReturnType<typeof setTimeout> | null = null;

function notifySet(subs: Set<() => void>) {
  subs.forEach((cb) => {
    try {
      cb();
    } catch {
      // ignore subscriber errors
    }
  });
}

function resetSharedIdleTimer() {
  if (typeof window === "undefined") return;
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    sharedIdle = true;
    notifySet(idleSubscribers);
  }, 30000);
}

function ensureSharedTracker() {
  if (trackerInitialised || typeof window === "undefined") return;
  trackerInitialised = true;
  resetSharedIdleTimer();
  window.addEventListener(
    "mousemove",
    (event: MouseEvent) => {
      // ~30ms throttle (matches previous useThrottle) without per-instance state
      const now = performance.now();
      if (now - lastMouseEmit < 30) return;
      lastMouseEmit = now;
      sharedMouse = { x: event.clientX, y: event.clientY };
      notifySet(mouseSubscribers);
      // Any mouse activity clears idle (previously per-avatar timeout churn)
      if (sharedIdle) {
        sharedIdle = false;
        notifySet(idleSubscribers);
      }
      resetSharedIdleTimer();
    },
    { passive: true }
  );
}

function subscribeMouse(cb: () => void) {
  ensureSharedTracker();
  mouseSubscribers.add(cb);
  return () => {
    mouseSubscribers.delete(cb);
  };
}

function subscribeIdle(cb: () => void) {
  ensureSharedTracker();
  idleSubscribers.add(cb);
  return () => {
    idleSubscribers.delete(cb);
  };
}

const getSharedMouseSnapshot = () => sharedMouse;
const SERVER_MOUSE_SNAPSHOT: SharedMouse = { x: null, y: null };
const getSharedMouseServerSnapshot = () => SERVER_MOUSE_SNAPSHOT;
const getSharedIdleSnapshot = () => sharedIdle;
const getSharedIdleServerSnapshot = () => false;

function useSharedMousePosition(): SharedMouse {
  return useSyncExternalStore(
    subscribeMouse,
    getSharedMouseSnapshot,
    getSharedMouseServerSnapshot
  );
}

function useSharedIdle(): boolean {
  return useSyncExternalStore(
    subscribeIdle,
    getSharedIdleSnapshot,
    getSharedIdleServerSnapshot
  );
}

const eyesRendererFactory = (
  renderer: React.FC<EyeProps>,
  renderer2?: React.FC<EyeProps>
): EyesRenderer => ({
  rightEye: renderer,
  leftEye: renderer2 ?? renderer,
});

const eyeTypes = {
  normal: eyesRendererFactory((props: EyeProps) => (
    <rect
      x={props.x + props.eyeSpread}
      y={props.y}
      width={props.eyeSize}
      height={2}
      rx={1}
      fill={props.eyeColor}
    />
  )),
  happy: eyesRendererFactory((props: EyeProps) => (
    <path
      d={`M${props.x + props.eyeSpread - props.eyeSize},${
        props.y + props.eyeSize
      } Q${props.x + props.eyeSpread},${props.y} ${
        props.x + props.eyeSpread + props.eyeSize
      },${props.y + props.eyeSize}`}
      fill="none"
      stroke={props.eyeColor}
      strokeWidth={1}
      strokeLinecap="round"
    />
  )),
  sleepy: eyesRendererFactory((props: EyeProps) => (
    <path
      d={`M${props.x + props.eyeSpread - props.eyeSize},${props.y} Q${
        props.x + props.eyeSpread
      },${props.y + props.eyeSize} ${
        props.x + props.eyeSpread + props.eyeSize
      },${props.y}`}
      fill="none"
      stroke={props.eyeColor}
      strokeWidth={1}
      strokeLinecap="round"
    />
  )),
  mischief: eyesRendererFactory(
    (props: EyeProps) => (
      <path
        d={`M${props.x + props.eyeSpread},${props.y} l${props.eyeSize},${
          props.eyeSize
        } l-${props.eyeSize},${props.eyeSize}`}
        fill="none"
        stroke={props.eyeColor}
        strokeWidth={1}
        strokeLinecap="round"
      />
    ),
    (props: EyeProps) => (
      <path
        d={`M${props.x + props.eyeSpread},${props.y} l-${props.eyeSize},${
          props.eyeSize
        } l${props.eyeSize},${props.eyeSize}`}
        fill="none"
        stroke={props.eyeColor}
        strokeWidth={1}
        strokeLinecap="round"
      />
    )
  ),
} satisfies Record<string, EyesRenderer>;

const mouthTypes = {
  smile: (props: MouthProps) => (
    <path
      d={`M13,${19 + props.mouthSpread} a1,0.75 0 0,0 10,0`}
      fill={props.mouthColor}
    />
  ),
  open: (props: MouthProps) => (
    <path
      d={`M15 ${19 + props.mouthSpread}c2 1 4 1 6 0`}
      stroke={props.mouthColor}
      fill="none"
      strokeLinecap="round"
    />
  ),
  surprise: (props: MouthProps) => (
    <circle
      cx={20}
      cy={19 + props.mouthSpread}
      r={props.mouthSize}
      fill={props.mouthColor}
    />
  ),
  unhappy: (props: MouthProps) => (
    <path
      d={`M15 ${19 + props.mouthSpread}c2 -1 4 -1 6 0`}
      stroke={props.mouthColor}
      fill="none"
      strokeLinecap="round"
    />
  ),
};

const randomHexColor = (rng: any) => {
  let color = "#";
  for (let i = 0; i < 6; i++) {
    const random = Math.floor(rng.nextUnit(16, false));
    color += random.toString(16);
  }
  return color;
};

function generateData(
  name?: string,
  colors = DEFAULT_COLORS,
  expression: ExpressionProps = {}
): AvatarData {
  let numFromName = name ? hashCode(name) : 0;
  const rng = new RNG(numFromName);
  const wrapperColor = rng ? randomHexColor(rng) : colors[0];

  const preTranslateX = rng.nextUnit(10, true);
  const wrapperTranslateX =
    preTranslateX < 5 ? preTranslateX + SIZE / 9 : preTranslateX;
  const preTranslateY = rng.nextUnit(10, true);
  const wrapperTranslateY =
    preTranslateY < 5 ? preTranslateY + SIZE / 9 : preTranslateY;

  const eyeType =
    expression.eye ??
    (rng?.nextChoice(Object.keys(eyeTypes)) as keyof typeof eyeTypes);

  const mouthType =
    expression.mouth ??
    (rng?.nextChoice(Object.keys(mouthTypes)) as keyof typeof mouthTypes);

  return {
    // colours
    wrapperColor,
    faceColor: getContrast(wrapperColor),
    backgroundColor: rng.nextChoice(colors) ?? colors[1],
    // transforms
    wrapperTranslateX,
    wrapperTranslateY,
    wrapperRotate: rng.nextUnit(360, false),
    wrapperScale: 1 + rng.nextUnit(SIZE / 12, false) / 10,
    // features
    eyeSpread: rng.nextUnit(5, false) ?? 0,
    eyeSize: 1.5 + (rng.nextUnit(1, false) ?? 0),
    mouthSpread: rng.nextUnit(5, false) ?? 0,
    mouthSize: 1.5 + (rng.nextUnit(1, true) ?? 0),
    eyeType,
    mouthType,
  };
}

const AvatarBase = ({
  name,
  extra,
  colors,
  size = 40,
  title,
  square,
  expression,
  ...props
}: AvatarProps & Omit<HTMLProps<SVGSVGElement>, keyof AvatarProps>) => {
  const avatarSize = typeof size === "string" ? parseInt(size, 10) || 40 : size;
  const data = useMemo(
    () => generateData(name, colors, expression),
    [name, colors, expression]
  );
  const maskID = useId();
  const mouse = useSharedMousePosition();
  const isIdle = useSharedIdle();
  const faceRef = useRef<SVGGElement>(null);

  // Single batched pose state (was 4 separate states + 2 effects per
  // instance, re-rendering every avatar on every mousemove).
  const [pose, setPose] = useState<{
    direction: "left" | "right" | undefined;
    distance: number;
    adjustedDegrees: number;
  }>({ direction: undefined, distance: 0, adjustedDegrees: 15 });
  const poseRef = useRef(pose);
  poseRef.current = pose;

  useEffect(() => {
    if (mouse.x == null || mouse.y == null) return;
    const node = faceRef.current;
    if (!node) return;
    const { left, top, width, height } = node.getBoundingClientRect();
    if (!width && !height) return;
    const centerX = left + width / 2;
    const centerY = top + height / 2;

    let angle =
      (Math.atan2(mouse.y - centerY, mouse.x - centerX) * 180) / Math.PI + 90;
    if (!angle) angle = 0;
    if (angle < 0) angle = 360 + angle;
    if (angle === 0) angle = 1;
    angle = parseInt(angle.toFixed(0), 10);

    let adjustedDegrees = 15;
    if (angle > 20 && angle <= 95) adjustedDegrees = angle;
    else if (angle > 95 && angle <= 180) adjustedDegrees = 95;
    else if (angle > 180 && angle <= 275) adjustedDegrees = 275;
    else if (angle > 275 && angle < 345) adjustedDegrees = angle;
    else if (angle >= 345 && angle <= 360) adjustedDegrees = 345;
    else adjustedDegrees = 15;

    const direction = mouse.x <= left ? "left" : "right";
    const distance = Math.sqrt(
      Math.pow(mouse.x - centerX, 2) + Math.pow(mouse.y - centerY, 2)
    );

    const prev = poseRef.current;
    if (
      prev.direction === direction &&
      Math.abs(prev.distance - distance) < 2 &&
      prev.adjustedDegrees === adjustedDegrees
    ) {
      return;
    }
    setPose({ direction, distance, adjustedDegrees });
  }, [mouse.x, mouse.y]);

  const { direction, distance, adjustedDegrees } = pose;

  // Blink is now pure CSS (`.avatar-eyes` keyframes) — no per-instance
  // setInterval/setTimeout. Idle still swaps to sleepy/surprise via the
  // single shared 30s timer above.
  const activeEyes = isIdle ? "sleepy" : data.eyeType;
  const activeMouth = isIdle ? "surprise" : data.mouthType;
  const blinkDelay = useMemo(() => {
    const h = Math.abs(hashCode(name ?? "avatar"));
    return `-${h % 5000}ms`;
  }, [name]);

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      fill="none"
      role="img"
      xmlns="http://www.w3.org/2000/svg"
      className="block flex-shrink-0"
      {...props}
      width={avatarSize}
      height={avatarSize}
      style={{ width: avatarSize, height: avatarSize, ...props.style }}
    >
      {title && <title>{title}</title>}
      <mask
        id={maskID}
        maskUnits="userSpaceOnUse"
        x={0}
        y={0}
        width={SIZE}
        height={SIZE}
      >
        <rect
          width={SIZE}
          height={SIZE}
          rx={square ? undefined : SIZE * 2}
          fill="#FFFFFF"
        />
      </mask>
      <g mask={`url(#${maskID})`}>
        <rect width={SIZE} height={SIZE} fill={data.backgroundColor} />
        <rect
          x="0"
          y="0"
          width={SIZE}
          height={SIZE}
          transform={`translate(${data.wrapperTranslateX} ${
            data.wrapperTranslateY
          }) rotate(${data.wrapperRotate} ${SIZE / 2} ${SIZE / 2}) scale(${
            data.wrapperScale
          })`}
          fill={data.wrapperColor}
          rx={SIZE}
        />
        <g
          ref={faceRef}
          id={`avatar${extra}_${name ? name.replaceAll(".", "") : ""}`}
          transform={`rotate(${
            direction === "left" ? adjustedDegrees + 65 : adjustedDegrees - 65
          }, ${SIZE / 2} ${SIZE / 2})`}
        >
          <g
            className={isIdle ? undefined : "avatar-eyes"}
            style={
              isIdle
                ? undefined
                : ({ animationDelay: blinkDelay } as React.CSSProperties)
            }
          >
            {eyeTypes[activeEyes].leftEye({
              eyeSize: data.eyeSize,
              eyeSpread:
                Math.min(distance / 20, 5) * (direction === "left" ? -1 : 1),
              eyeColor: data.faceColor,
              x: 20,
              y: 14,
            })}
            {eyeTypes[activeEyes].rightEye({
              eyeSize: data.eyeSize,
              eyeSpread:
                Math.min(distance / 20, 5) * (direction === "left" ? -1 : 1),
              eyeColor: data.faceColor,
              x: 14,
              y: 14,
            })}
          </g>
          {mouthTypes[activeMouth]({
            mouthSpread: Math.min(distance / 50, 5),
            mouthSize: data.mouthSize,
            mouthColor: data.faceColor,
          })}
        </g>
      </g>
    </svg>
  );
};

const Avatar = memo(AvatarBase);
Avatar.displayName = "Avatar";

export { Avatar };

type ExpressionProps = {
  eye?: keyof typeof eyeTypes;
  mouth?: keyof typeof mouthTypes;
};

type AvatarProps = {
  name?: string;
  extra?: string;
  colors?: string[];
  size?: string | number;
  title?: string;
  square?: boolean;
  expression?: ExpressionProps;
};

type AvatarData = {
  wrapperColor: string;
  faceColor: string;
  backgroundColor: string;
  //
  wrapperTranslateX: number;
  wrapperTranslateY: number;
  wrapperRotate: number;
  wrapperScale: number;
  //
  eyeSpread: number;
  eyeSize: number;
  mouthSpread: number;
  mouthSize: number;
  eyeType: keyof typeof eyeTypes;
  mouthType: keyof typeof mouthTypes;
};

type EyeProps = {
  eyeSize: number;
  eyeSpread: number;
  eyeColor: string;
  x: number;
  y: number;
};

type MouthProps = {
  mouthSpread: number;
  mouthSize: number;
  mouthColor: string;
};

type EyesRenderer = {
  rightEye: React.FC<EyeProps>;
  leftEye: React.FC<EyeProps>;
};
