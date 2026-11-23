import type { ChessComGameItem } from '../types/chess';

const API_BASE = 'https://api.chess.com/pub';

export class ChessComApiError extends Error {
  code: 'NOT_FOUND' | 'NO_ARCHIVES' | 'NETWORK';
  constructor(code: 'NOT_FOUND' | 'NO_ARCHIVES' | 'NETWORK', message: string) {
    super(message);
    this.code = code;
  }
}

interface RawChessComGame {
  url?: string;
  pgn?: string;
  time_control?: string;
  time_class?: string;
  end_time?: number;
  rated?: boolean;
  rules?: string;
  eco?: string;
  white?: { username?: string; rating?: number; result?: string };
  black?: { username?: string; rating?: number; result?: string };
}

function openingFromEcoUrl(ecoUrl?: string): string {
  if (!ecoUrl) return '';
  const slug = ecoUrl.split('/').pop() ?? '';
  return slug
    .replace(/-\d+\..*$/, '')
    .replace(/-/g, ' ')
    .trim();
}

export function normalizeChessComGame(raw: RawChessComGame): ChessComGameItem | null {
  if (!raw.pgn || !raw.url) return null;
  // Standard chess only (chess.js handles standard chess)
  if (raw.rules && raw.rules !== 'chess') return null;

  const idMatch = raw.url.match(/\/(\d+)$/);
  const id = idMatch ? idMatch[1] : raw.url;

  return {
    id,
    url: raw.url,
    pgn: raw.pgn,
    timeControl: raw.time_control ?? '',
    timeClass: raw.time_class ?? 'rapid',
    endTime: raw.end_time ?? 0,
    rated: Boolean(raw.rated),
    white: {
      username: raw.white?.username ?? 'White',
      rating: raw.white?.rating ?? 0,
      result: raw.white?.result ?? '',
    },
    black: {
      username: raw.black?.username ?? 'Black',
      rating: raw.black?.rating ?? 0,
      result: raw.black?.result ?? '',
    },
    opening: openingFromEcoUrl(raw.eco),
  };
}

export async function fetchUserArchives(username: string): Promise<string[]> {
  const clean = encodeURIComponent(username.trim().toLowerCase());
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/player/${clean}/games/archives`, {
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new ChessComApiError('NETWORK', 'Network request failed');
  }

  if (res.status === 404) {
    throw new ChessComApiError('NOT_FOUND', 'User not found');
  }
  if (!res.ok) {
    throw new ChessComApiError('NETWORK', `HTTP ${res.status}`);
  }

  const data = (await res.json()) as { archives?: string[] };
  const archives = Array.isArray(data.archives) ? data.archives : [];
  if (archives.length === 0) {
    throw new ChessComApiError('NO_ARCHIVES', 'No archives available');
  }
  // Return newest first
  return [...archives].reverse();
}

export async function fetchArchiveGames(archiveUrl: string): Promise<ChessComGameItem[]> {
  let res: Response;
  try {
    res = await fetch(archiveUrl, {
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new ChessComApiError('NETWORK', 'Network request failed');
  }

  if (!res.ok) {
    throw new ChessComApiError('NETWORK', `HTTP ${res.status}`);
  }

  const data = (await res.json()) as { games?: RawChessComGame[] };
  const rawGames = Array.isArray(data.games) ? data.games : [];

  const games: ChessComGameItem[] = [];
  for (const raw of rawGames) {
    const normalized = normalizeChessComGame(raw);
    if (normalized) games.push(normalized);
  }
  // Newest first
  games.sort((a, b) => b.endTime - a.endTime);
  return games;
}

export function getPlayerOutcome(
  game: ChessComGameItem,
  username: string
): 'win' | 'loss' | 'draw' {
  const lower = username.trim().toLowerCase();
  const isWhite = game.white.username.toLowerCase() === lower;
  const sideResult = isWhite ? game.white.result : game.black.result;
  if (sideResult === 'win') return 'win';
  if (
    ['agreed', 'repetition', 'stalemate', 'insufficient', '50move', 'timevsinsufficient'].includes(
      sideResult
    )
  ) {
    return 'draw';
  }
  return 'loss';
}

export function formatRelativeDate(epochSec: number, locale: 'ko' | 'en'): string {
  if (!epochSec) return '';
  const diffSec = Math.max(0, Math.floor(Date.now() / 1000) - epochSec);
  if (diffSec < 60) return locale === 'ko' ? '방금 전' : 'just now';
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return locale === 'ko' ? `${mins}분 전` : `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return locale === 'ko' ? `${hours}시간 전` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return locale === 'ko' ? `${days}일 전` : `${days}d ago`;
  const d = new Date(epochSec * 1000);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}.${mm}.${dd}`;
}
