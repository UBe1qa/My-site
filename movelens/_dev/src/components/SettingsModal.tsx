import React from 'react';
import { X } from 'lucide-react';
import type { AppSettings, BoardThemeId, Locale } from '../types/chess';
import { t } from '../i18n';

interface SettingsModalProps {
  open: boolean;
  settings: AppSettings;
  onChange: (next: AppSettings) => void;
  onClose: () => void;
}

const DEPTH_OPTIONS = [
  { value: 10, key: 'depthFast' as const },
  { value: 14, key: 'depthBalanced' as const },
  { value: 18, key: 'depthDeep' as const },
];

const THEME_OPTIONS: Array<{ value: BoardThemeId; key: 'themeWalnut' | 'themeSlate' | 'themeSage'; swatch: [string, string] }> = [
  { value: 'walnut', key: 'themeWalnut', swatch: ['#E7D8C3', '#9C7351'] },
  { value: 'slate', key: 'themeSlate', swatch: ['#D9E0E8', '#63768D'] },
  { value: 'sage', key: 'themeSage', swatch: ['#E3E8DC', '#6C8468'] },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  settings,
  onChange,
  onClose,
}) => {
  if (!open) return null;
  const { locale } = settings;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{t(locale, 'settings')}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t(locale, 'close')}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="setting-group">
            <label className="setting-label">{t(locale, 'settingDepth')}</label>
            <div className="option-stack">
              {DEPTH_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`option-row ${settings.analysisDepth === opt.value ? 'is-selected' : ''}`}
                  onClick={() => onChange({ ...settings, analysisDepth: opt.value })}
                >
                  <span>{t(locale, opt.key)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="setting-group">
            <label className="setting-label">{t(locale, 'settingTheme')}</label>
            <div className="theme-grid">
              {THEME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`theme-btn ${settings.boardTheme === opt.value ? 'is-selected' : ''}`}
                  onClick={() => onChange({ ...settings, boardTheme: opt.value })}
                >
                  <span className="theme-swatch">
                    <span style={{ background: opt.swatch[0] }} />
                    <span style={{ background: opt.swatch[1] }} />
                  </span>
                  <span>{t(locale, opt.key)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="setting-group">
            <label className="toggle-row">
              <span>{t(locale, 'settingArrows')}</span>
              <input
                type="checkbox"
                checked={settings.showBestArrow}
                onChange={(e) => onChange({ ...settings, showBestArrow: e.target.checked })}
              />
            </label>
            <label className="toggle-row">
              <span>{t(locale, 'settingAutoAnalyze')}</span>
              <input
                type="checkbox"
                checked={settings.autoAnalyze}
                onChange={(e) => onChange({ ...settings, autoAnalyze: e.target.checked })}
              />
            </label>
          </div>

          <div className="setting-group">
            <label className="setting-label">{t(locale, 'settingLanguage')}</label>
            <div className="segmented-tabs">
              {(['ko', 'en'] as Locale[]).map((loc) => (
                <button
                  key={loc}
                  type="button"
                  className={`segmented-tab ${settings.locale === loc ? 'is-active' : ''}`}
                  onClick={() => onChange({ ...settings, locale: loc })}
                >
                  {loc === 'ko' ? '한국어' : 'English'}
                </button>
              ))}
            </div>
          </div>

          <p className="install-hint">{t(locale, 'installHint')}</p>
        </div>
      </div>
    </div>
  );
};
