import React from "react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance } from "@/lib/i18n";

const STEP_COLORS = {
  1: { icon: "bg-[hsl(var(--accent-1)/0.15)] text-[hsl(var(--accent-1-fg))] ring-[hsl(var(--accent-1)/0.3)]", badge: "bg-[hsl(var(--accent-1)/0.15)] text-[hsl(var(--accent-1-fg))]", border: "border-[hsl(var(--accent-1)/0.2)]" },
  2: { icon: "bg-[hsl(var(--accent-3)/0.15)] text-[hsl(var(--accent-3-fg))] ring-[hsl(var(--accent-3)/0.3)]", badge: "bg-[hsl(var(--accent-3)/0.15)] text-[hsl(var(--accent-3-fg))]", border: "border-[hsl(var(--accent-3)/0.2)]" },
  3: { icon: "bg-[hsl(var(--accent-warning)/0.15)] text-[hsl(var(--accent-warning-fg))] ring-[hsl(var(--accent-warning)/0.3)]", badge: "bg-[hsl(var(--accent-warning)/0.15)] text-[hsl(var(--accent-warning-fg))]", border: "border-[hsl(var(--accent-warning)/0.2)]" },
  4: { icon: "bg-[hsl(var(--accent-success)/0.15)] text-[hsl(var(--accent-success-fg))] ring-[hsl(var(--accent-success)/0.3)]", badge: "bg-[hsl(var(--accent-success)/0.15)] text-[hsl(var(--accent-success-fg))]", border: "border-[hsl(var(--accent-success)/0.2)]" },
  5: { icon: "bg-[hsl(var(--accent-danger)/0.15)] text-[hsl(var(--accent-danger-fg))] ring-[hsl(var(--accent-danger)/0.3)]", badge: "bg-[hsl(var(--accent-danger)/0.15)] text-[hsl(var(--accent-danger-fg))]", border: "border-[hsl(var(--accent-danger)/0.2)]" },
  6: { icon: "bg-[hsl(var(--accent-2)/0.15)] text-[hsl(var(--accent-2-fg))] ring-[hsl(var(--accent-2)/0.3)]", badge: "bg-[hsl(var(--accent-2)/0.15)] text-[hsl(var(--accent-2-fg))]", border: "border-[hsl(var(--accent-2)/0.2)]" },
};

export default function SectionHeader({ icon: Icon, title, description, step, optional, recommended, right }) {
  const { t } = useTranslation("AssetCommon", { i18n: i18nInstance });
  const colors = STEP_COLORS[step] || STEP_COLORS[1];
  return (
    <div className="flex items-start gap-4 border-b border-border px-6 sm:px-8 py-5">
      <div className={"flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 " + colors.icon}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {step && (
            <span className={"inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider " + colors.badge}>
              {t("AssetCommon:sectionHeader.stepBadge", { number: step })}
              {recommended ? ` ${t("AssetCommon:sectionHeader.recommended")}` : ""}
              {optional ? ` ${t("AssetCommon:sectionHeader.optional")}` : ""}
            </span>
          )}
        </div>
        <h3 className="mt-0.5 text-base font-semibold leading-tight text-foreground">
          {title}
        </h3>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {right && (
        <div className="shrink-0 ml-auto">{right}</div>
      )}
    </div>
  );
}
