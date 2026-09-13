import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const VARIANTS = {
  default: {
    track: "bg-muted",
    range: "bg-foreground/30",
    thumb: "border-border bg-background shadow-sm",
  },
  accent: {
    track: "bg-[hsl(var(--accent-1)/0.20)]",
    range: "bg-[hsl(var(--accent-1))]",
    thumb: "border-[hsl(var(--accent-1)/0.50)] bg-[hsl(var(--accent-1))] shadow-[color:hsl(var(--accent-1)/0.30)]",
  },
  // Named variants map to theme roles (not fixed hues) so settings sliders
  // follow the active theme while keeping per-setting variety. Variant names
  // are kept stable for existing callers (e.g. ConfigureVisuals).
  violet: {
    track: "bg-[hsl(var(--accent-1)/0.20)]",
    range: "bg-[hsl(var(--accent-1))]",
    thumb: "border-[hsl(var(--accent-1)/0.50)] bg-[hsl(var(--accent-1))] shadow-[hsl(var(--accent-1)/0.30)]",
  },
  cyan: {
    track: "bg-[hsl(var(--accent-2)/0.20)]",
    range: "bg-[hsl(var(--accent-2))]",
    thumb: "border-[hsl(var(--accent-2)/0.50)] bg-[hsl(var(--accent-2))] shadow-[hsl(var(--accent-2)/0.30)]",
  },
  emerald: {
    track: "bg-[hsl(var(--accent-success)/0.20)]",
    range: "bg-[hsl(var(--accent-success))]",
    thumb: "border-[hsl(var(--accent-success)/0.50)] bg-[hsl(var(--accent-success))] shadow-[hsl(var(--accent-success)/0.30)]",
  },
  amber: {
    track: "bg-[hsl(var(--accent-warning)/0.20)]",
    range: "bg-[hsl(var(--accent-warning))]",
    thumb: "border-[hsl(var(--accent-warning)/0.50)] bg-[hsl(var(--accent-warning))] shadow-[hsl(var(--accent-warning)/0.30)]",
  },
  rose: {
    track: "bg-[hsl(var(--accent-danger)/0.20)]",
    range: "bg-[hsl(var(--accent-danger))]",
    thumb: "border-[hsl(var(--accent-danger)/0.50)] bg-[hsl(var(--accent-danger))] shadow-[hsl(var(--accent-danger)/0.30)]",
  },
};

const Slider = React.forwardRef(({ className, variant = "default", ...props }, ref) => {
  const v = VARIANTS[variant] || VARIANTS.default;
  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn("relative flex w-full touch-none select-none items-center", className)}
      {...props}>
      <SliderPrimitive.Track
        className={cn("relative h-1.5 w-full grow overflow-hidden rounded-full", v.track)}>
        <SliderPrimitive.Range className={cn("absolute h-full rounded-full", v.range)} />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        className={cn("block h-4 w-4 rounded-full border shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50", v.thumb)} />
    </SliderPrimitive.Root>
  )
})
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
