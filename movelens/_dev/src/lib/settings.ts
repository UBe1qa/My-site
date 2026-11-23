import type { AppSettings, BoardThemeId, Locale } from '../types/chess';

const STORAGE_KEY = 'movelens_settings_v1';

const VALID_LOCALES = new Set<Locale>(['ko', 'en']);
const VALID_THEMES = new Set<BoardThemeId>(['walnut', 'slate', 'sage']);

export function getDefaultSettings(): AppSettings {
  const isMobile =
    typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;
  return {
    locale: 'ko',
    boardTheme: 'walnut',
    analysisDepth: isMobile ? 10 : 14,
    showBestArrow: true,
    showPlayedArrow: true,
    autoAnalyze: true,
    recentUsers: [],
    lastUsername: '',
  };
}

export function decodeSettings(raw: unknown): AppSettings {
  const def = getDefaultSettings();
  if (!raw || typeof raw !== 'object') return def;
  const obj = raw as Record<string, unknown>;

  const locale = VALID_LOCALES.has(obj.locale as Locale) ? (obj.locale as Locale) : def.locale;
  const boardTheme = VALID_THEMES.has(obj.boardTheme as BoardThemeId)
    ? (obj.boardTheme as BoardThemeId)
    : def.boardTheme;

  const rawDepth = typeof obj.analysisDepth === 'number' ? obj.analysisDepth : def.analysisDepth;
  const analysisDepth = Number.isFinite(rawDepth)
    ? Math.max(8, Math.min(20, Math.round(rawDepth)))
    : def.analysisDepth;

  const recentUsers = Array.isArray(obj.recentUsers)
    ? obj.recentUsers
        .filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
        .slice(0, 8)
    : def.recentUsers;

  return {
    locale,
    boardTheme,
    analysisDepth,
    showBestArrow:
      typeof obj.showBestArrow === 'boolean' ? obj.showBestArrow : def.showBestArrow,
    showPlayedArrow:
      typeof obj.showPlayedArrow === 'boolean' ? obj.showPlayedArrow : def.showPlayedArrow,
    autoAnalyze: typeof obj.autoAnalyze === 'boolean' ? obj.autoAnalyze : def.autoAnalyze,
    recentUsers,
    lastUsername: typeof obj.lastUsername === 'string' ? obj.lastUsername : def.lastUsername,
  };
}

export function loadSettings(): AppSettings {
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    if (!text) return getDefaultSettings();
    return decodeSettings(JSON.parse(text));
  } catch {
    return getDefaultSettings();
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore storage quota or private mode errors
  }
}

export function addRecentUser(users: string[], username: string): string[] {
  const clean = username.trim();
  if (!clean) return users;
  const lower = clean.toLowerCase();
  const filtered = users.filter((u) => u.toLowerCase() !== lower);
  return [clean, ...filtered].slice(0, 6);
}
