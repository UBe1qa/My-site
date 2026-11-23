import React, { useState } from 'react';
import { RefreshCw, Search, Sparkles, Clock, FileText, Trophy } from 'lucide-react';
import type { ChessComGameItem, Locale } from '../types/chess';
import { formatRelativeDate, getPlayerOutcome } from '../lib/chesscom';
import { t } from '../i18n';

interface GameSidebarProps {
  locale: Locale;
  usernameInput: string;
  onUsernameInputChange: (val: string) => void;
  activeUsername: string;
  recentUsers: string[];
  games: ChessComGameItem[];
  selectedGameId: string | null;
  loadingGames: boolean;
  loadingMore: boolean;
  hasMoreArchives: boolean;
  errorMsg: string | null;
  onSearchUser: (username: string) => void;
  onRefresh: () => void;
  onLoadMore: () => void;
  onSelectChessComGame: (game: ChessComGameItem) => void;
  onLoadPgn: (pgn: string) => string | null;
  onLoadSample: () => void;
}

export const GameSidebar: React.FC<GameSidebarProps> = ({
  locale,
  usernameInput,
  onUsernameInputChange,
  activeUsername,
  recentUsers,
  games,
  selectedGameId,
  loadingGames,
  loadingMore,
  hasMoreArchives,
  errorMsg,
  onSearchUser,
  onRefresh,
  onLoadMore,
  onSelectChessComGame,
  onLoadPgn,
  onLoadSample,
}) => {
  const [subTab, setSubTab] = useState<'chesscom' | 'pgn'>('chesscom');
  const [pgnText, setPgnText] = useState('');
  const [pgnError, setPgnError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameInput.trim()) {
      onSearchUser(usernameInput.trim());
    }
  };

  const handlePgnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = onLoadPgn(pgnText);
    setPgnError(err);
  };

  return (
    <div className="sidebar-panel">
      <div className="segmented-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'chesscom'}
          className={`segmented-tab ${subTab === 'chesscom' ? 'is-active' : ''}`}
          onClick={() => setSubTab('chesscom')}
        >
          <Trophy size={14} />
          <span>{t(locale, 'tabChessCom')}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'pgn'}
          className={`segmented-tab ${subTab === 'pgn' ? 'is-active' : ''}`}
          onClick={() => setSubTab('pgn')}
        >
          <FileText size={14} />
          <span>{t(locale, 'tabPgn')}</span>
        </button>
      </div>

      {subTab === 'chesscom' ? (
        <div className="sidebar-body">
          <form className="search-form" onSubmit={handleSubmit}>
            <div className="search-input-wrap">
              <Search size={15} className="search-icon" />
              <input
                type="text"
                className="text-input"
                value={usernameInput}
                onChange={(e) => onUsernameInputChange(e.target.value)}
                placeholder={t(locale, 'usernamePlaceholder')}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loadingGames || !usernameInput.trim()}
            >
              {loadingGames ? t(locale, 'searching') : t(locale, 'searchBtn')}
            </button>
          </form>

          {recentUsers.length > 0 && (
            <div className="recent-users">
              {recentUsers.map((u) => (
                <button
                  key={u}
                  type="button"
                  className={`chip-btn ${
                    activeUsername.toLowerCase() === u.toLowerCase() ? 'is-active' : ''
                  }`}
                  onClick={() => {
                    onUsernameInputChange(u);
                    onSearchUser(u);
                  }}
                >
                  {u}
                </button>
              ))}
            </div>
          )}

          {activeUsername && (
            <div className="list-toolbar">
              <span className="list-toolbar-title">
                {activeUsername} · {games.length}
              </span>
              <button
                type="button"
                className="btn-ghost-sm"
                onClick={onRefresh}
                disabled={loadingGames}
                title={t(locale, 'refreshGames')}
              >
                <RefreshCw size={13} className={loadingGames ? 'spin' : ''} />
                <span>{t(locale, 'refreshGames')}</span>
              </button>
            </div>
          )}

          {errorMsg && <div className="inline-alert is-error">{errorMsg}</div>}

          <div className="game-list">
            {loadingGames && games.length === 0 ? (
              <div className="skeleton-list">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="skeleton-row" />
                ))}
              </div>
            ) : games.length === 0 ? (
              <div className="empty-state">
                <p className="empty-title">{t(locale, 'noGamesYet')}</p>
                <p className="empty-desc">{t(locale, 'noGamesHint')}</p>
                <button type="button" className="btn btn-secondary" onClick={onLoadSample}>
                  <Sparkles size={14} />
                  <span>{t(locale, 'trySampleGame')}</span>
                </button>
              </div>
            ) : (
              <>
                {games.map((g) => {
                  const outcome = getPlayerOutcome(g, activeUsername);
                  const isUserWhite =
                    g.white.username.toLowerCase() === activeUsername.toLowerCase();
                  const opponent = isUserWhite ? g.black : g.white;
                  const mySide = isUserWhite ? g.white : g.black;
                  const isSelected = selectedGameId === g.id;

                  return (
                    <button
                      key={g.id}
                      type="button"
                      className={`game-row ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => onSelectChessComGame(g)}
                    >
                      <span className={`outcome-pill is-${outcome}`}>
                        {outcome === 'win'
                          ? t(locale, 'win')
                          : outcome === 'loss'
                          ? t(locale, 'loss')
                          : t(locale, 'draw')}
                      </span>

                      <div className="game-row-main">
                        <div className="game-row-top">
                          <span className="game-opponent">
                            <span
                              className={`side-dot ${isUserWhite ? 'is-white' : 'is-black'}`}
                              title={isUserWhite ? t(locale, 'white') : t(locale, 'black')}
                            />
                            <span className="truncate">{opponent.username}</span>
                            {opponent.rating > 0 && (
                              <span className="rating-muted">({opponent.rating})</span>
                            )}
                          </span>
                          <span className="game-date">
                            {formatRelativeDate(g.endTime, locale)}
                          </span>
                        </div>
                        <div className="game-row-sub">
                          <span className="time-tag">
                            <Clock size={11} />
                            {g.timeClass}
                          </span>
                          {mySide.rating > 0 && (
                            <span className="rating-muted">{mySide.rating}</span>
                          )}
                          {g.opening && <span className="opening-text truncate">{g.opening}</span>}
                        </div>
                      </div>
                    </button>
                  );
                })}

                {hasMoreArchives ? (
                  <button
                    type="button"
                    className="btn btn-secondary load-more-btn"
                    onClick={onLoadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? t(locale, 'loadingMore') : t(locale, 'loadMore')}
                  </button>
                ) : (
                  <div className="list-end-note">{t(locale, 'allGamesLoaded')}</div>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="sidebar-body">
          <form className="pgn-form" onSubmit={handlePgnSubmit}>
            <textarea
              className="pgn-textarea"
              value={pgnText}
              onChange={(e) => {
                setPgnText(e.target.value);
                if (pgnError) setPgnError(null);
              }}
              placeholder={t(locale, 'pgnPlaceholder')}
              rows={10}
            />
            {pgnError && <div className="inline-alert is-error">{pgnError}</div>}
            <div className="pgn-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!pgnText.trim()}
              >
                {t(locale, 'analyzePgnBtn')}
              </button>
              <button type="button" className="btn btn-secondary" onClick={onLoadSample}>
                <Sparkles size={14} />
                <span>{t(locale, 'sampleGameLabel')}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
