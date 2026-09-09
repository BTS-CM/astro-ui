import React from "react";
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

function RiskGroup({ title, children }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-4 mb-3 last:mb-0">
      <div className="text-xs font-medium uppercase tracking-wider dark:text-[hsl(var(--accent-warning-fg)/0.7)] text-[hsl(var(--accent-warning-fg)/0.8)] mb-2">
        {title}
      </div>
      <ul className="ml-2 list-disc [&>li]:mt-1 pl-2 text-sm">{children}</ul>
    </div>
  );
}

export default function TrollboxRisks() {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  return (
    <div className="grid grid-cols-1 mt-4">
      <Card className="relative overflow-hidden rounded-xl border border-[hsl(var(--accent-warning)/0.15)] bg-card/60 shadow-lg shadow-[color:hsl(var(--accent-warning)/0.1)]">
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-warning)/0.6)] to-transparent" />
        <span aria-hidden="true" className="pointer-events-none absolute -top-16 -left-16 h-40 w-40 rounded-full bg-[hsl(var(--accent-warning)/0.08)] blur-3xl" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-16 -right-16 h-40 w-40 rounded-full bg-[hsl(var(--accent-warning)/0.08)] blur-3xl" />
        <CardContent className="relative p-5">
          <CardHeader className="flex flex-row items-center gap-3 mb-4 p-0">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[hsl(var(--accent-warning)/0.3)] bg-gradient-to-br from-[hsl(var(--accent-warning)/0.2)] to-[hsl(var(--accent-warning)/0.2)] dark:text-[hsl(var(--accent-warning-gradFg))] text-[hsl(var(--accent-warning-gradFg))] flex-shrink-0">
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

          <RiskGroup title={t("Trollbox:risksContentTitle", "Untrusted content")}>
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
          >
            <li>{t("Trollbox:riskLinks1")}</li>
            <li>{t("Trollbox:riskLinks2")}</li>
            <li>{t("Trollbox:riskLinks3")}</li>
          </RiskGroup>

          <RiskGroup title={t("Trollbox:risksPermanenceTitle", "Permanence")}>
            <li>{t("Trollbox:riskPerm1")}</li>
            <li>{t("Trollbox:riskPerm2")}</li>
          </RiskGroup>
        </CardContent>
      </Card>
    </div>
  );
}
