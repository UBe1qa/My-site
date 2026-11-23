import type { EngineLine, EngineScore, PlyNode, PositionEval } from '../types/chess';
import { classifyMove, normalizeScoreToWhite, uciListToSan, uciToSan } from './eval';
import type { MoveAnalysis } from '../types/chess';

export interface ParsedInfoLine {
  depth: number;
  multipv: number;
  score: EngineScore;
  pv: string[];
  isBound: boolean;
}

/**
 * Pure parser for UCI `info` lines.
 */
export function parseUciInfoLine(line: string, sideToMove: 'w' | 'b'): ParsedInfoLine | null {
  if (!line.startsWith('info ')) return null;
  const depthMatch = line.match(/\bdepth\s+(\d+)/);
  const scoreMatch = line.match(/\bscore\s+(cp|mate)\s+(-?\d+)/);
  const pvMatch = line.match(/\bpv\s+(.+)$/);
  if (!depthMatch || !scoreMatch) return null;

  const depth = parseInt(depthMatch[1], 10);
  const multipvMatch = line.match(/\bmultipv\s+(\d+)/);
  const multipv = multipvMatch ? parseInt(multipvMatch[1], 10) : 1;

  const scoreType = scoreMatch[1];
  const scoreVal = parseInt(scoreMatch[2], 10);
  const rawScore: EngineScore =
    scoreType === 'cp'
      ? { cp: scoreVal, mate: null }
      : { cp: null, mate: scoreVal };

  const normalized = normalizeScoreToWhite(rawScore, sideToMove);
  const pv = pvMatch ? pvMatch[1].trim().split(/\s+/).filter(Boolean) : [];
  const isBound = /\b(upperbound|lowerbound)\b/.test(line);

  return {
    depth,
    multipv,
    score: normalized,
    pv,
    isBound,
  };
}

export function sideToMoveFromFen(fen: string): 'w' | 'b' {
  const parts = fen.split(' ');
  return parts[1] === 'b' ? 'b' : 'w';
}

export class StockfishEngine {
  private worker: Worker | null = null;
  private ready = false;
  private initPromise: Promise<void> | null = null;
  private currentListener: ((line: string) => void) | null = null;
  private runningSearch = false;

  async init(): Promise<void> {
    if (this.ready && this.worker) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise<void>((resolve, reject) => {
      try {
        const worker = new Worker('/stockfish/stockfish-19-lite-single.js');
        this.worker = worker;

        const timeout = setTimeout(() => {
          reject(new Error('Stockfish init timed out'));
        }, 15000);

        let gotUciOk = false;

        worker.onmessage = (event: MessageEvent) => {
          const text = typeof event.data === 'string' ? event.data : String(event.data ?? '');
          const lines = text.split(/\r?\n/);
          for (const line of lines) {
            if (!line) continue;
            if (!this.ready) {
              if (line === 'uciok' && !gotUciOk) {
                gotUciOk = true;
                worker.postMessage('setoption name Hash value 32');
                worker.postMessage('isready');
              } else if (line === 'readyok') {
                clearTimeout(timeout);
                this.ready = true;
                resolve();
              }
            }
            if (this.currentListener) {
              this.currentListener(line);
            }
          }
        };

        worker.onerror = (err) => {
          clearTimeout(timeout);
          this.ready = false;
          this.initPromise = null;
          reject(err);
        };

        worker.postMessage('uci');
      } catch (err) {
        this.initPromise = null;
        reject(err);
      }
    });

    return this.initPromise;
  }

  private send(cmd: string): void {
    this.worker?.postMessage(cmd);
  }

  stop(): void {
    if (this.worker && this.runningSearch) {
      this.send('stop');
    }
  }

  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.ready = false;
    this.initPromise = null;
    this.currentListener = null;
    this.runningSearch = false;
  }

  private waitForReady(): Promise<void> {
    return new Promise<void>((resolve) => {
      if (!this.worker) {
        resolve();
        return;
      }
      const prev = this.currentListener;
      this.currentListener = (line: string) => {
        if (line === 'readyok') {
          this.currentListener = prev;
          resolve();
        }
      };
      this.send('isready');
    });
  }

  /**
   * Evaluate a single FEN position up to target depth (with optional MultiPV).
   */
  async evaluateFen(options: {
    fen: string;
    depth: number;
    multiPv?: number;
    signal?: AbortSignal;
    onUpdate?: (evalData: PositionEval) => void;
  }): Promise<PositionEval> {
    await this.init();
    if (!this.worker) throw new Error('Engine not initialized');

    const { fen, depth, multiPv = 1, signal, onUpdate } = options;
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    if (this.runningSearch) {
      this.send('stop');
      await this.waitForReady();
    }

    const side = sideToMoveFromFen(fen);
    const linesByMultiPv = new Map<number, EngineLine>();
    let bestScore: EngineScore = { cp: 0, mate: null };
    let bestDepth = 0;
    let bestPv: string[] = [];

    return new Promise<PositionEval>((resolve, reject) => {
      let settled = false;

      const buildResult = (bestMoveFromEnd?: string | null): PositionEval => {
        const sortedLines = [...linesByMultiPv.values()].sort((a, b) => a.multipv - b.multipv);
        const topLine = sortedLines[0];
        const finalBestMove =
          bestMoveFromEnd && bestMoveFromEnd !== '(none)'
            ? bestMoveFromEnd
            : topLine?.pv[0] ?? bestPv[0] ?? null;
        const finalPv = topLine?.pv ?? bestPv;
        const finalScore = topLine?.score ?? bestScore;
        const finalDepth = topLine?.depth ?? bestDepth;

        return {
          depth: finalDepth,
          score: finalScore,
          bestMove: finalBestMove,
          bestMoveSan: uciToSan(fen, finalBestMove),
          pv: finalPv,
          pvSan: uciListToSan(fen, finalPv, 6),
          lines: sortedLines,
        };
      };

      const cleanup = () => {
        this.runningSearch = false;
        this.currentListener = null;
        signal?.removeEventListener('abort', onAbort);
      };

      const onAbort = () => {
        if (settled) return;
        settled = true;
        this.send('stop');
        cleanup();
        reject(new DOMException('Aborted', 'AbortError'));
      };

      signal?.addEventListener('abort', onAbort, { once: true });

      this.runningSearch = true;
      this.currentListener = (line: string) => {
        if (settled) return;

        if (line.startsWith('info ')) {
          const parsed = parseUciInfoLine(line, side);
          if (!parsed) return;
          if (parsed.isBound && linesByMultiPv.has(parsed.multipv)) return;

          const entry: EngineLine = {
            multipv: parsed.multipv,
            depth: parsed.depth,
            score: parsed.score,
            pv: parsed.pv,
            pvSan: uciListToSan(fen, parsed.pv, 6),
          };
          linesByMultiPv.set(parsed.multipv, entry);

          if (parsed.multipv === 1) {
            bestScore = parsed.score;
            bestDepth = parsed.depth;
            bestPv = parsed.pv;
          }

          if (onUpdate && parsed.depth >= 4) {
            onUpdate(buildResult());
          }
        } else if (line.startsWith('bestmove ')) {
          settled = true;
          const parts = line.split(/\s+/);
          const bm = parts[1] ?? null;
          cleanup();
          resolve(buildResult(bm));
        }
      };

      this.send(`setoption name MultiPV value ${multiPv}`);
      this.send(`position fen ${fen}`);
      this.send(`go depth ${depth}`);
    });
  }

  /**
   * Sequentially analyze all plies of a game and emit each MoveAnalysis as soon as ready.
   */
  async analyzeGame(options: {
    plies: PlyNode[];
    depth: number;
    signal?: AbortSignal;
    onPositionEval?: (ply: number, posEval: PositionEval) => void;
    onMoveAnalyzed?: (analysis: MoveAnalysis) => void;
    onProgress?: (current: number, total: number) => void;
  }): Promise<{
    positionEvals: Record<number, PositionEval>;
    moveAnalyses: Record<number, MoveAnalysis>;
  }> {
    const { plies, depth, signal, onPositionEval, onMoveAnalyzed, onProgress } = options;
    await this.init();
    this.send('ucinewgame');
    await this.waitForReady();

    const positionEvals: Record<number, PositionEval> = {};
    const moveAnalyses: Record<number, MoveAnalysis> = {};
    const total = Math.max(0, plies.length - 1);

    for (let i = 0; i < plies.length; i++) {
      if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }

      const node = plies[i];
      let posEval: PositionEval;

      if (node.isCheckmate) {
        // Side that just moved delivered checkmate
        const mateScore: EngineScore = {
          cp: null,
          mate: node.color === 'w' ? 1 : -1,
        };
        posEval = {
          depth,
          score: mateScore,
          bestMove: null,
          bestMoveSan: null,
          pv: [],
          pvSan: [],
          lines: [],
        };
      } else if (node.isDraw) {
        posEval = {
          depth,
          score: { cp: 0, mate: null },
          bestMove: null,
          bestMoveSan: null,
          pv: [],
          pvSan: [],
          lines: [],
        };
      } else {
        // Use slightly lighter depth for ply 0 (opening start) to start fast
        const effectiveDepth = i === 0 ? Math.min(depth, 10) : depth;
        posEval = await this.evaluateFen({
          fen: node.fen,
          depth: effectiveDepth,
          multiPv: 1,
          signal,
        });
      }

      positionEvals[node.ply] = posEval;
      onPositionEval?.(node.ply, posEval);

      if (i > 0 && node.uci && node.color) {
        const evalBefore = positionEvals[i - 1];
        const analysis = classifyMove({
          ply: node.ply,
          moverColor: node.color,
          playedUci: node.uci,
          evalBefore,
          evalAfter: posEval,
          isCheckmateAfter: node.isCheckmate,
        });
        moveAnalyses[node.ply] = analysis;
        onMoveAnalyzed?.(analysis);
        onProgress?.(i, total);
      }
    }

    return { positionEvals, moveAnalyses };
  }
}
