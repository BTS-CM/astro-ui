import React from "react";
import { useStore } from "@nanostores/react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import {
  $visualSettings,
  setVisualSetting,
  resetVisualSettings,
} from "@/stores/visuals.ts";
import { useInitCache } from "@/nanoeffects/Init.ts";
import { $userStorage } from "@/stores/users.ts";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Palette, RotateCcw } from "lucide-react";
import { PRESET_PALETTES } from "./WaveBackground.jsx";

const PALETTES = [
  { id: "rainbow", labelKey: "Visuals:palettes.rainbow" },
  { id: "ocean", labelKey: "Visuals:palettes.ocean" },
  { id: "sunset", labelKey: "Visuals:palettes.sunset" },
  { id: "mono", labelKey: "Visuals:palettes.mono" },
  { id: "custom", labelKey: "Visuals:palettes.custom" },
];

const IPFS_GATEWAYS = [
  { value: "https://ipfs.io/ipfs/", label: "ipfs.io" },
  { value: "https://4everland.io/ipfs/", label: "4everland.io" },
  { value: "https://dweb.link/ipfs/", label: "dweb.link" },
  { value: "https://dget.top/ipfs/", label: "dget.top" },
];

const HEX_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function isValidHex(value) {
  return HEX_PATTERN.test(value);
}

function normalizeHex(value) {
  if (!value) return value;
  if (value.startsWith("#")) value = value.slice(1);
  if (value.length === 3) {
    value = value.split("").map((c) => c + c).join("");
  }
  if (value.length !== 6) return null;
  return `#${value.toLowerCase()}`;
}

function ColorField({ label, value, onChange }) {
  const [draft, setDraft] = React.useState(value);

  React.useEffect(() => {
    setDraft(value);
  }, [value]);

  return (
    <div className="space-y-1.5">
      <Label className="text-sm text-foreground/70">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded-md border border-border bg-transparent p-0"
          aria-label={label}
        />
        <Input
          type="text"
          value={draft}
          onChange={(e) => {
            const v = e.target.value;
            setDraft(v);
            const normalized = normalizeHex(v);
            if (normalized) onChange(normalized);
          }}
          onBlur={() => {
            if (!isValidHex(draft)) setDraft(value);
          }}
          className="font-mono uppercase bg-accent/30 dark:bg-white/[0.05] border-border text-foreground placeholder:text-muted-foreground/60"
          maxLength={7}
        />
      </div>
    </div>
  );
}

// Value readout chips rotate A1/A2/A3 so slider rows differentiate.
// Full literal class strings — Tailwind cannot build them dynamically.
const VALUE_CHIP_TINT = {
  1: "border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] text-[hsl(var(--accent-1-fg))]",
  2: "border-[hsl(var(--accent-2)/0.3)] bg-[hsl(var(--accent-2)/0.1)] text-[hsl(var(--accent-2-fg))]",
  3: "border-[hsl(var(--accent-3)/0.3)] bg-[hsl(var(--accent-3)/0.1)] text-[hsl(var(--accent-3-fg))]",
};

function ValueChip({ accent, wide, children }) {
  return (
    <span
      className={`text-right text-sm font-mono tabular-nums rounded-md border px-1.5 py-0.5 ${
        wide ? "w-12" : "w-10"
      } ${VALUE_CHIP_TINT[accent] || VALUE_CHIP_TINT[1]}`}
    >
      {children}
    </span>
  );
}

function PaletteDots({ colors }) {
  return (
    <span className="flex -space-x-1 shrink-0">
      {colors.map((c, i) => (
        <span
          key={i}
          className="h-3 w-3 rounded-full border border-black/30"
          style={{ backgroundColor: c }}
        />
      ))}
    </span>
  );
}

function SettingRow({ label, description, children }) {  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 items-start py-3 border-b border-border/60 last:border-b-0">
      <div className="sm:col-span-1">
        <Label className="text-sm font-medium text-foreground/70">{label}</Label>
        {description ? (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        ) : null}
      </div>
      <div className="sm:col-span-2">{children}</div>
    </div>
  );
}

export default function ConfigureVisuals() {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  // Rehydrate the header user on cold load, using the last used chain
  useInitCache($userStorage.get().lastAccount?.[0]?.chain ?? "bitshares", []);
  const settings = useStore($visualSettings);

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
    ? Math.round(Number(waveCount))
    : 4;
  const safeWaveSpeed = Number.isFinite(Number(waveSpeed))
    ? Number(waveSpeed)
    : 0.3;
  const safeWaveThickness = Number.isFinite(Number(waveThickness))
    ? Number(waveThickness)
    : 0.95;
  const safeAurora = Number.isFinite(Number(auroraIntensity))
    ? Number(auroraIntensity)
    : 0.65;
  const safeBlur = Number.isFinite(Number(blurAmount))
    ? Math.round(Number(blurAmount))
    : 0;

  return (
    <div className="container mx-auto mt-5 mb-5 text-foreground">
      <div className="grid grid-cols-1 gap-3">
        <Card className="relative overflow-hidden bg-card/60 border-border shadow-lg shadow-black/20 backdrop-blur-sm gap-0">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.7)] to-transparent"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[hsl(var(--accent-1)/0.08)] via-[hsl(var(--accent-1)/0.02)] to-transparent"
          />
          <div className="relative border-b border-border p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[hsl(var(--accent-1)/0.4)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.3)] to-[hsl(var(--accent-3)/0.3)] text-[hsl(var(--accent-1-fg))] shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)]">
                <Palette className="h-4.5 w-4.5" strokeWidth={2.25} />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                  {t("Visuals:pageTitle")}
                </h2>
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  {t("Visuals:pageDescription")}
                </p>
              </div>
            </div>
          </div>
          <CardContent className="space-y-1 pt-5">
            <SettingRow
              label={t("Visuals:waveCount")}
              description={t("Visuals:waveCountDesc")}
            >
              <div className="flex items-center gap-4">
                <Slider
                  value={[safeWaveCount]}
                  min={3}
                  max={15}
                  step={1}
                  onValueChange={(v) => setVisualSetting("waveCount", v[0])}
                  className="flex-1"
                  variant="violet"
                />
                <ValueChip accent={1}>{safeWaveCount}</ValueChip>
              </div>
            </SettingRow>

            <SettingRow
              label={t("Visuals:waveSpeed")}
              description={t("Visuals:waveSpeedDesc")}
            >
              <div className="flex items-center gap-4">
                <Slider
                  value={[Math.round(safeWaveSpeed * 100)]}
                  min={30}
                  max={200}
                  step={5}
                  onValueChange={(v) =>
                    setVisualSetting("waveSpeed", v[0] / 100)
                  }
                  className="flex-1"
                  variant="cyan"
                />
                <ValueChip accent={2} wide>
                  {safeWaveSpeed.toFixed(2)}x
                </ValueChip>
              </div>
            </SettingRow>

            <SettingRow
              label={t("Visuals:waveThickness")}
              description={t("Visuals:waveThicknessDesc")}
            >
              <div className="flex items-center gap-4">
                <Slider
                  value={[Math.round(safeWaveThickness * 100)]}
                  min={50}
                  max={200}
                  step={5}
                  onValueChange={(v) =>
                    setVisualSetting("waveThickness", v[0] / 100)
                  }
                  className="flex-1"
                  variant="emerald"
                />
                <ValueChip accent={3} wide>
                  {safeWaveThickness.toFixed(2)}x
                </ValueChip>
              </div>
            </SettingRow>

            <SettingRow
              label={t("Visuals:palette")}
              description={t("Visuals:paletteDesc")}
            >
              <Select
                value={wavePalette}
                onValueChange={(v) => setVisualSetting("wavePalette", v)}
              >
                <SelectTrigger className="w-full sm:w-64 bg-accent/30 dark:bg-white/[0.05] border-border text-foreground/70">
                  <SelectValue className="text-foreground/70" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border ">
                  {PALETTES.map((p) => {
                    const pairs =
                      p.id === "custom"
                        ? [[customColor1, customColor2]]
                        : PRESET_PALETTES[p.id] || [];
                    const dots = pairs.slice(0, 3).map((pair) => pair[0]);
                    return (
                      <SelectItem key={p.id} value={p.id} className="text-foreground/70 focus:bg-accent focus:text-foreground">
                        <span className="flex items-center gap-2">
                          <PaletteDots colors={dots} />
                          {t(p.labelKey)}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </SettingRow>

            {wavePalette === "custom" && (
              <div className="py-3 space-y-4">
                <div
                  className="h-10 w-full rounded-xl border border-[hsl(var(--accent-1)/0.3)] shadow-[0_0_18px_-6px_hsl(var(--accent-1)/0.5)]"
                  style={{
                    background: `linear-gradient(to right, ${customColor1}, ${customColor2})`,
                  }}
                  aria-hidden="true"
                />
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="rounded-md border border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] px-1.5 py-0.5 text-[hsl(var(--accent-1-fg))]">{customColor1}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="rounded-md border border-[hsl(var(--accent-2)/0.3)] bg-[hsl(var(--accent-2)/0.1)] px-1.5 py-0.5 text-[hsl(var(--accent-2-fg))]">{customColor2}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ColorField
                    label={t("Visuals:customColor1")}
                    value={customColor1}
                    onChange={(v) => setVisualSetting("customColor1", v)}
                  />
                  <ColorField
                    label={t("Visuals:customColor2")}
                    value={customColor2}
                    onChange={(v) => setVisualSetting("customColor2", v)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("Visuals:customColorDesc")}
                </p>
              </div>
            )}

            <SettingRow
              label={t("Visuals:auroraIntensity")}
              description={t("Visuals:auroraIntensityDesc")}
            >
              <div className="flex items-center gap-4">
                <Slider
                  value={[Math.round(safeAurora * 100)]}
                  min={0}
                  max={200}
                  step={5}
                  onValueChange={(v) =>
                    setVisualSetting("auroraIntensity", v[0] / 100)
                  }
                  className="flex-1"
                  variant="amber"
                />
                <ValueChip accent={1} wide>
                  {safeAurora.toFixed(2)}x
                </ValueChip>
              </div>
            </SettingRow>

            <SettingRow
              label={t("Visuals:blurAmount")}
              description={t("Visuals:blurAmountDesc")}
            >
              <div className="flex items-center gap-4">
                <Slider
                  value={[safeBlur]}
                  min={0}
                  max={5}
                  step={1}
                  onValueChange={(v) =>
                    setVisualSetting("blurAmount", v[0])
                  }
                  className="flex-1"
                  variant="rose"
                />
                <ValueChip accent={2}>{safeBlur}</ValueChip>
              </div>
            </SettingRow>

            <SettingRow
              label={t("Visuals:particles")}
              description={t("Visuals:particlesDesc")}
            >
              <div className="flex items-center">
                <Switch
                  checked={particlesEnabled}
                  onCheckedChange={(v) =>
                    setVisualSetting("particlesEnabled", v)
                  }
                  className="data-[state=checked]:bg-[hsl(var(--accent-1))]"
                />
                <span className="ml-3 text-sm text-muted-foreground">
                  {particlesEnabled
                    ? t("Visuals:on")
                    : t("Visuals:off")}
                </span>
              </div>
            </SettingRow>

            <div className="pt-6 pb-2 flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[hsl(var(--accent-2)/0.15)] shrink-0">
                <Palette className="h-4 w-4 text-[hsl(var(--accent-2-fg))]" />
              </span>
              <div>
                <h3 className="text-base font-semibold tracking-tight text-[hsl(var(--accent-2-fg))]">
                  {t("Visuals:externalServices.heading")}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("Visuals:externalServices.description")}
                </p>
              </div>
            </div>

            <SettingRow
              label={t("Visuals:externalServices.ipfsGateway.header")}
              description={t("Visuals:externalServices.ipfsGateway.help")}
            >
              <Select
                value={settings.ipfsGateway ?? "https://ipfs.io/ipfs/"}
                onValueChange={(v) => setVisualSetting("ipfsGateway", v)}
              >
                <SelectTrigger className="w-full sm:w-64 bg-accent/30 dark:bg-white/[0.05] border-border text-foreground/70">
                  <SelectValue className="text-foreground/70" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border ">
                  {IPFS_GATEWAYS.map((gw) => (
                    <SelectItem key={gw.value} value={gw.value} className="text-foreground/70 focus:bg-accent focus:text-foreground">
                      {gw.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SettingRow>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={resetVisualSettings}
            className="border-[hsl(var(--accent-danger)/0.3)] text-[hsl(var(--accent-danger-fg))] dark:text-[hsl(var(--accent-danger-fg))] hover:bg-[hsl(var(--accent-danger)/0.1)] gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t("Visuals:resetToDefaults")}
          </Button>
        </div>
      </div>
    </div>
  );
}
