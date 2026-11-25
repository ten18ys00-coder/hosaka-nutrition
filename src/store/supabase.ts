// Supabase 保存先（独立アプリ版）
// テーブル public.nutri_docs（collection, id, data）。RLS でほさか整骨院のアカウントだけが読み書き可。
// 変更はリアルタイムで他の端末に届く。
import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import type { CollectionName } from '../types';
import { COLLECTIONS, type Backend, type BackendStatus, type Docs } from './backend';
import { CLINIC_LOGIN_EMAIL, SUPABASE_ANON_KEY, SUPABASE_URL } from '../config';

let client: SupabaseClient | null = null;
export function supabase(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'hosaka-nutrition-auth' },
    });
  }
  return client;
}

export async function signInWithPasscode(passcode: string): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const { error } = await supabase().auth.signInWithPassword({ email: CLINIC_LOGIN_EMAIL, password: passcode });
    if (!error) return { ok: true };
    const code = (error as { code?: string }).code ?? '';
    const status = error.status ?? 0;
    if (code === 'invalid_credentials' || /invalid login credentials/i.test(error.message)) return { ok: false, message: 'パスコードが違います。' };
    if (status === 429 || code === 'over_request_rate_limit') return { ok: false, message: '試行回数が多すぎます。しばらく待ってからお試しください。' };
    if (status === 0 || status >= 500 || /fetch|network/i.test(error.name + error.message)) return { ok: false, message: 'サーバーに接続できません。通信状態を確認してください。' };
    return { ok: false, message: `ログインできませんでした（${status} ${error.message}）` };
  } catch {
    return { ok: false, message: 'インターネットに接続できません。通信状態を確認してください。' };
  }
}

export async function signOut() {
  await supabase().auth.signOut();
}

type Row = { collection: CollectionName; id: string; data: Record<string, unknown> };

export class SupabaseBackend implements Backend {
  kind = 'cloud' as const;
  private data: Record<string, Docs> = {};
  private channel: RealtimeChannel | null = null;
  private queues = new Map<string, Promise<void>>();
  private onDocs?: (c: CollectionName, docs: Docs, fromCache: boolean) => void;
  private onStatus?: (s: BackendStatus) => void;
  private stopped = false;
  private errored = false;
  private ok() { if (this.errored) { this.errored = false; this.onStatus?.({ kind: 'cloud', state: 'ready' }); } }
  private visHandler = () => { if (document.visibilityState === 'visible') this.reload().catch(() => undefined); };

  start(onDocs: (c: CollectionName, docs: Docs, fromCache: boolean) => void, onStatus: (s: BackendStatus) => void) {
    this.onDocs = onDocs;
    this.onStatus = onStatus;
    for (const c of COLLECTIONS) this.data[c] = {};
    this.reload()
      .then(() => onStatus({ kind: 'cloud', state: 'ready' }))
      .catch(() => onStatus({ kind: 'cloud', state: 'error', message: 'データを読み込めませんでした。通信状態を確認してください。' }));
    this.channel = supabase()
      .channel('nutri-docs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'nutri_docs' }, (p) => {
        if (p.eventType === 'DELETE') {
          const o = p.old as Partial<Row>;
          if (o.collection && o.id) this.apply(o.collection, o.id, null);
        } else {
          const n = p.new as Row;
          if (n.collection && n.id) this.apply(n.collection, n.id, n.data);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') this.reload().catch(() => undefined);
      });
    document.addEventListener('visibilitychange', this.visHandler);
  }

  private apply(c: CollectionName, id: string, doc: Record<string, unknown> | null) {
    const next = { ...(this.data[c] ?? {}) };
    if (doc) next[id] = doc;
    else delete next[id];
    this.data[c] = next;
    this.onDocs?.(c, next, false);
  }

  /** 全件を読み直す（端末がスリープから戻ったとき等） */
  async reload() {
    const all: Record<string, Docs> = Object.fromEntries(COLLECTIONS.map((c) => [c, {}]));
    const page = 1000;
    for (let from = 0; ; from += page) {
      const { data, error } = await supabase().from('nutri_docs').select('collection,id,data').order('collection').order('id').range(from, from + page - 1);
      if (error) throw error;
      for (const r of (data ?? []) as Row[]) (all[r.collection] ??= {})[r.id] = r.data;
      if (!data || data.length < page) break;
    }
    if (this.stopped) return;
    this.data = all;
    for (const c of COLLECTIONS) this.onDocs?.(c, all[c] ?? {}, false);
  }

  private enqueue(key: string, job: () => Promise<void>): Promise<void> {
    const prev = this.queues.get(key) ?? Promise.resolve();
    const next = prev.catch(() => undefined).then(job);
    this.queues.set(key, next);
    return next;
  }

  set(c: CollectionName, id: string, doc: Record<string, unknown>) {
    this.data[c] = { ...(this.data[c] ?? {}), [id]: doc };
    return this.enqueue(`${c}/${id}`, async () => {
      const { error } = await supabase()
        .from('nutri_docs')
        .upsert({ collection: c, id, data: doc, updated_by: String(doc.updated_by ?? '') }, { onConflict: 'collection,id' });
      if (error) {
        this.errored = true;
        this.onStatus?.({ kind: 'cloud', state: 'error', message: `保存できませんでした（${error.message}）。通信状態を確認して、もう一度保存してください。` });
        throw error;
      }
      this.ok();
    });
  }

  remove(c: CollectionName, id: string) {
    const next = { ...(this.data[c] ?? {}) };
    delete next[id];
    this.data[c] = next;
    return this.enqueue(`${c}/${id}`, async () => {
      const { error } = await supabase().from('nutri_docs').delete().eq('collection', c).eq('id', id);
      if (error) {
        this.errored = true;
        this.onStatus?.({ kind: 'cloud', state: 'error', message: `削除できませんでした（${error.message}）` });
        throw error;
      }
      this.ok();
    });
  }

  stop() {
    this.stopped = true;
    document.removeEventListener('visibilitychange', this.visHandler);
    if (this.channel) supabase().removeChannel(this.channel);
    this.channel = null;
  }
}
