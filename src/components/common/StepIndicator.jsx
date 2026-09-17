import React from "react";
import { cn } from "@/lib/utils.js";
import { readableForeground } from "@/lib/tailwindPalette.js";

/**
 * Shared step indicator previously duplicated in
 * AccountSearch.jsx and AccountSelect.jsx.
 */
export default function StepIndicator({ steps, currentStep, accentColor }) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((label, i) => {
        const done = i < currentStep;
        const active = i === currentStep;
        return (
          <div key={label} className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px]",
                done || active
                  ? "border-transparent"
                  : "border-border text-muted-foreground"
              )}
              style={
                done || active
                  ? {
                      backgroundColor: accentColor,
                      color: readableForeground(accentColor),
                    }
                  : undefined
              }
            >
              {done ? (
                <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
                  <path
                    d="M2 6.5 5 9l5-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              ) : (
                i + 1
              )}
            </span>
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        );
      })}
    </div>
  );
}
