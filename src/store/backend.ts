// 保存先（バックエンド）の抽象化
// ・CloudBackend：claude.ai のアーティファクト用データベース（院内の端末間で共有・永続化）
// ・LocalBackend：この端末のブラウザ（localStorage）。クラウドが使えない場合の予備
// 将来 Supabase に移行する場合は、同じインターフェースで SupabaseBackend を追加し、
// コレクション名＝テーブル名、ドキュメント＝行として置き換えます。
import type { CollectionName } from '../types';

export const COLLECTIONS: CollectionName[] = [
  'patients', 'questionnaires', 'plans', 'meal_days', 'foods', 'materials', 'distributions', 'guidance_docs', 'progress', 'products', 'settings', 'audit_logs',
];

export type Docs = Record<string, Record<string, unknown>>;
export type BackendStatus = { kind: 'cloud' | 'local'; state: 'loading' | 'ready' | 'error' | 'readonly'; message?: string };

export interface Backend {
  kind: 'cloud' | 'local';
  start(onDocs: (c: CollectionName, docs: Docs, fromCache: boolean) => void, onStatus: (s: BackendStatus) => void): void;
  set(c: CollectionName, id: string, doc: Record<string, unknown>): Promise<void>;
  remove(c: CollectionName, id: string): Promise<void>;
  stop(): void;
}

const LS_PREFIX = 'hosaka-nutrition:v1:';

function lsGet(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
function lsSet(key: string, v: string) {
  try { window.localStorage.setItem(key, v); } catch { /* 保存できない環境 */ }
}

export class LocalBackend implements Backend {
  kind = 'local' as const;
  private data: Record<string, Docs> = {};
  private onDocs?: (c: CollectionName, docs: Docs, fromCache: boolean) => void;

  start(onDocs: (c: CollectionName, docs: Docs, fromCache: boolean) => void, onStatus: (s: BackendStatus) => void) {
    this.onDocs = onDocs;
    let ok = true;
    try { window.localStorage.getItem('x'); } catch { ok = false; }
    for (const c of COLLECTIONS) {
      let docs: Docs = {};
      const raw = lsGet(LS_PREFIX + c);
      if (raw) { try { docs = JSON.parse(raw); } catch { docs = {}; } }
      this.data[c] = docs;
      onDocs(c, docs, false);
    }
    onStatus({ kind: 'local', state: 'ready', message: ok ? undefined : 'この環境ではブラウザに保存できません（ページを閉じると消えます）' });
  }
  async set(c: CollectionName, id: string, doc: Record<string, unknown>) {
    this.data[c] = { ...(this.data[c] ?? {}), [id]: doc };
    lsSet(LS_PREFIX + c, JSON.stringify(this.data[c]));
    this.onDocs?.(c, this.data[c], false);
  }
  async remove(c: CollectionName, id: string) {
    const next = { ...(this.data[c] ?? {}) };
    delete next[id];
    this.data[c] = next;
    lsSet(LS_PREFIX + c, JSON.stringify(next));
    this.onDocs?.(c, next, false);
  }
  stop() {}
}

// ── claude.ai アーティファクトDB ──
type DbError = { code: string; message: string };
type Snap = { docs: { id: string; data(): Record<string, unknown> | undefined }[]; metadata: { fromCache: boolean } };
type DbApi = {
  collection(path: string): {
    doc(id: string): { set(d: Record<string, unknown>): Promise<void>; delete(): Promise<void> };
    onSnapshot(next: (s: Snap) => void, err?: (e: DbError) => void): () => void;
  };
};

export class CloudBackend implements Backend {
  kind = 'cloud' as const;
  private unsubs: (() => void)[] = [];
  private queues = new Map<string, Promise<void>>();
  constructor(private db: DbApi) {}

  start(onDocs: (c: CollectionName, docs: Docs, fromCache: boolean) => void, onStatus: (s: BackendStatus) => void) {
    let confirmed = 0;
    const timer = window.setTimeout(() => {
      if (confirmed < COLLECTIONS.length) onStatus({ kind: 'cloud', state: 'error', message: 'クラウドのデータにまだ接続できません。表示が最新でない可能性があります。' });
    }, 10000);
    const seen = new Set<string>();
    for (const c of COLLECTIONS) {
      const unsub = this.db.collection(c).onSnapshot(
        (snap) => {
          const docs: Docs = {};
          for (const d of snap.docs) { const v = d.data(); if (v) docs[d.id] = v; }
          onDocs(c, docs, snap.metadata.fromCache);
          if (!snap.metadata.fromCache && !seen.has(c)) {
            seen.add(c);
            confirmed += 1;
            if (confirmed === COLLECTIONS.length) { window.clearTimeout(timer); onStatus({ kind: 'cloud', state: 'ready' }); }
          }
        },
        (e) => {
          window.clearTimeout(timer);
          onStatus({ kind: 'cloud', state: e.code === 'revoked' ? 'readonly' : 'error', message: `クラウド保存でエラーが発生しました（${e.code}）` });
        },
      );
      this.unsubs.push(unsub);
    }
  }

  private enqueue(key: string, job: () => Promise<void>): Promise<void> {
    const prev = this.queues.get(key) ?? Promise.resolve();
    const next = prev.catch(() => undefined).then(job);
    this.queues.set(key, next);
    return next;
  }

  set(c: CollectionName, id: string, doc: Record<string, unknown>) {
    return this.enqueue(`${c}/${id}`, async () => {
      try { await this.db.collection(c).doc(id).set(doc); }
      catch (e) {
        const err = e as DbError;
        if (err?.code === 'unavailable') {
          await new Promise((r) => setTimeout(r, 400 + Math.random() * 600));
          await this.db.collection(c).doc(id).set(doc);
        } else throw e;
      }
    });
  }
  remove(c: CollectionName, id: string) {
    return this.enqueue(`${c}/${id}`, () => this.db.collection(c).doc(id).delete());
  }
  stop() { this.unsubs.forEach((u) => u()); this.unsubs = []; }
}

type ClaudeWindow = Window & { claude?: { use(name: string): Promise<unknown> } };

/** claude.ai 上ならクラウドDB、それ以外はブラウザ保存 */
async function waitForClaude(ms = 2000): Promise<ClaudeWindow['claude'] | undefined> {
  const w = window as ClaudeWindow;
  const start = Date.now();
  while (!w.claude && Date.now() - start < ms) await new Promise((r) => setTimeout(r, 100));
  return w.claude;
}

export async function resolveBackend(): Promise<Backend> {
  const w = window as ClaudeWindow;
  await waitForClaude();
  if (!w.claude || typeof w.claude.use !== 'function') return new LocalBackend();
  try {
    const db = (await Promise.race([
      w.claude.use('db'),
      new Promise((r) => setTimeout(() => r(null), 11000)),
    ])) as DbApi | null;
    if (db && typeof db.collection === 'function') return new CloudBackend(db);
  } catch { /* fallthrough */ }
  return new LocalBackend();
}

export async function resolveDownloads(): Promise<null | { save(r: { filename: string; data: string | Blob }): Promise<{ status: string }> }> {
  const w = window as ClaudeWindow;
  if (!w.claude || typeof w.claude.use !== 'function') return null;
  try {
    const d = (await w.claude.use('downloads')) as { save(r: { filename: string; data: string | Blob }): Promise<{ status: string }> } | null;
    return d ?? null;
  } catch { return null; }
}

export function lsGetJSON<T>(key: string, fallback: T): T {
  const raw = lsGet(LS_PREFIX + key);
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}
export function lsSetJSON(key: string, v: unknown) {
  lsSet(LS_PREFIX + key, JSON.stringify(v));
}
