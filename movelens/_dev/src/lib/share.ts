export interface SharedPayload {
  user?: string;
  gameId?: string;
  pgn?: string;
}

function toBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(encoded: string): string | null {
  try {
    const padded = encoded.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((encoded.length + 3) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

/**
 * Strip bulky PGN comments (clocks, timestamps) to keep shared URLs compact.
 */
export function compactPgnForShare(pgn: string): string {
  const lines = pgn.split(/\r?\n/);
  const keptHeaders: string[] = [];
  const moveLines: string[] = [];
  const essentialTags = new Set(['Event', 'Date', 'White', 'Black', 'Result', 'WhiteElo', 'BlackElo', 'Opening', 'FEN']);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const match = trimmed.match(/^\[([A-Za-z0-9_]+)\s+"(.*)"\]$/);
    if (match) {
      if (essentialTags.has(match[1])) {
        keptHeaders.push(trimmed);
      }
    } else {
      moveLines.push(trimmed);
    }
  }

  const movesClean = moveLines
    .join(' ')
    .replace(/\{[^}]*\}/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return keptHeaders.length > 0 ? `${keptHeaders.join('\n')}\n\n${movesClean}` : movesClean;
}

export function buildShareUrl(baseUrl: string, payload: SharedPayload): string | null {
  const url = new URL(baseUrl);
  url.search = '';
  url.hash = '';

  if (payload.user) {
    url.searchParams.set('user', payload.user);
    if (payload.gameId) {
      url.searchParams.set('game', payload.gameId);
    }
    return url.toString();
  }

  if (payload.pgn) {
    const compact = compactPgnForShare(payload.pgn);
    const encoded = toBase64Url(compact);
    if (encoded.length > 3500) {
      return null;
    }
    url.hash = `pgn=${encoded}`;
    return url.toString();
  }

  return url.toString();
}

export function parseShareUrl(href: string): SharedPayload {
  try {
    const url = new URL(href);
    const user = url.searchParams.get('user')?.trim() || undefined;
    const gameId = url.searchParams.get('game')?.trim() || undefined;

    let pgn: string | undefined;
    const hash = url.hash.replace(/^#/, '');
    if (hash.startsWith('pgn=')) {
      const decoded = fromBase64Url(hash.slice(4));
      if (decoded) pgn = decoded;
    }

    return { user, gameId, pgn };
  } catch {
    return {};
  }
}
