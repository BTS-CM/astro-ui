import React, {
  type HTMLProps,
  memo,
  useMemo,
  useState,
  useEffect,
  useId,
} from "react";
import { useThrottle } from "@react-hook/throttle";

import { getContrast, hashCode, RNG } from "../lib/utilities";

const SIZE = 36;

const DEFAULT_COLORS = ["#92A1C6", "#146A7C", "#F0AB3D", "#C271B4", "#C20D90"];

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

function generateData(
  name?: string,
  colors = DEFAULT_COLORS,
  expression: ExpressionProps = {}
): AvatarData {
  let numFromName = hashCode(name ?? crypto.randomUUID());
  const rng = new RNG(numFromName);
  const wrapperColor = rng?.nextChoice(colors) ?? colors[0];

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

export const Avatar = ({
  name,
  extra,
  colors,
  size,
  title,
  square,
  expression,
  ...props
}: AvatarProps & Omit<HTMLProps<SVGSVGElement>, keyof AvatarProps>) => {
  const data = useMemo(
    () => generateData(name, colors, expression),
    [name, colors, expression]
  );
  const maskID = useId();

  const [mousePosition, setMousePosition] = useThrottle(
    {
      mouseX: null,
      mouseY: null,
    },
    30
  );

  const handleMouseMove = (event: MouseEvent) => {
    setMousePosition({ mouseX: event.clientX, mouseY: event.clientY });
  };

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const [direction, setDirection] = useState();
  const [angle, setAngle] = useState(0);
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    function calculate() {
      const avatar = document.querySelector(
        `#avatar${extra}_${name.replace(".", "")}`
      ) as HTMLElement;

      const { left, top, width, height } = avatar.getBoundingClientRect();
      const centerX = left + width / 2;
      const centerY = top + height / 2;

      let _angle =
        (Math.atan2(
          mousePosition.mouseY - centerY,
          mousePosition.mouseX - centerX
        ) *
          180) /
          Math.PI +
        90;

      if (!_angle) {
        _angle = 0;
      }

      if (_angle < 0) {
        _angle = 360 + _angle;
      }

      if (_angle === 0) {
        _angle = 1;
      }

      _angle = parseInt(_angle.toFixed(0));

      const _distance = Math.sqrt(
        Math.pow(mousePosition.mouseX - centerX, 2) +
          Math.pow(mousePosition.mouseY - centerY, 2)
      );

      setDirection(mousePosition.mouseX <= left ? "left" : "right");
      setDistance(_distance);
      setAngle(_angle);
    }

    calculate();
  }, [mousePosition]);

  const [adjustedDegrees, setAdjustedDegrees] = useState(1);
  useEffect(() => {
    if (!angle) {
      setAdjustedDegrees(15);
    } else if (angle >= 0 && angle <= 15) {
      setAdjustedDegrees(15);
    } else if (angle > 20 && angle <= 95) {
      setAdjustedDegrees(angle);
    } else if (angle > 95 && angle <= 180) {
      setAdjustedDegrees(95);
    } else if (angle > 180 && angle <= 275) {
      setAdjustedDegrees(275);
    } else if (angle > 275 && angle < 345) {
      setAdjustedDegrees(angle);
    } else if (angle >= 345 && angle <= 360) {
      setAdjustedDegrees(345);
    }
  }, [direction, distance, angle]);

  const [isIdle, setIsIdle] = useState(false);
  const [activeMouth, setActiveMouth] = useState(data.mouthType);
  const [activeEyes, setActiveEyes] = useState(data.eyeType);
  useEffect(() => {
    const interval = setInterval(() => {
      if (isIdle) {
        setActiveEyes("sleepy");
        setActiveMouth("surprise");
        return;
      }
      // blink every 4 seconds
      setActiveEyes(data.eyeType !== "sleepy" ? "sleepy" : "normal"); //blink
      // wait 333ms
      setTimeout(() => {
        setActiveEyes(data.eyeType); //open
      }, Math.max(100, Math.random() * 500));
    }, Math.max(3000, Math.random() * 10000));
    return () => clearInterval(interval);
  }, [isIdle]);

  const [timeoutTimer, setTimeoutTimer] = useState();
  useEffect(() => {
    function handleIdle() {
      //console.log("User has gone idle");
      setIsIdle(true);
    }

    function handleMouseMove() {
      if (timeoutTimer) {
        clearTimeout(timeoutTimer);
      }
      if (isIdle) {
        //console.log("No longer idle");
        setIsIdle(false);
        setActiveEyes(data.eyeType);
        setActiveMouth(data.mouthType);
      }
      setTimeoutTimer(setTimeout(handleIdle, 30000));
    }

    if (mousePosition.mouseX && mousePosition.mouseY) {
      handleMouseMove();
    }

    return () => {
      if (timeoutTimer) {
        clearTimeout(timeoutTimer);
      }
    };
  }, [mousePosition]);

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      fill="none"
      role="img"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      {...props}
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
          id={`avatar${extra}_${name.replace(".", "")}`}
          transform={`rotate(${
            direction === "left" ? adjustedDegrees + 65 : adjustedDegrees - 65
          }, ${SIZE / 2} ${SIZE / 2})`}
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

Avatar.displayName = "Avatar";

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
