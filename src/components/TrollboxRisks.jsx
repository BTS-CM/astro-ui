import React, { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { ShieldAlert } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  $customTheme,
  getThemeForPage,
  resolveSectionAccent,
} from "@/stores/customTheme.ts";
import { sectionAccentStyles } from "@/lib/accentStyles.js";

function RiskGroup({ title, titleStyle, children }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-4 mb-3 last:mb-0">
      <div
        className="text-xs font-medium uppercase tracking-wider mb-2"
        style={titleStyle}
      >
        {title}
      </div>
      <ul className="ml-2 list-disc [&>li]:mt-1 pl-2 text-sm">{children}</ul>
    </div>
  );
}

export default function TrollboxRisks({ page = "trollbox" }) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  useStore($customTheme);
  const { resolvedTheme } = useTheme();
  const [domIsDark, setDomIsDark] = useState(
    () =>
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark")
  );
  useEffect(() => {
    const el = document.documentElement;
    const check = () => setDomIsDark(el.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  const isDark = resolvedTheme ? resolvedTheme === "dark" : domIsDark;

  // Follow the page's selected theme (same source as the surrounding
  // trollbox/forum cards) so the card re-tints on theme switches and
  // adjusts its text/glow per light/dark mode.
  const pair = resolveSectionAccent(getThemeForPage(page), "community");
  const accent = sectionAccentStyles(pair.primary, pair.secondary, isDark);

  return (
    <div className="grid grid-cols-1 mt-4">
      <Card
        className="relative overflow-hidden rounded-xl border bg-card/60 shadow-lg"
        style={accent.border}
      >
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px" style={accent.underline} />
        <span aria-hidden="true" className="pointer-events-none absolute -top-16 -left-16 h-40 w-40 rounded-full blur-3xl" style={accent.blobA} />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-16 -right-16 h-40 w-40 rounded-full blur-3xl" style={accent.blobB} />
        <CardContent className="relative p-5">
          <CardHeader className="flex flex-row items-center gap-3 mb-4 p-0">
            <span
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0"
              style={{ ...accent.iconBg, ...accent.iconBorder, ...accent.iconText }}
            >
              <ShieldAlert className="h-4 w-4" strokeWidth={2.25} />
            </span>
            <div>
              <CardTitle className="text-sm font-semibold text-foreground tracking-tight">
                {t("Trollbox:risksTitle", "Trollbox risks")}
              </CardTitle>
              <CardDescription className="text-[10px] text-muted-foreground/60 mt-0.5">
                {t("Trollbox:risksDesc", "Read before interacting")}
              </CardDescription>
            </div>
          </CardHeader>

          <RiskGroup
            title={t("Trollbox:risksContentTitle", "Untrusted content")}
            titleStyle={accent.iconText}
          >
            <li>{t("Trollbox:riskContent1")}</li>
            <li>{t("Trollbox:riskContent2")}</li>
            <li>{t("Trollbox:riskContent3")}</li>
            <li>{t("Trollbox:riskBlock")}</li>
          </RiskGroup>

          <RiskGroup
            title={t(
              "Trollbox:risksLinksTitle",
              "Links, attachments & instructions"
            )}
            titleStyle={accent.iconText}
          >
            <li>{t("Trollbox:riskLinks1")}</li>
            <li>{t("Trollbox:riskLinks3")}</li>
          </RiskGroup>

          <RiskGroup
            title={t("Trollbox:risksPermanenceTitle", "Permanence")}
            titleStyle={accent.iconText}
          >
            <li>{t("Trollbox:riskPerm1")}</li>
            <li>{t("Trollbox:riskPerm2")}</li>
          </RiskGroup>
        </CardContent>
      </Card>
    </div>
  );
}
