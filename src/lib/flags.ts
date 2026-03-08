// Feature flags
// - 기본값은 안전하게 false
// - 서버에서는 FF_* 우선, 없으면 NEXT_PUBLIC_FF_* 사용
// - 클라이언트에서는 NEXT_PUBLIC_FF_*만 사용됨

export type FeatureFlag = "onboarding_v2" | "dashboard_v2";

const TRUE_VALUES = new Set(["1", "true", "t", "yes", "y", "on"]);
const FALSE_VALUES = new Set(["0", "false", "f", "no", "n", "off"]);

const FEATURE_FLAG_DEFAULTS: Record<FeatureFlag, boolean> = {
  onboarding_v2: false,
  dashboard_v2: false,
};

const FEATURE_FLAG_ENV_KEYS: Record<FeatureFlag, readonly string[]> = {
  onboarding_v2: ["FF_ONBOARDING_V2", "NEXT_PUBLIC_FF_ONBOARDING_V2"],
  dashboard_v2: ["FF_DASHBOARD_V2", "NEXT_PUBLIC_FF_DASHBOARD_V2"],
};

function parseBoolean(rawValue: string | undefined, defaultValue: boolean): boolean {
  if (!rawValue) return defaultValue;
  const normalized = rawValue.trim().toLowerCase();
  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;
  return defaultValue;
}

function getFlagRawValue(flag: FeatureFlag): string | undefined {
  const keys = FEATURE_FLAG_ENV_KEYS[flag];
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return undefined;
}

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  const rawValue = getFlagRawValue(flag);
  return parseBoolean(rawValue, FEATURE_FLAG_DEFAULTS[flag]);
}

export function getFeatureFlags() {
  return {
    onboarding_v2: isFeatureEnabled("onboarding_v2"),
    dashboard_v2: isFeatureEnabled("dashboard_v2"),
  } as const;
}

export const featureFlags = {
  onboardingV2: () => isFeatureEnabled("onboarding_v2"),
  dashboardV2: () => isFeatureEnabled("dashboard_v2"),
};
