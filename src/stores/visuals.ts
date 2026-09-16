import { computed } from "nanostores";
import { persistentMap } from "@nanostores/persistent";

const DEFAULTS = {
  waveCount: 4,
  waveSpeed: 0.3,
  waveThickness: 0.95,
  wavePalette: "rainbow",
  customColor1: "#4f46e5",
  customColor2: "#06b6d4",
  auroraIntensity: 0.65,
  particlesEnabled: false,
  blurAmount: 0,
  ipfsGateway: "https://ipfs.io/ipfs/",
};

const STORAGE_PREFIX = "visualSettings:";

function migrate() {
  if (typeof localStorage === "undefined") return;
  try {
    for (const key of Object.keys(DEFAULTS)) {
      const fullKey = STORAGE_PREFIX + key;
      const item = localStorage.getItem(fullKey);
      if (item === null) continue;
      let parsed;
      try {
        parsed = JSON.parse(item);
      } catch {
        localStorage.removeItem(fullKey);
        continue;
      }
      if (parsed !== null && typeof parsed === "object") {
        localStorage.removeItem(fullKey);
      }
    }
  } catch (e) {
    // ignore migration errors
  }
}

migrate();

const $visualSettings = persistentMap(STORAGE_PREFIX, DEFAULTS);

function setVisualSetting(key, value) {
  $visualSettings.setKey(key, value);
}

function resetVisualSettings() {
  for (const key of Object.keys(DEFAULTS)) {
    $visualSettings.setKey(key, DEFAULTS[key]);
  }
}

// Wave fields read by WaveBackground (mounted on every page). Derived atom
// so unrelated keys (e.g. ipfsGateway) never notify wave readers. The custom
// `eq` keeps the previous object identity when all 9 fields are unchanged.
const WAVE_KEYS = [
  "waveCount",
  "waveSpeed",
  "waveThickness",
  "wavePalette",
  "customColor1",
  "customColor2",
  "auroraIntensity",
  "particlesEnabled",
  "blurAmount",
] as const;

export type WaveSettings = Pick<typeof DEFAULTS, (typeof WAVE_KEYS)[number]>;

const $waveSettings = computed($visualSettings, (s): WaveSettings => {
  const out = {} as WaveSettings;
  for (const k of WAVE_KEYS) out[k] = (s as any)?.[k];
  return out;
});

$waveSettings.eq = (a, b) => {
  if (a === b) return true;
  if (!a || !b) return false;
  for (const k of WAVE_KEYS) {
    if (!Object.is((a as any)[k], (b as any)[k])) return false;
  }
  return true;
};

export {
  $visualSettings,
  $waveSettings,
  setVisualSetting,
  resetVisualSettings,
};
