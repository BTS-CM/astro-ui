"use client";

import * as React from "react";
import { cn } from "cn";
import { Slider as SliderPrimitive } from "radix-ui";

// Theme variants ported from the legacy ui set so existing callers
// (e.g. ConfigureVisuals with variant="violet"|"cyan"|...) keep their
// per-setting accent colors. Names map to theme roles (--accent-*),
// not fixed hues, so sliders follow the active theme.
// `default` intentionally keeps the stock new-shadcn styling.
const SLIDER_VARIANTS = {
  default: {
    track: "",
    range: "",
    thumb: "",
  },
  accent: {
    track: "bg-[hsl(var(--accent-1)/0.20)]",
    range: "bg-[hsl(var(--accent-1))]",
    thumb:
      "border-[hsl(var(--accent-1)/0.50)] bg-[hsl(var(--accent-1))] shadow-[color:hsl(var(--accent-1)/0.30)]",
  },
  violet: {
    track: "bg-[hsl(var(--accent-1)/0.20)]",
    range: "bg-[hsl(var(--accent-1))]",
    thumb:
      "border-[hsl(var(--accent-1)/0.50)] bg-[hsl(var(--accent-1))] shadow-[hsl(var(--accent-1)/0.30)]",
  },
  cyan: {
    track: "bg-[hsl(var(--accent-2)/0.20)]",
    range: "bg-[hsl(var(--accent-2))]",
    thumb:
      "border-[hsl(var(--accent-2)/0.50)] bg-[hsl(var(--accent-2))] shadow-[hsl(var(--accent-2)/0.30)]",
  },
  emerald: {
    track: "bg-[hsl(var(--accent-success)/0.20)]",
    range: "bg-[hsl(var(--accent-success))]",
    thumb:
      "border-[hsl(var(--accent-success)/0.50)] bg-[hsl(var(--accent-success))] shadow-[hsl(var(--accent-success)/0.30)]",
  },
  amber: {
    track: "bg-[hsl(var(--accent-warning)/0.20)]",
    range: "bg-[hsl(var(--accent-warning))]",
    thumb:
      "border-[hsl(var(--accent-warning)/0.50)] bg-[hsl(var(--accent-warning))] shadow-[hsl(var(--accent-warning)/0.30)]",
  },
  rose: {
    track: "bg-[hsl(var(--accent-danger)/0.20)]",
    range: "bg-[hsl(var(--accent-danger))]",
    thumb:
      "border-[hsl(var(--accent-danger)/0.50)] bg-[hsl(var(--accent-danger))] shadow-[hsl(var(--accent-danger)/0.30)]",
  },
};

function Slider({
  className,
  variant = "default",
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}) {
  const v = SLIDER_VARIANTS[variant] || SLIDER_VARIANTS.default;
  const _values = React.useMemo(() => Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [min, max], [value, defaultValue, min, max]);
  return <SliderPrimitive.Root data-slot="slider" defaultValue={defaultValue} value={value} min={min} max={max} className={cn("relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col", className)} {...props}>
      <SliderPrimitive.Track data-slot="slider-track" className={cn("relative grow overflow-hidden rounded-full bg-muted data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5", v.track)}>
        <SliderPrimitive.Range data-slot="slider-range" className={cn("absolute bg-primary data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full", v.range)} />
      </SliderPrimitive.Track>
      {Array.from({
      length: _values.length
    }, (_, index) => <SliderPrimitive.Thumb data-slot="slider-thumb" key={index} className={cn("block size-4 shrink-0 rounded-full border border-primary bg-white shadow-sm ring-ring/50 transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50", v.thumb)} />)}
    </SliderPrimitive.Root>;
}
export { Slider };
