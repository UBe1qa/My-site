import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Share2,
  Settings,
  AlertTriangle,
  Copy,
  List,
  BarChart3,
} from 'lucide-react';
import type {
  AppSettings,
  ChessComGameItem,
  MoveAnalysis,
  ParsedGame,
  PositionEval,
} from './types/chess';
import { addRecentUser, loadSettings, saveSettings } from './lib/settings';
import {
  ChessComApiError,
  fetchArchiveGames,
  fetchUserArchives,
} from './lib/chesscom';
import { parsePgnToGame, SAMPLE_OPERA_PGN } from './lib/pgn';
import { computeGameSummary } from './lib/eval';
import { StockfishEngine } from './lib/stockfish';
import { buildShareUrl, parseShareUrl } from './lib/share';
import { t } from './i18n';
import { ChessBoard, type BoardArrow } from './components/ChessBoard';
import { EvalBar } from './components/EvalBar';
import { GameSidebar } from './components/GameSidebar';
import { ReviewPanel } from './components/ReviewPanel';
import { SettingsModal } from './components/SettingsModal';

interface VariationState {
  basePly: number;
  fen: string;
  lastMove: { from: string; to: string } | null;
}

export const App: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const { locale } = settings;

  // Sidebar / Chess.com state
  const [usernameInput, setUsernameInput] = useState(settings.lastUsername);
  const [activeUsername, setActiveUsername] = useState('');
  const [archives, setArchives] = useState<string[]>([]);
  const [archiveIdx, setArchiveIdx] = useState(0);
  const [games, setGames] = useState<ChessComGameItem[]>([]);
  const [loadingGames, setLoadingGames] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Active game & board state
  const [game, setGame] = useState<ParsedGame | null>(null);
  const [currentPly, setCurrentPly] = useState(0);
  const [orientation, setOrientation] = useState<'w' | 'b'>('w');
  const [variation, setVariation] = useState<VariationState | null>(null);

  // Analysis state
  const [engineStatus, setEngineStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [positionEvals, setPositionEvals] = useState<Record<number, PositionEval>>({});
  const [moveAnalyses, setMoveAnalyses] = useState<Record<number, MoveAnalysis>>({});
  const [liveEval, setLiveEval] = useState<PositionEval | null>(null);

  // UI state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileView, setMobileView] = useState<'games' | 'board'>('board');
  const [toast, setToast] = useState<string | null>(null);

  // Refs for Stockfish worker & abort controllers
  const engineRef = useRef<StockfishEngine | null>(null);
  const reviewAbortRef = useRef<AbortController | null>(null);
  const liveAbortRef = useRef<AbortController | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  // Persist settings
  const updateSettings = useCallback((next: AppSettings) => {
    setSettings(next);
    saveSettings(next);
  }, []);

  // Initialize Stockfish WASM engine on mount
  useEffect(() => {
    const engine = new StockfishEngine();
    engineRef.current = engine;
    engine
      .init()
      .then(() => setEngineStatus('ready'))
      .catch(() => setEngineStatus('error'));

    return () => {
      reviewAbortRef.current?.abort();
      liveAbortRef.current?.abort();
      engine.terminate();
    };
  }, []);

  const stopReview = useCallback(() => {
    reviewAbortRef.current?.abort();
    reviewAbortRef.current = null;
    setAnalyzing(false);
  }, []);

  const startReviewForGame = useCallback(
    async (targetGame: ParsedGame, depth: number) => {
      const engine = engineRef.current;
      if (!engine) return;

      // Cancel any running live or review search
      liveAbortRef.current?.abort();
      reviewAbortRef.current?.abort();

      const controller = new AbortController();
      reviewAbortRef.current = controller;

      setAnalyzing(true);
      setPositionEvals({});
      setMoveAnalyses({});
      setLiveEval(null);
      setProgress({ current: 0, total: Math.max(0, targetGame.plies.length - 1) });

      try {
        await engine.analyzeGame({
          plies: targetGame.plies,
          depth,
          signal: controller.signal,
          onPositionEval: (ply, posEval) => {
            setPositionEvals((prev) => ({ ...prev, [ply]: posEval }));
          },
          onMoveAnalyzed: (analysis) => {
            setMoveAnalyses((prev) => ({ ...prev, [analysis.ply]: analysis }));
          },
          onProgress: (current, total) => {
            setProgress({ current, total });
          },
        });
      } catch (err) {
        if ((err as Error)?.name !== 'AbortError') {
          setEngineStatus('error');
        }
      } finally {
        if (reviewAbortRef.current === controller) {
          reviewAbortRef.current = null;
          setAnalyzing(false);
        }
      }
    },
    []
  );

  const openParsedGame = useCallback(
    (parsed: ParsedGame, preferredUser?: string, autoStart?: boolean) => {
      stopReview();
      liveAbortRef.current?.abort();
      setGame(parsed);
      setCurrentPly(0);
      setVariation(null);
      setPositionEvals({});
      setMoveAnalyses({});
      setLiveEval(null);

      // Auto-orient board so the searched player sits at bottom
      if (preferredUser) {
        const lower = preferredUser.toLowerCase();
        if (parsed.black.toLowerCase() === lower && parsed.white.toLowerCase() !== lower) {
          setOrientation('b');
        } else {
          setOrientation('w');
        }
      } else {
        setOrientation('w');
      }

      setMobileView('board');

      const shouldAnalyze = autoStart ?? settings.autoAnalyze;
      if (shouldAnalyze && engineStatus !== 'error') {
        void startReviewForGame(parsed, settings.analysisDepth);
      }
    },
    [stopReview, settings.autoAnalyze, settings.analysisDepth, engineStatus, startReviewForGame]
  );

  const selectChessComGame = useCallback(
    (item: ChessComGameItem, userForOrientation?: string) => {
      try {
        const parsed = parsePgnToGame(item.pgn, {
          id: item.id,
          source: 'chesscom',
          url: item.url,
          timeClass: item.timeClass,
        });
        openParsedGame(parsed, userForOrientation ?? activeUsername);
      } catch {
        showToast(t(locale, 'pgnInvalid'));
      }
    },
    [activeUsername, locale, openParsedGame, showToast]
  );

  const searchUser = useCallback(
    async (username: string, autoSelectGameId?: string) => {
      const clean = username.trim();
      if (!clean) return;
      setLoadingGames(true);
      setApiError(null);
      setActiveUsername(clean);

      try {
        const archiveUrls = await fetchUserArchives(clean);
        setArchives(archiveUrls);

        let collected: ChessComGameItem[] = [];
        let loadedIdx = 0;

        // Load latest month; if fewer than 12 games and older month exists, pull one more month
        for (let i = 0; i < Math.min(archiveUrls.length, 2); i++) {
          const monthGames = await fetchArchiveGames(archiveUrls[i]);
          collected = [...collected, ...monthGames];
          loadedIdx = i + 1;
          if (collected.length >= 15 && (!autoSelectGameId || collected.some((g) => g.id === autoSelectGameId))) {
            break;
          }
        }

        // If looking for a shared gameId, scan up to 6 months
        if (autoSelectGameId && !collected.some((g) => g.id === autoSelectGameId)) {
          while (loadedIdx < Math.min(archiveUrls.length, 6)) {
            const monthGames = await fetchArchiveGames(archiveUrls[loadedIdx]);
            collected = [...collected, ...monthGames];
            loadedIdx++;
            if (collected.some((g) => g.id === autoSelectGameId)) break;
          }
        }

        setGames(collected);
        setArchiveIdx(loadedIdx);

        // Save recent user
        setSettings((prev) => {
          const updated: AppSettings = {
            ...prev,
            lastUsername: clean,
            recentUsers: addRecentUser(prev.recentUsers, clean),
          };
          saveSettings(updated);
          return updated;
        });

        if (autoSelectGameId) {
          const matched = collected.find((g) => g.id === autoSelectGameId);
          if (matched) {
            selectChessComGame(matched, clean);
          }
        } else if (collected.length > 0 && !game) {
          selectChessComGame(collected[0], clean);
        }
      } catch (err) {
        setGames([]);
        setArchives([]);
        setArchiveIdx(0);
        if (err instanceof ChessComApiError) {
          if (err.code === 'NOT_FOUND') setApiError(t(locale, 'errUserNotFound'));
          else if (err.code === 'NO_ARCHIVES') setApiError(t(locale, 'errNoArchives'));
          else setApiError(t(locale, 'errNetwork'));
        } else {
          setApiError(t(locale, 'errNetwork'));
        }
      } finally {
        setLoadingGames(false);
      }
    },
    [game, locale, selectChessComGame]
  );

  const loadMoreArchives = useCallback(async () => {
    if (loadingMore || archiveIdx >= archives.length) return;
    setLoadingMore(true);
    try {
      const more = await fetchArchiveGames(archives[archiveIdx]);
      setGames((prev) => {
        const seen = new Set(prev.map((g) => g.id));
        const next = more.filter((g) => !seen.has(g.id));
        return [...prev, ...next];
      });
      setArchiveIdx((i) => i + 1);
    } catch {
      showToast(t(locale, 'errNetwork'));
    } finally {
      setLoadingMore(false);
    }
  }, [archiveIdx, archives, loadingMore, locale, showToast]);

  const loadSampleGame = useCallback(() => {
    const parsed = parsePgnToGame(SAMPLE_OPERA_PGN, {
      id: 'sample-opera-1858',
      source: 'sample',
    });
    openParsedGame(parsed, undefined, true);
  }, [openParsedGame]);

  const handleLoadPgn = useCallback(
    (pgnText: string): string | null => {
      try {
        const parsed = parsePgnToGame(pgnText, { source: 'pgn' });
        openParsedGame(parsed, undefined, true);
        return null;
      } catch {
        return t(locale, 'pgnInvalid');
      }
    },
    [locale, openParsedGame]
  );

  // Initial URL / saved username bootstrap (runs once)
  const bootedRef = useRef(false);
  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;

    const shared = parseShareUrl(window.location.href);
    if (shared.pgn) {
      try {
        const parsed = parsePgnToGame(shared.pgn, { source: 'pgn' });
        openParsedGame(parsed, undefined, true);
        return;
      } catch {
        // fallback below
      }
    }
    if (shared.user) {
      setUsernameInput(shared.user);
      void searchUser(shared.user, shared.gameId);
      return;
    }
    if (settings.lastUsername) {
      void searchUser(settings.lastUsername);
    } else {
      const sample = parsePgnToGame(SAMPLE_OPERA_PGN, {
        id: 'sample-opera-1858',
        source: 'sample',
      });
      setGame(sample);
      setCurrentPly(0);
    }
  }, [openParsedGame, searchUser, settings.lastUsername]);

  // Active FEN shown on board
  const currentNode = game?.plies[currentPly] ?? null;
  const activeFen =
    variation?.fen ??
    currentNode?.fen ??
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  const activeLastMove = variation
    ? variation.lastMove
    : currentNode && currentNode.from && currentNode.to
    ? { from: currentNode.from, to: currentNode.to }
    : null;

  // Live MultiPV analysis when not running full game review
  useEffect(() => {
    if (analyzing || engineStatus !== 'ready' || !game) return;
    // Skip terminal positions
    const chess = new Chess();
    try {
      chess.load(activeFen);
      if (chess.isGameOver()) {
        setLiveEval(null);
        return;
      }
    } catch {
      return;
    }

    const timer = window.setTimeout(() => {
      liveAbortRef.current?.abort();
      const ctrl = new AbortController();
      liveAbortRef.current = ctrl;

      engineRef.current
        ?.evaluateFen({
          fen: activeFen,
          depth: Math.max(12, settings.analysisDepth),
          multiPv: 2,
          signal: ctrl.signal,
          onUpdate: (ev) => setLiveEval(ev),
        })
        .then((finalEv) => {
          if (!ctrl.signal.aborted) setLiveEval(finalEv);
        })
        .catch(() => {
          // ignore abort
        });
    }, 140);

    return () => {
      window.clearTimeout(timer);
      liveAbortRef.current?.abort();
    };
  }, [activeFen, analyzing, engineStatus, game, settings.analysisDepth]);

  // Navigation helpers
  const goToPly = useCallback(
    (ply: number) => {
      if (!game) return;
      const clamped = Math.max(0, Math.min(game.plies.length - 1, ply));
      setVariation(null);
      setCurrentPly(clamped);
    },
    [game]
  );

  const jumpToNextError = useCallback(() => {
    if (!game) return;
    const isErr = (ply: number) => {
      const cls = moveAnalyses[ply]?.classification;
      return cls === 'blunder' || cls === 'mistake' || cls === 'inaccuracy';
    };
    for (let p = currentPly + 1; p < game.plies.length; p++) {
      if (isErr(p)) {
        goToPly(p);
        return;
      }
    }
    // Wrap around from beginning
    for (let p = 1; p <= currentPly; p++) {
      if (isErr(p)) {
        goToPly(p);
        return;
      }
    }
  }, [currentPly, game, goToPly, moveAnalyses]);

  // Keyboard navigation (desktop)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (settingsOpen) {
        if (e.key === 'Escape') setSettingsOpen(false);
        return;
      }
      if (!game) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (variation) {
          setVariation(null);
        } else {
          goToPly(currentPly - 1);
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToPly(currentPly + 1);
      } else if (e.key === 'ArrowUp' || e.key === 'Home') {
        e.preventDefault();
        goToPly(0);
      } else if (e.key === 'ArrowDown' || e.key === 'End') {
        e.preventDefault();
        goToPly(game.plies.length - 1);
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        setOrientation((o) => (o === 'w' ? 'b' : 'w'));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentPly, game, goToPly, settingsOpen, variation]);

  // User manually moves a piece on the board (variation exploration)
  const handleUserMove = useCallback(
    (from: string, to: string, promotion?: string): boolean => {
      const chess = new Chess(activeFen);
      try {
        const mv = chess.move({ from, to, promotion: promotion ?? 'q' });
        if (!mv) return false;

        // If this matches the next main-line move when not in variation, just advance ply
        if (!variation && game && currentPly + 1 < game.plies.length) {
          const nextNode = game.plies[currentPly + 1];
          const playedUci = `${mv.from}${mv.to}${mv.promotion ?? ''}`;
          if (nextNode.uci === playedUci) {
            setCurrentPly(currentPly + 1);
            return true;
          }
        }

        setVariation({
          basePly: variation ? variation.basePly : currentPly,
          fen: chess.fen(),
          lastMove: { from: mv.from, to: mv.to },
        });
        return true;
      } catch {
        return false;
      }
    },
    [activeFen, currentPly, game, variation]
  );

  // Preview the engine's recommended move from BEFORE the current played move
  const handlePreviewBestMove = useCallback(
    (uci: string) => {
      if (!game || currentPly <= 0 || uci.length < 4) return;
      const prevFen = game.plies[currentPly - 1].fen;
      const chess = new Chess(prevFen);
      try {
        const mv = chess.move({
          from: uci.slice(0, 2),
          to: uci.slice(2, 4),
          promotion: uci.length >= 5 ? uci[4] : 'q',
        });
        if (!mv) return;
        setVariation({
          basePly: currentPly,
          fen: chess.fen(),
          lastMove: { from: mv.from, to: mv.to },
        });
      } catch {
        // ignore invalid UCI
      }
    },
    [currentPly, game]
  );

  // Play a live-engine recommended move from the current board position
  const handlePlayEngineMove = useCallback(
    (uci: string) => {
      if (uci.length < 4) return;
      handleUserMove(uci.slice(0, 2), uci.slice(2, 4), uci.length >= 5 ? uci[4] : undefined);
    },
    [handleUserMove]
  );

  // Share link handler (Web Share API on Android + clipboard fallback on Desktop)
  const handleShare = useCallback(async () => {
    if (!game) return;
    const shareUrl =
      game.source === 'chesscom' && activeUsername
        ? buildShareUrl(window.location.href, { user: activeUsername, gameId: game.id })
        : buildShareUrl(window.location.href, { pgn: game.pgn });

    if (!shareUrl) {
      showToast(t(locale, 'shareTooLong'));
      return;
    }

    const title = `${game.white} vs ${game.black} — MoveLens`;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url: shareUrl });
        return;
      } catch {
        // user canceled or unsupported, fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast(t(locale, 'shareCopied'));
    } catch {
      showToast(t(locale, 'shareFailed'));
    }
  }, [activeUsername, game, locale, showToast]);

  const handleCopyPgn = useCallback(async () => {
    if (!game) return;
    try {
      await navigator.clipboard.writeText(game.pgn);
      showToast(t(locale, 'pgnCopied'));
    } catch {
      showToast(t(locale, 'shareFailed'));
    }
  }, [game, locale, showToast]);

  // Derived data for Board, EvalBar, Arrows, Summary
  const summary = useMemo(() => {
    if (!game) return null;
    return computeGameSummary(game.plies, moveAnalyses);
  }, [game, moveAnalyses]);

  const activeScore = useMemo(() => {
    if (variation) return liveEval?.score ?? null;
    return positionEvals[currentPly]?.score ?? liveEval?.score ?? null;
  }, [currentPly, liveEval, positionEvals, variation]);

  const boardArrows: BoardArrow[] = useMemo(() => {
    if (!settings.showBestArrow) return [];
    const list: BoardArrow[] = [];

    if (variation) {
      const bm = liveEval?.bestMove;
      if (bm && bm.length >= 4) {
        list.push({ from: bm.slice(0, 2), to: bm.slice(2, 4), color: '#38BDF8', opacity: 0.82 });
      }
      return list;
    }

    const bestForCurrent = positionEvals[currentPly]?.bestMove ?? liveEval?.bestMove;
    if (bestForCurrent && bestForCurrent.length >= 4) {
      list.push({
        from: bestForCurrent.slice(0, 2),
        to: bestForCurrent.slice(2, 4),
        color: '#4ADE80',
        opacity: 0.78,
      });
    }
    return list;
  }, [currentPly, liveEval, positionEvals, settings.showBestArrow, variation]);

  const moveBadge = useMemo(() => {
    if (variation || !currentNode || !currentNode.to) return null;
    const analysis = moveAnalyses[currentPly];
    if (!analysis) return null;
    return {
      square: currentNode.to,
      classification: analysis.classification,
    };
  }, [currentNode, currentPly, moveAnalyses, variation]);

  const hasErrors = useMemo(() => {
    return Object.values(moveAnalyses).some(
      (a) =>
        a.classification === 'blunder' ||
        a.classification === 'mistake' ||
        a.classification === 'inaccuracy'
    );
  }, [moveAnalyses]);

  const topPlayer = useMemo(() => {
    if (!game) return { name: 'Black', rating: undefined, clock: null as string | null, isWhite: false };
    const isWhiteTop = orientation === 'b';
    // Find latest known clock for that color up to currentPly
    let clock: string | null = null;
    for (let i = currentPly; i >= 1; i--) {
      const p = game.plies[i];
      if (p.color === (isWhiteTop ? 'w' : 'b') && p.clock) {
        clock = p.clock;
        break;
      }
    }
    return isWhiteTop
      ? { name: game.white, rating: game.whiteRating, clock, isWhite: true }
      : { name: game.black, rating: game.blackRating, clock, isWhite: false };
  }, [currentPly, game, orientation]);

  const bottomPlayer = useMemo(() => {
    if (!game) return { name: 'White', rating: undefined, clock: null as string | null, isWhite: true };
    const isWhiteBottom = orientation === 'w';
    let clock: string | null = null;
    for (let i = currentPly; i >= 1; i--) {
      const p = game.plies[i];
      if (p.color === (isWhiteBottom ? 'w' : 'b') && p.clock) {
        clock = p.clock;
        break;
      }
    }
    return isWhiteBottom
      ? { name: game.white, rating: game.whiteRating, clock, isWhite: true }
      : { name: game.black, rating: game.blackRating, clock, isWhite: false };
  }, [currentPly, game, orientation]);

  return (
    <div className="app-shell">
      {/* Top Bar */}
      <header className="app-header">
        <div className="brand">
          <img src="/icon.svg" alt="" className="brand-icon" width={26} height={26} />
          <div className="brand-text">
            <span className="brand-name">{t(locale, 'appName')}</span>
            <span className="brand-sub">{t(locale, 'appTagline')}</span>
          </div>
        </div>

        <div className="header-actions">
          {game && (
            <>
              <button
                type="button"
                className="btn-ghost"
                onClick={handleCopyPgn}
                title={t(locale, 'copyPgn')}
              >
                <Copy size={15} />
                <span className="hide-mobile">{t(locale, 'copyPgn')}</span>
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={handleShare}
                title={t(locale, 'shareAnalysis')}
              >
                <Share2 size={15} />
                <span>{t(locale, 'shareAnalysis')}</span>
              </button>
            </>
          )}
          <button
            type="button"
            className="icon-btn"
            onClick={() => setSettingsOpen(true)}
            aria-label={t(locale, 'settings')}
            title={t(locale, 'settings')}
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* Mobile Primary Switcher */}
      <nav className="mobile-nav" aria-label="View switch">
        <button
          type="button"
          className={`mobile-nav-btn ${mobileView === 'games' ? 'is-active' : ''}`}
          onClick={() => setMobileView('games')}
        >
          <List size={15} />
          <span>{t(locale, 'tabGames')}</span>
        </button>
        <button
          type="button"
          className={`mobile-nav-btn ${mobileView === 'board' ? 'is-active' : ''}`}
          onClick={() => setMobileView('board')}
        >
          <BarChart3 size={15} />
          <span>{t(locale, 'tabReview')}</span>
        </button>
      </nav>

      {/* Main 3-Column Workspace (collapses cleanly on tablet/mobile) */}
      <main className={`workspace mobile-show-${mobileView}`}>
        <aside className="col-sidebar">
          <GameSidebar
            locale={locale}
            usernameInput={usernameInput}
            onUsernameInputChange={setUsernameInput}
            activeUsername={activeUsername}
            recentUsers={settings.recentUsers}
            games={games}
            selectedGameId={game?.id ?? null}
            loadingGames={loadingGames}
            loadingMore={loadingMore}
            hasMoreArchives={archiveIdx < archives.length}
            errorMsg={apiError}
            onSearchUser={(u) => void searchUser(u)}
            onRefresh={() => activeUsername && void searchUser(activeUsername)}
            onLoadMore={() => void loadMoreArchives()}
            onSelectChessComGame={(g) => selectChessComGame(g)}
            onLoadPgn={handleLoadPgn}
            onLoadSample={loadSampleGame}
          />
        </aside>

        <section className="col-board">
          <div className="board-stage">
            <div className="player-bar">
              <div className="player-info">
                <span className={`side-dot ${topPlayer.isWhite ? 'is-white' : 'is-black'}`} />
                <span className="player-name truncate">{topPlayer.name}</span>
                {topPlayer.rating && (
                  <span className="player-rating tabular">({topPlayer.rating})</span>
                )}
              </div>
              {topPlayer.clock && <span className="player-clock tabular">{topPlayer.clock}</span>}
            </div>

            <div className="board-row">
              <EvalBar score={activeScore} orientation={orientation} />
              <div className="board-container">
                <ChessBoard
                  fen={activeFen}
                  orientation={orientation}
                  theme={settings.boardTheme}
                  lastMove={activeLastMove}
                  arrows={boardArrows}
                  moveBadge={moveBadge}
                  onUserMove={handleUserMove}
                />
              </div>
            </div>

            <div className="player-bar">
              <div className="player-info">
                <span className={`side-dot ${bottomPlayer.isWhite ? 'is-white' : 'is-black'}`} />
                <span className="player-name truncate">{bottomPlayer.name}</span>
                {bottomPlayer.rating && (
                  <span className="player-rating tabular">({bottomPlayer.rating})</span>
                )}
              </div>
              {bottomPlayer.clock && (
                <span className="player-clock tabular">{bottomPlayer.clock}</span>
              )}
            </div>

            {/* Playback / Thumb Controls */}
            <div className="board-controls">
              <div className="nav-cluster">
                <button
                  type="button"
                  className="ctrl-btn"
                  onClick={() => goToPly(0)}
                  disabled={!game || (currentPly === 0 && !variation)}
                  aria-label="First move"
                >
                  <ChevronFirst size={19} />
                </button>
                <button
                  type="button"
                  className="ctrl-btn"
                  onClick={() => (variation ? setVariation(null) : goToPly(currentPly - 1))}
                  disabled={!game || (currentPly === 0 && !variation)}
                  aria-label="Previous move"
                >
                  <ChevronLeft size={19} />
                </button>
                <button
                  type="button"
                  className="ctrl-btn"
                  onClick={() => goToPly(currentPly + 1)}
                  disabled={!game || currentPly >= game.plies.length - 1}
                  aria-label="Next move"
                >
                  <ChevronRight size={19} />
                </button>
                <button
                  type="button"
                  className="ctrl-btn"
                  onClick={() => game && goToPly(game.plies.length - 1)}
                  disabled={!game || currentPly >= game.plies.length - 1}
                  aria-label="Last move"
                >
                  <ChevronLast size={19} />
                </button>
              </div>

              <div className="action-cluster">
                {hasErrors && (
                  <button
                    type="button"
                    className="ctrl-btn-text"
                    onClick={jumpToNextError}
                    title={t(locale, 'keyMomentNext')}
                  >
                    <AlertTriangle size={14} />
                    <span>{t(locale, 'keyMomentNext')}</span>
                  </button>
                )}
                <button
                  type="button"
                  className="ctrl-btn"
                  onClick={() => setOrientation((o) => (o === 'w' ? 'b' : 'w'))}
                  title={t(locale, 'flipBoard')}
                  aria-label={t(locale, 'flipBoard')}
                >
                  <ArrowUpDown size={17} />
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="col-review">
          <ReviewPanel
            locale={locale}
            game={game}
            currentPly={currentPly}
            positionEvals={positionEvals}
            moveAnalyses={moveAnalyses}
            summary={summary}
            analyzing={analyzing}
            progress={progress}
            analysisDepth={settings.analysisDepth}
            engineStatus={engineStatus}
            isVariation={Boolean(variation)}
            liveEval={liveEval}
            onStartAnalyze={() => game && void startReviewForGame(game, settings.analysisDepth)}
            onStopAnalyze={stopReview}
            onSelectPly={goToPly}
            onPreviewBestMove={handlePreviewBestMove}
            onPlayEngineMove={handlePlayEngineMove}
            onExitVariation={() => setVariation(null)}
          />
        </section>
      </main>

      <SettingsModal
        open={settingsOpen}
        settings={settings}
        onChange={updateSettings}
        onClose={() => setSettingsOpen(false)}
      />

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
};
